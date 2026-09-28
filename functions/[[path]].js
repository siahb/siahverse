const COOKIE_NAME = "sv_nursing_session";
const DEVICE_COOKIE_NAME = "sv_nursing_device";
const DEVICE_TTL_SECONDS = 60 * 60 * 24 * 365;
const PBKDF2_ITERATIONS = 100000;
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILURES = 7;
const failures = new Map();

const enc = new TextEncoder();

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}

function b64url(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}

function b64urlToBytes(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const raw = atob(padded);
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

async function sha256(value) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(value)));
}

async function derive(password, salt) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name:"PBKDF2", hash:"SHA-256", salt:b64urlToBytes(salt), iterations:PBKDF2_ITERATIONS },
    key,
    256
  );
  return new Uint8Array(bits);
}

function timingSafeEqual(a,b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i=0;i<a.length;i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function randomToken(bytes=32) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return b64url(arr);
}

async function getDeviceIdentity(request) {
  const cookies=parseCookies(request);
  let token=cookies[DEVICE_COOKIE_NAME] || "";
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) token=randomToken(24);
  const hash=b64url(await sha256(token));
  return { token, hash };
}

function parseCookies(request) {
  const out = {};
  for (const part of (request.headers.get("Cookie") || "").split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const k = part.slice(0,idx).trim();
    const v = part.slice(idx+1).trim();
    try { out[k] = decodeURIComponent(v); } catch { out[k] = v; }
  }
  return out;
}

function clientKey(request) {
  return request.headers.get("CF-Ray") || request.headers.get("CF-Connecting-IP") || "unknown";
}

function rateLimited(request) {
  const key=clientKey(request), now=Date.now(), item=failures.get(key);
  if (!item || now-item.started>RATE_WINDOW_MS) {
    failures.set(key,{started:now,count:0});
    return false;
  }
  return item.count>=MAX_FAILURES;
}

function noteFailure(request) {
  const key=clientKey(request), now=Date.now(), item=failures.get(key);
  if (!item || now-item.started>RATE_WINDOW_MS) failures.set(key,{started:now,count:1});
  else item.count++;
}

function clearFailures(request) { failures.delete(clientKey(request)); }

function safeNext(value) {
  if (typeof value !== "string") return "/nursing/";
  if (value.startsWith("/nursing") || value.startsWith("/pharm1") || value.startsWith("/admin")) return value;
  return "/nursing/";
}

async function verifyPassword(db,password) {
  if (typeof password !== "string" || !/^InSiahWeTrust!\d{5}$/.test(password)) return null;
  const { results=[] } = await db.prepare(
    "SELECT id,name,salt,password_hash,is_admin FROM credentials WHERE enabled=1 ORDER BY id"
  ).all();
  for (const c of results) {
    const actual = await derive(password,c.salt);
    const expected = b64urlToBytes(c.password_hash);
    if (timingSafeEqual(actual,expected)) return c;
  }
  return null;
}

async function createSession(db,credentialId) {
  const token=randomToken(32);
  const tokenHash=b64url(await sha256(token));

  // One active login per credential: a new login immediately revokes
  // every previous session for that credential.
  await db.batch([
    db.prepare(
      "UPDATE sessions SET revoked=1 WHERE credential_id=? AND revoked=0"
    ).bind(credentialId),
    db.prepare(
      "INSERT INTO sessions (token_hash,credential_id,expires_at) VALUES (?,?,datetime('now','+7 days'))"
    ).bind(tokenHash,credentialId)
  ]);

  return token;
}

async function getSession(db,request) {
  const token=parseCookies(request)[COOKIE_NAME];
  if (!token) return null;
  const tokenHash=b64url(await sha256(token));
  const row=await db.prepare(
    `SELECT s.token_hash,s.credential_id,s.expires_at,c.name,c.enabled,c.is_admin
     FROM sessions s JOIN credentials c ON c.id=s.credential_id
     WHERE s.token_hash=? AND s.revoked=0 AND c.enabled=1 AND s.expires_at > CURRENT_TIMESTAMP`
  ).bind(tokenHash).first();
  if (!row) return null;
  await db.prepare("UPDATE sessions SET last_seen_at=CURRENT_TIMESTAMP WHERE token_hash=?").bind(tokenHash).run();
  return {...row,tokenHash};
}

async function revokeCurrentSession(db,request) {
  const token=parseCookies(request)[COOKIE_NAME];
  if (!token) return;
  const tokenHash=b64url(await sha256(token));
  await db.prepare("UPDATE sessions SET revoked=1 WHERE token_hash=?").bind(tokenHash).run();
}

async function logEvent(db,credentialId,event,path=null) {
  await db.prepare(
    "INSERT INTO access_log (credential_id,event,path) VALUES (?,?,?)"
  ).bind(credentialId || null,event,path).run();
}

async function ensureAccessRequests(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS access_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requested_name TEXT NOT NULL,
      credential_id TEXT REFERENCES credentials(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','denied')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      resolved_at TEXT,
      resolved_by TEXT REFERENCES credentials(id) ON DELETE SET NULL
    )
  `).run();
  await db.prepare(
    "CREATE INDEX IF NOT EXISTS idx_access_requests_status_created ON access_requests(status,created_at)"
  ).run();
}

function cleanName(value) {
  return String(value || "").trim().replace(/\s+/g," ").slice(0,100);
}

async function handleAccessRequest(context) {
  const {request,env}=context;
  await ensureAccessRequests(env.DB);

  let form;
  try { form=await request.formData(); }
  catch { return loginPage("/nursing/","Unable to read the request form.",400); }

  const name=cleanName(form.get("name"));
  if (name.length < 2) return loginPage("/nursing/","Enter your full name to request access.",400);

  const credential=await env.DB.prepare(
    "SELECT id,name FROM credentials WHERE lower(trim(name))=lower(?) LIMIT 1"
  ).bind(name).first();

  if (!credential) {
    return loginPage("/nursing/","Name not found. Check the spelling of your full name.",400);
  }

  const pending=await env.DB.prepare(
    "SELECT id FROM access_requests WHERE credential_id=? AND status='pending' LIMIT 1"
  ).bind(credential.id).first();

  if (!pending) {
    await env.DB.prepare(
      "INSERT INTO access_requests (requested_name,credential_id) VALUES (?,?)"
    ).bind(credential.name,credential.id).run();
  }

  return htmlResponse(`<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Access request sent</title>
<style>
:root{color-scheme:dark;--bg:#080b12;--p:#111827;--p2:#172033;--t:#f4f7ff;--m:#aeb8cf;--a:#7c9cff;--a2:#9a7cff;--b:#2c3955}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:20px;font-family:Inter,system-ui,-apple-system,sans-serif;background:radial-gradient(circle at top,#151f3a,#080b12 48%);color:var(--t)}
.card{width:min(430px,100%);padding:28px;border:1px solid var(--b);border-radius:22px;background:linear-gradient(180deg,var(--p2),var(--p));box-shadow:0 24px 80px rgba(0,0,0,.45)}
.logo{width:54px;height:54px;display:grid;place-items:center;border-radius:17px;background:linear-gradient(135deg,var(--a),var(--a2));font-size:24px;font-weight:950}.home-logo{display:inline-block;text-decoration:none;color:inherit;margin-bottom:18px}h1{margin:0 0 10px}.sub{color:var(--m);line-height:1.55}.btn{display:block;text-align:center;text-decoration:none;margin-top:22px;padding:13px;border-radius:12px;background:linear-gradient(135deg,var(--a),var(--a2));color:#fff;font-weight:850}
</style></head><body><main class="card"><a class="home-logo" href="/" aria-label="Siahverse home"><div class="logo">S</div></a><h1>Request sent</h1>
<p class="sub">Your access request was submitted. Check with Josiah for approval and your password.</p>
<a class="btn" href="/nursing/">Back to sign in</a></main></body></html>`);
}

function htmlResponse(html,status=200,extra={}) {
  return new Response(html,{status,headers:{
    "Content-Type":"text/html; charset=UTF-8",
    "Cache-Control":"no-store, private",
    "X-Robots-Tag":"noindex, nofollow",
    ...extra
  }});
}

function loginPage(next="/nursing/",error="",status=200) {
  const safe=safeNext(next);
  return htmlResponse(`<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Siahverse Nursing Access</title>
<style>
:root{color-scheme:dark;--bg:#080b12;--p:#111827;--p2:#172033;--t:#f4f7ff;--m:#aeb8cf;--a:#7c9cff;--a2:#9a7cff;--b:#2c3955;--bad:#ff9aa4}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:20px;font-family:Inter,system-ui,-apple-system,sans-serif;background:radial-gradient(circle at 20% 0%,rgba(124,156,255,.14),transparent 32rem),radial-gradient(circle at 90% 20%,rgba(154,124,255,.11),transparent 28rem),var(--bg);color:var(--t)}
.card{width:min(430px,100%);padding:28px;border:1px solid var(--b);border-radius:22px;background:linear-gradient(180deg,var(--p2),var(--p));box-shadow:0 24px 80px rgba(0,0,0,.45)}
.home-brand{display:inline-flex;align-items:center;gap:11px;color:inherit;text-decoration:none;margin-bottom:18px}.logo{width:54px;height:54px;display:grid;place-items:center;border-radius:17px;background:linear-gradient(135deg,var(--a),var(--a2));font-size:24px;font-weight:950}.k{font-size:12px;font-weight:900;letter-spacing:.11em;text-transform:uppercase;color:#b8c5e5}.back-home{display:inline-flex;margin-bottom:16px;color:#cfd8ef;text-decoration:none;font-size:13px;font-weight:850}h1{font-size:32px;line-height:1.05;margin:6px 0 8px}.sub{color:var(--m);line-height:1.55;margin:0 0 22px}
label{display:block;font-size:13px;font-weight:850;color:#c9d3ea;margin-bottom:7px}.row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}
input{width:100%;min-height:50px;border:1px solid var(--b);border-radius:12px;background:#0d1422;color:#fff;padding:11px 12px;font:inherit;outline:none}input:focus{border-color:var(--a);box-shadow:0 0 0 3px rgba(124,156,255,.16)}
button{font:inherit;font-weight:850;cursor:pointer}.show{min-width:66px;border:1px solid var(--b);border-radius:12px;background:var(--p2);color:var(--t);padding:0 12px}.unlock{width:100%;min-height:50px;border:0;border-radius:12px;background:linear-gradient(135deg,var(--a),var(--a2));color:#fff;margin-top:8px}
.error{min-height:27px;padding-top:7px;color:var(--bad);font-size:13px;font-weight:800}.note{margin:16px 0 0;color:var(--m);font-size:12px;line-height:1.5}.request{margin-top:20px;padding-top:18px;border-top:1px solid var(--b)}.request summary{cursor:pointer;font-weight:850;color:#cfd8ef}.request form{margin-top:14px}.request input{margin-bottom:8px}.request button{width:100%;min-height:46px;border:1px solid var(--b);border-radius:12px;background:var(--p2);color:var(--t)}
</style></head><body><main class="card">
<a class="back-home" href="/">← Back</a><br><a class="home-brand" href="/" aria-label="Siahverse home"><div class="logo">S</div><div class="k">Siahverse</div></a><h1>Nursing Resources</h1>
<p class="sub">Enter the access password to continue.</p>
<form method="post" action="/api/nursing-login">
<input type="hidden" name="next" value="${esc(safe)}">
<label for="password">Access password</label><div class="row">
<input id="password" name="password" type="password" autocomplete="current-password" autofocus required>
<button class="show" type="button" id="show">Show</button></div>
<div class="error" role="status">${esc(error)}</div><button class="unlock" type="submit">Unlock</button>
</form><p class="note">Do not share your password.</p>
<details class="request"><summary>Need access?</summary>
<form method="post" action="/api/access-request">
<label for="request-name">Full name</label>
<input id="request-name" name="name" type="text" autocomplete="name" maxlength="100" required>
<button type="submit">Request access</button>
</form></details></main>
<script>const p=document.getElementById("password"),s=document.getElementById("show");s.addEventListener("click",()=>{const v=p.type==="text";p.type=v?"password":"text";s.textContent=v?"Show":"Hide";p.focus()});</script>
</body></html>`,status);
}

function forbiddenPage() {
  return htmlResponse(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Admin access required</title>
<style>body{font-family:system-ui;background:#080b12;color:#f4f7ff;display:grid;place-items:center;min-height:100vh;margin:0}.c{max-width:500px;padding:28px;border:1px solid #2c3955;border-radius:20px;background:#111827}.brand{display:inline-flex;align-items:center;gap:10px;color:#f4f7ff;text-decoration:none;font-weight:900}.logo{width:42px;height:42px;display:grid;place-items:center;border-radius:13px;background:linear-gradient(135deg,#7c9cff,#9a7cff)}a{color:#9eb4ff}.links{display:flex;gap:12px;flex-wrap:wrap;margin-top:18px}</style></head>
<body><div class="c"><a class="brand" href="/" aria-label="Siahverse home"><span class="logo">S</span><span>Siahverse</span></a><h1>Admin access required</h1><p>This Siahverse page is limited to an administrator account.</p><div class="links"><a href="/">← Back</a><a href="/nursing/">Nursing Resources</a></div></div></body></html>`,403);
}

async function handleLogin(context) {
  const {request,env}=context;
  if (!env.DB) return htmlResponse("<h1>Siahverse configuration error</h1><p>The DB binding is missing.</p>",500);
  if (rateLimited(request)) return loginPage("/nursing/","Too many incorrect attempts. Try again in a few minutes.",429);
  let form;
  try { form=await request.formData(); } catch { return loginPage("/nursing/","Unable to read the login form.",400); }
  const password=String(form.get("password")||"");
  const next=safeNext(String(form.get("next")||"/nursing/"));
  const credential=await verifyPassword(env.DB,password);
  if (!credential) {
    noteFailure(request);
    await logEvent(env.DB,null,"login_failed",null);
    return loginPage(next,"Incorrect or inactive access password.",401);
  }
  clearFailures(request);
  const device=await getDeviceIdentity(request);
  const token=await createSession(env.DB,credential.id);
  await logEvent(env.DB,credential.id,"login_success","device:"+device.hash);

  const headers=new Headers({
    "Location":next,
    "Cache-Control":"no-store"
  });
  headers.append("Set-Cookie",`${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`);
  headers.append("Set-Cookie",`${DEVICE_COOKIE_NAME}=${encodeURIComponent(device.token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${DEVICE_TTL_SECONDS}`);
  return new Response(null,{status:303,headers});
}

async function handleLogout(context) {
  await revokeCurrentSession(context.env.DB,context.request);
  return new Response(null,{status:303,headers:{
    "Location":"/nursing/",
    "Set-Cookie":`${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
    "Cache-Control":"no-store"
  }});
}

async function adminRows(db) {
  const {results=[]}=await db.prepare(`
    SELECT c.id,c.name,c.enabled,c.is_admin,
      (SELECT COUNT(*) FROM access_log a WHERE a.credential_id=c.id AND a.event='login_success') AS login_count,
      (SELECT MAX(created_at) FROM access_log a WHERE a.credential_id=c.id AND a.event='login_success') AS last_login,
      (SELECT path FROM access_log a WHERE a.credential_id=c.id AND a.event='login_success' AND a.path LIKE 'device:%' ORDER BY a.id DESC LIMIT 1) AS last_device,
      (SELECT path FROM access_log a WHERE a.credential_id=c.id AND a.event='login_success' AND a.path LIKE 'device:%' ORDER BY a.id DESC LIMIT 1 OFFSET 1) AS previous_device,
      (SELECT COUNT(*) FROM sessions s WHERE s.credential_id=c.id AND s.revoked=0 AND s.expires_at>CURRENT_TIMESTAMP) AS active_sessions
    FROM credentials c ORDER BY c.id
  `).all();
  return results;
}

async function pendingAccessRequests(db) {
  await ensureAccessRequests(db);
  const {results=[]}=await db.prepare(`
    SELECT r.id,r.requested_name,r.credential_id,r.created_at,c.name,c.enabled
    FROM access_requests r
    LEFT JOIN credentials c ON c.id=r.credential_id
    WHERE r.status='pending'
    ORDER BY r.created_at ASC,r.id ASC
  `).all();
  return results;
}

function fmtTime(v) {
  if (!v) return "Never";
  const d=new Date(v.endsWith("Z")?v:v.replace(" ","T")+"Z");
  return isNaN(d)?String(v):d.toLocaleString("en-US",{timeZone:"America/Los_Angeles",month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"});
}

async function adminPage(context,session,notice="",newCode="") {
  const rows=await adminRows(context.env.DB);
  const requests=await pendingAccessRequests(context.env.DB);
  const enabled=rows.filter(r=>Number(r.enabled)===1).length;
  const logins=rows.reduce((n,r)=>n+Number(r.login_count||0),0);
  const cards=rows.map(r=>{
    const currentDevice=String(r.last_device||"");
    const previousDevice=String(r.previous_device||"");
    let deviceText="Not tracked yet";
    let deviceClass="neutral";
    if (currentDevice) {
      if (!previousDevice) deviceText="First tracked login";
      else if (currentDevice===previousDevice) deviceText="Same browser";
      else { deviceText="Changed"; deviceClass="changed"; }
    }
    return `
<tr>
<td><strong>${esc(r.name)}</strong><div class="muted tiny">${esc(r.id)}${r.is_admin?" • Admin":""}</div></td>
<td><span class="status ${r.enabled?"on":"off"}">${r.enabled?"Enabled":"Disabled"}</span></td>
<td>${Number(r.login_count||0)}</td>
<td>${esc(fmtTime(r.last_login))}</td>
<td>${Number(r.active_sessions||0)}</td>
<td><span class="device ${deviceClass}">${esc(deviceText)}</span></td>
<td><div class="acts">
<form method="post" action="/admin/action"><input type="hidden" name="id" value="${esc(r.id)}"><input type="hidden" name="action" value="${r.enabled?"disable":"enable"}"><button class="btn ${r.enabled?"danger":"primary"}" ${r.id===session.credential_id&&r.enabled?"disabled title='You cannot disable your own admin account'":""}>${r.enabled?"Disable":"Enable"}</button></form>
<form method="post" action="/admin/action"><input type="hidden" name="id" value="${esc(r.id)}"><input type="hidden" name="action" value="revoke"><button class="btn">Revoke sessions</button></form>
<form method="post" action="/admin/action" onsubmit="return confirm('Reset the access code for ${esc(r.name).replace(/'/g,"&#39;")}? The old code will stop working.')"><input type="hidden" name="id" value="${esc(r.id)}"><input type="hidden" name="action" value="reset"><button class="btn">Reset code</button></form>
</div></td>
</tr>`;
  }).join("");

  const requestCards=requests.map(r=>`
<div class="req-card">
  <div><strong>${esc(r.name || r.requested_name)}</strong><div class="muted tiny">Requested ${esc(fmtTime(r.created_at))}</div></div>
  <div class="acts">
    <form method="post" action="/admin/request-action">
      <input type="hidden" name="request_id" value="${Number(r.id)}">
      <input type="hidden" name="action" value="approve">
      <button class="btn primary">Approve + create password</button>
    </form>
    <form method="post" action="/admin/request-action">
      <input type="hidden" name="request_id" value="${Number(r.id)}">
      <input type="hidden" name="action" value="deny">
      <button class="btn danger">Deny</button>
    </form>
  </div>
</div>`).join("");

  return htmlResponse(`<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>Siahverse Access Admin</title><style>
:root{color-scheme:dark;--bg:#080b12;--p:#111827;--p2:#172033;--t:#f4f7ff;--m:#aeb8cf;--a:#7c9cff;--a2:#9a7cff;--b:#2c3955;--ok:#4fd1a1;--bad:#ff7b86}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at top,#151f3a 0,#080b12 44%);color:var(--t);font-family:Inter,system-ui,-apple-system,sans-serif}
.wrap{width:min(1180px,calc(100% - 28px));margin:auto;padding:24px 0 60px}.top{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:22px}.brand{display:flex;align-items:center;gap:12px;color:var(--t);text-decoration:none}.logo{width:48px;height:48px;display:grid;place-items:center;border-radius:15px;background:linear-gradient(135deg,var(--a),var(--a2));font-weight:950}.muted{color:var(--m)}.tiny{font-size:12px}.nav{display:flex;gap:8px;align-items:center}.nav a,.nav button{font:inherit;font-weight:800;color:var(--t);background:var(--p2);border:1px solid var(--b);border-radius:11px;padding:9px 12px;text-decoration:none;cursor:pointer}
.panel{background:rgba(17,24,39,.96);border:1px solid var(--b);border-radius:20px;padding:20px;margin-bottom:16px}.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.stat{background:var(--p2);border:1px solid var(--b);border-radius:14px;padding:14px}.stat b{display:block;font-size:24px}.notice{padding:12px 14px;border:1px solid #476b62;background:#102923;border-radius:12px;margin-bottom:14px}.code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:17px;font-weight:900;word-break:break-all;color:#dfe6ff}
.tablewrap{overflow:auto;border:1px solid var(--b);border-radius:16px}table{width:100%;border-collapse:collapse;min-width:900px;background:var(--p)}th,td{text-align:left;padding:13px 12px;border-bottom:1px solid var(--b);vertical-align:middle}th{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#bcc8e0;background:#111a2c;position:sticky;top:0}tr:last-child td{border-bottom:0}.status{display:inline-block;padding:5px 8px;border-radius:999px;font-size:12px;font-weight:850}.status.on{color:#b9ffe7;background:#103128;border:1px solid #285f50}.status.off{color:#c8d0e2;background:#20283a;border:1px solid #35415b}
.device{display:inline-block;padding:5px 8px;border-radius:999px;font-size:12px;font-weight:850;color:#c8d0e2;background:#20283a;border:1px solid #35415b}.device.changed{color:#ffe1b8;background:#332314;border-color:#79552b}.device.neutral{color:#c8d0e2}.req-list{display:grid;gap:10px}.req-card{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:13px 14px;border:1px solid var(--b);border-radius:13px;background:var(--p2)}.acts{display:flex;gap:6px;flex-wrap:wrap}.acts form{margin:0}.btn{font:inherit;font-size:12px;font-weight:850;border:1px solid var(--b);border-radius:9px;padding:8px 10px;background:var(--p2);color:var(--t);cursor:pointer}.btn.primary{background:linear-gradient(135deg,var(--a),var(--a2));border:0}.btn.danger{color:#ffd5d9;border-color:#70404a;background:#321b22}.btn:disabled{opacity:.45;cursor:not-allowed}
@media(max-width:700px){.stats{grid-template-columns:1fr}.wrap{width:min(100% - 18px,1180px)}}
</style></head><body><div class="wrap">
<div class="top"><a class="brand" href="/" aria-label="Siahverse home"><div class="logo">S</div><div><strong>Siahverse</strong><div class="muted tiny">Nursing Resources • Access Admin</div></div></a>
<div class="nav"><a href="/">← Back</a><a href="/nursing/">Nursing Resources</a><form method="post" action="/api/nursing-logout"><button>Log out</button></form></div></div>
<div class="panel"><h1 style="margin:0 0 6px">Access Admin</h1><p class="muted">Signed in as ${esc(session.name)}. Passwords are never displayed after creation; resetting a code shows the new code once.</p><p class="muted tiny">Browser/device status uses a random cookie only. No location, city, network, or IP information is stored. Clearing cookies or using private browsing will appear as a new browser/device.</p>
${notice?`<div class="notice">${esc(notice)}${newCode?`<div class="code">${esc(newCode)}</div>`:""}</div>`:""}
<div class="stats"><div class="stat"><b>${rows.length}</b><span class="muted">Credentials</span></div><div class="stat"><b>${enabled}</b><span class="muted">Enabled</span></div><div class="stat"><b>${logins}</b><span class="muted">Successful logins</span></div><div class="stat"><b>${requests.length}</b><span class="muted">Pending requests</span></div></div></div>
<div class="panel"><h2 style="margin-top:0">Pending access requests</h2>
<div class="req-list">${requestCards || '<div class="muted">No pending requests.</div>'}</div></div>
<div class="tablewrap"><table><thead><tr><th>Person</th><th>Status</th><th>Logins</th><th>Last login</th><th>Sessions</th><th>Browser/device</th><th>Actions</th></tr></thead><tbody>${cards}</tbody></table></div>
</div></body></html>`);
}

async function uniqueNewCode(db) {
  for (let tries=0;tries<30;tries++) {
    const n=crypto.getRandomValues(new Uint32Array(1))[0] % 100000;
    const code="InSiahWeTrust!"+String(n).padStart(5,"0");
    // Collision check is by verifying against current enabled/disabled credentials.
    // 48 rows keeps this acceptable for an infrequent admin-only reset.
    const {results=[]}=await db.prepare("SELECT salt,password_hash FROM credentials").all();
    let collision=false;
    for (const r of results) {
      const d=await derive(code,r.salt);
      if (timingSafeEqual(d,b64urlToBytes(r.password_hash))) { collision=true; break; }
    }
    if (!collision) return code;
  }
  throw new Error("Could not generate a unique code.");
}

async function adminRequestAction(context,session) {
  await ensureAccessRequests(context.env.DB);
  const origin=new URL(context.request.url).origin;
  const reqOrigin=context.request.headers.get("Origin");
  if (reqOrigin && reqOrigin!==origin) return new Response("Forbidden",{status:403});

  const form=await context.request.formData();
  const requestId=Number(form.get("request_id"));
  const action=String(form.get("action")||"");
  if (!Number.isInteger(requestId) || requestId<1) return adminPage(context,session,"Invalid request.");

  const req=await context.env.DB.prepare(`
    SELECT r.id,r.requested_name,r.credential_id,r.status,c.name
    FROM access_requests r LEFT JOIN credentials c ON c.id=r.credential_id
    WHERE r.id=? LIMIT 1
  `).bind(requestId).first();

  if (!req || req.status!=="pending") return adminPage(context,session,"That request is no longer pending.");

  if (action==="deny") {
    await context.env.DB.prepare(
      "UPDATE access_requests SET status='denied',resolved_at=CURRENT_TIMESTAMP,resolved_by=? WHERE id=?"
    ).bind(session.credential_id,requestId).run();
    await logEvent(context.env.DB,session.credential_id,"admin_deny_access_request",String(requestId));
    return adminPage(context,session,`Access request denied for ${req.name || req.requested_name}.`);
  }

  if (action==="approve") {
    if (!req.credential_id) return adminPage(context,session,"This request is not linked to a classmate account.");
    const code=await uniqueNewCode(context.env.DB);
    const saltBytes=new Uint8Array(16); crypto.getRandomValues(saltBytes);
    const salt=b64url(saltBytes);
    const hash=b64url(await derive(code,salt));

    await context.env.DB.batch([
      context.env.DB.prepare(
        "UPDATE credentials SET salt=?,password_hash=?,enabled=1,updated_at=CURRENT_TIMESTAMP WHERE id=?"
      ).bind(salt,hash,req.credential_id),
      context.env.DB.prepare(
        "UPDATE sessions SET revoked=1 WHERE credential_id=?"
      ).bind(req.credential_id),
      context.env.DB.prepare(
        "UPDATE access_requests SET status='approved',resolved_at=CURRENT_TIMESTAMP,resolved_by=? WHERE id=?"
      ).bind(session.credential_id,requestId)
    ]);

    await logEvent(context.env.DB,session.credential_id,"admin_approve_access_request",req.credential_id);
    return adminPage(context,session,`Access approved for ${req.name || req.requested_name}. Copy the password now; it will not be shown again.`,code);
  }

  return adminPage(context,session,"Unknown request action.");
}

async function adminAction(context,session) {
  const origin=new URL(context.request.url).origin;
  const reqOrigin=context.request.headers.get("Origin");
  if (reqOrigin && reqOrigin!==origin) return new Response("Forbidden",{status:403});
  const form=await context.request.formData();
  const id=String(form.get("id")||"");
  const action=String(form.get("action")||"");
  const target=await context.env.DB.prepare("SELECT id,name,enabled,is_admin FROM credentials WHERE id=?").bind(id).first();
  if (!target) return adminPage(context,session,"Credential not found.");

  if (action==="enable") {
    await context.env.DB.prepare("UPDATE credentials SET enabled=1,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(id).run();
    await logEvent(context.env.DB,session.credential_id,"admin_enable",id);
    return adminPage(context,session,`${target.name} enabled.`);
  }

  if (action==="disable") {
    if (id===session.credential_id) return adminPage(context,session,"You cannot disable your own active admin account.");
    await context.env.DB.batch([
      context.env.DB.prepare("UPDATE credentials SET enabled=0,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(id),
      context.env.DB.prepare("UPDATE sessions SET revoked=1 WHERE credential_id=?").bind(id)
    ]);
    await logEvent(context.env.DB,session.credential_id,"admin_disable",id);
    return adminPage(context,session,`${target.name} disabled and their sessions were revoked.`);
  }

  if (action==="revoke") {
    await context.env.DB.prepare("UPDATE sessions SET revoked=1 WHERE credential_id=?").bind(id).run();
    await logEvent(context.env.DB,session.credential_id,"admin_revoke_sessions",id);
    return adminPage(context,session,`Sessions revoked for ${target.name}.`);
  }

  if (action==="reset") {
    const code=await uniqueNewCode(context.env.DB);
    const saltBytes=new Uint8Array(16); crypto.getRandomValues(saltBytes);
    const salt=b64url(saltBytes);
    const hash=b64url(await derive(code,salt));
    await context.env.DB.batch([
      context.env.DB.prepare("UPDATE credentials SET salt=?,password_hash=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(salt,hash,id),
      context.env.DB.prepare("UPDATE sessions SET revoked=1 WHERE credential_id=?").bind(id)
    ]);
    await logEvent(context.env.DB,session.credential_id,"admin_reset_code",id);
    return adminPage(context,session,`New access code for ${target.name} — copy it now. It will not be shown again.`,code);
  }

  return adminPage(context,session,"Unknown admin action.");
}

export async function onRequest(context) {
  const {request,env}=context;
  const url=new URL(request.url), path=url.pathname;

  if (!env.DB) return htmlResponse("<h1>Siahverse configuration error</h1><p>Cloudflare D1 binding <strong>DB</strong> is missing.</p>",500);

  if (path==="/api/nursing-login") {
    if (request.method!=="POST") return new Response("Method Not Allowed",{status:405});
    return handleLogin(context);
  }

  if (path==="/api/nursing-logout") {
    if (request.method!=="POST") return new Response("Method Not Allowed",{status:405});
    return handleLogout(context);
  }

  if (path==="/api/access-request") {
    if (request.method!=="POST") return new Response("Method Not Allowed",{status:405});
    return handleAccessRequest(context);
  }

  const protectedPath =
    path==="/nursing" || path.startsWith("/nursing/") ||
    path==="/pharm1" || path.startsWith("/pharm1/") ||
    path==="/admin" || path.startsWith("/admin/");

  if (!protectedPath) return context.next();

  const session=await getSession(env.DB,request);
  if (!session) return loginPage(path+url.search,"",200);

  if (path==="/admin" || path==="/admin/") {
    if (!session.is_admin) return forbiddenPage();
    if (request.method!=="GET") return new Response("Method Not Allowed",{status:405});
    return adminPage(context,session);
  }

  if (path==="/admin/action") {
    if (!session.is_admin) return forbiddenPage();
    if (request.method!=="POST") return new Response("Method Not Allowed",{status:405});
    return adminAction(context,session);
  }

  if (path==="/admin/request-action") {
    if (!session.is_admin) return forbiddenPage();
    if (request.method!=="POST") return new Response("Method Not Allowed",{status:405});
    return adminRequestAction(context,session);
  }

  return context.next();
}
