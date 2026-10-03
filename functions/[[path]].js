import {isClassExamPath,classExamAccess} from '../server/qbanco-class-access.mjs';
import {deskhopAccess} from '../server/deskhop-access.js';
import {accountApi} from '../server/account-api.js';
import {accountTasks} from '../server/account-tasks.js';
import {validTask} from '../server/task-validation.js';
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
  // Redirect only to known local pages; never accept a URL or ambiguous // path.
  const path=value.split("?")[0];
  if (/^\/(?:nursing|pharm1|medsurg1|admin)(?:\/|$)/.test(path) && !value.startsWith("//") && !/[\\\r\n]/.test(value)) return value;
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


function jsonResponse(data,status=200) {
  return new Response(JSON.stringify(data),{
    status,
    headers:{
      "Content-Type":"application/json; charset=UTF-8",
      "Cache-Control":"no-store"
    }
  });
}

async function ensureSiahDoTasks(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS siahdo_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  await db.prepare(
    "CREATE INDEX IF NOT EXISTS idx_siahdo_tasks_order ON siahdo_tasks(sort_order,id)"
  ).run();
}

async function loadSiahDoRows(db) {
  await ensureSiahDoTasks(db);
  const {results=[]}=await db.prepare(
    "SELECT id,sort_order,data FROM siahdo_tasks ORDER BY sort_order ASC,id ASC"
  ).all();
  return results.map(r=>{
    let task={};
    try { task=JSON.parse(r.data); } catch {}
    return {id:r.id,sort_order:r.sort_order,task};
  });
}

async function replaceSiahDoTasks(db,tasks) {
  if (!Array.isArray(tasks)) throw new Error("Invalid task list");
  await ensureSiahDoTasks(db);
  await db.prepare("DELETE FROM siahdo_tasks").run();
  for (let i=0;i<tasks.length;i++) {
    await db.prepare(
      "INSERT INTO siahdo_tasks (sort_order,data) VALUES (?,?)"
    ).bind(i,JSON.stringify(tasks[i] ?? {})).run();
  }
}

async function verifySiahDoAdmin(env,request) {
  const expected=String(env.SIAHDO_ADMIN_PASSWORD || "");
  if (!expected) return false;
  const auth=request.headers.get("Authorization") || "";
  const supplied=auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!supplied) return false;
  const [a,b]=await Promise.all([sha256(supplied),sha256(expected)]);
  return timingSafeEqual(a,b);
}

async function requireSiahDoAdmin(context) {
  if (!context.env.SIAHDO_ADMIN_PASSWORD) {
    return jsonResponse({error:"SiahDo admin secret is not configured."},503);
  }
  if (!(await verifySiahDoAdmin(context.env,context.request))) {
    return jsonResponse({error:"Unauthorized"},401);
  }
  return null;
}

async function handleSiahDoApi(context,path) {
  const {request,env}=context;
  await ensureSiahDoTasks(env.DB);

  if (path==="/todos/auth-check") {
    if (request.method!=="POST") return new Response("Method Not Allowed",{status:405});
    const denied=await requireSiahDoAdmin(context);
    return denied || jsonResponse({ok:true});
  }

  if (path==="/todos" || path==="/todos/") {
    if (request.method==="GET") {
      const denied=await requireSiahDoAdmin(context);
      if (denied) return denied;
      const rows=await loadSiahDoRows(env.DB);
      return jsonResponse(rows.map(r=>r.task));
    }

    if (request.method==="POST") {
      const denied=await requireSiahDoAdmin(context);
      if (denied) return denied;
      let body;
      try { body=await request.json(); } catch { return jsonResponse({error:"Invalid JSON"},400); }
      const text=typeof body?.text==="string" ? body.text.trim() : "";
      if (!text) return jsonResponse({error:"Missing text"},400);
      const {text:_ignored,...rest}=body || {};
      const task={text,done:false,...rest};
      if(!validTask(task))return jsonResponse({error:"Invalid task fields."},400);
      const row=await env.DB.prepare("SELECT COALESCE(MAX(sort_order),-1)+1 AS n FROM siahdo_tasks").first();
      await env.DB.prepare(
        "INSERT INTO siahdo_tasks (sort_order,data) VALUES (?,?)"
      ).bind(Number(row?.n || 0),JSON.stringify(task)).run();
      return jsonResponse({status:"added",todo:task});
    }

    return new Response("Method Not Allowed",{status:405});
  }

  if (path==="/todos/reorder") {
    if (request.method!=="POST") return new Response("Method Not Allowed",{status:405});
    const denied=await requireSiahDoAdmin(context);
    if (denied) return denied;
    let body;
    try { body=await request.json(); } catch { return jsonResponse({error:"Invalid JSON"},400); }
    if (!Array.isArray(body)) return jsonResponse({error:"Invalid data"},400);
    // Reorder existing rows only: stale/filtered lists must not erase tasks.
    const rows=await loadSiahDoRows(env.DB);
    if (body.length!==rows.length) return jsonResponse({error:"Task list changed. Reload before reordering."},409);
    const available=[...rows];
    const ordered=[];
    for (const task of body) {
      const match=available.findIndex(row=>JSON.stringify(row.task)===JSON.stringify(task));
      if (match<0) return jsonResponse({error:"Task list changed. Reload before reordering."},409);
      ordered.push(available.splice(match,1)[0]);
    }
    if (ordered.length) await env.DB.batch(ordered.map((row,index)=>
      env.DB.prepare("UPDATE siahdo_tasks SET sort_order=? WHERE id=?").bind(index,row.id)
    ));
    return jsonResponse({status:"reordered"});
  }

  const m=path.match(/^\/todos\/(\d+)$/);
  if (m) {
    const index=Number(m[1]);
    const denied=await requireSiahDoAdmin(context);
    if (denied) return denied;

    const row=await env.DB.prepare(
      "SELECT id,data FROM siahdo_tasks ORDER BY sort_order ASC,id ASC LIMIT 1 OFFSET ?"
    ).bind(index).first();
    if (!row) return jsonResponse({error:"Invalid index"},404);

    if (request.method==="PATCH") {
      let patch;
      try { patch=await request.json(); } catch { return jsonResponse({error:"Invalid JSON"},400); }
      if(!patch||typeof patch!=="object"||Array.isArray(patch))return jsonResponse({error:"Invalid task."},400);
      let current={};
      try { current=JSON.parse(row.data); } catch {}
      const task={...current,...(patch || {})};
      if(!validTask(task))return jsonResponse({error:"Invalid task fields."},400);
      await env.DB.prepare(
        "UPDATE siahdo_tasks SET data=?,updated_at=CURRENT_TIMESTAMP WHERE id=?"
      ).bind(JSON.stringify(task),row.id).run();
      return jsonResponse({status:"updated",todo:task});
    }

    if (request.method==="DELETE") {
      let deleted={};
      try { deleted=JSON.parse(row.data); } catch {}
      await env.DB.prepare("DELETE FROM siahdo_tasks WHERE id=?").bind(row.id).run();
      const remaining=await loadSiahDoRows(env.DB);
      for (let i=0;i<remaining.length;i++) {
        if (Number(remaining[i].sort_order)!==i) {
          await env.DB.prepare("UPDATE siahdo_tasks SET sort_order=? WHERE id=?")
            .bind(i,remaining[i].id).run();
        }
      }
      return jsonResponse({status:"deleted",removed:[deleted]});
    }

    return new Response("Method Not Allowed",{status:405});
  }

  return jsonResponse({error:"Not found"},404);
}

async function migrateSiahDoFromHomelab(context,session) {
  const existing=await context.env.DB.prepare("SELECT COUNT(*) AS n FROM siahdo_tasks").first();
  if (existing?.n) return adminPage(context,session,"Migration blocked: D1 already contains tasks. Existing data was preserved.");
  const origin=new URL(context.request.url).origin;
  const reqOrigin=context.request.headers.get("Origin");
  if (reqOrigin && reqOrigin!==origin) return new Response("Forbidden",{status:403});

  let res;
  try {
    res=await fetch("https://todo.siahverse.cc/todos",{
      headers:{"Accept":"application/json","Cache-Control":"no-cache"}
    });
  } catch {
    return adminPage(context,session,"Could not reach the current SiahDo homelab server. Nothing was changed.");
  }
  if (!res.ok) return adminPage(context,session,`Homelab SiahDo returned HTTP ${res.status}. Nothing was changed.`);

  let tasks;
  try { tasks=await res.json(); } catch {
    return adminPage(context,session,"The homelab returned invalid task data. Nothing was changed.");
  }
  if (!Array.isArray(tasks)) return adminPage(context,session,"The homelab task response was not a list. Nothing was changed.");

  await replaceSiahDoTasks(context.env.DB,tasks);
  await logEvent(context.env.DB,session.credential_id,"admin_migrate_siahdo",String(tasks.length));
  return adminPage(context,session,`Imported ${tasks.length} SiahDo task${tasks.length===1?"":"s"} into Cloudflare D1.`);
}

async function serveSiahDoAsset(context,path) {
  const url=new URL(context.request.url);
  const cleanPath=path==="/" ? "/public/" : "/public"+path;
  url.pathname=cleanPath;
  return context.env.ASSETS.fetch(url);
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
    return loginPage("/nursing/","Name not found. Did you enter your full name, including your middle name if you have one?",400);
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
<p class="sub">Your access request was submitted. Check with Siah for approval and your password.</p>
<a class="btn" href="/nursing/">Back to sign in</a></main></body></html>`);
}

function htmlResponse(html,status=200,extra={}) {
  html=html.replace("</head>",'<link rel="stylesheet" href="/shared-theme.css?v=20260930-sync"><script src="/toggle-theme.js?v=20260930-sync"></script></head>').replace("<body>",'<body><button type="button" id="sharedThemeToggle" class="shared-theme-toggle">Theme</button>');
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
.error{min-height:27px;padding-top:7px;color:var(--bad);font-size:13px;font-weight:800}.note{margin:16px 0 0;color:var(--m);font-size:12px;line-height:1.5}.request{margin-top:20px;padding-top:18px;border-top:1px solid var(--b)}.request summary{cursor:pointer;font-weight:850;color:#cfd8ef}.request form{margin-top:14px}.request input{margin-bottom:8px}.request button{width:100%;min-height:46px;border:1px solid var(--b);border-radius:12px;background:var(--p2);color:var(--t)}.forgot{border:1px solid var(--b);border-radius:18px;padding:24px;background:var(--p);color:var(--t);width:min(390px,calc(100% - 32px));box-shadow:0 24px 80px rgba(0,0,0,.55)}.forgot::backdrop{background:rgba(0,0,0,.7)}.forgot h2{margin:0 0 10px}.forgot p{color:var(--m);line-height:1.5}.forgot .actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:20px}.forgot .actions button{min-height:44px;border:1px solid var(--b);border-radius:10px;background:var(--p2);color:var(--t);padding:0 14px}.forgot .actions .primary{border:0;background:linear-gradient(135deg,var(--a),var(--a2))}
</style></head><body><main class="card">
<a class="back-home" href="/">← Back</a><br><a class="home-brand" href="/" aria-label="Siahverse home"><div class="logo">S</div><div class="k">Siahverse</div></a><h1>${safe.startsWith("/pharm1")?"Sign in to Pharmacology":safe.startsWith("/medsurg1")?"Sign in to Med-Surg":safe.startsWith("/admin")?"Admin access":"Nursing"}</h1>
<p class="sub">Enter the access password to continue.</p>
<form method="post" action="/api/nursing-login">
<input type="hidden" name="next" value="${esc(safe)}">
<label for="password">Access password</label><div class="row">
<input id="password" name="password" type="password" autocomplete="current-password" autofocus required>
<button class="show" type="button" id="show">Show</button></div>
<div class="error" role="status">${esc(error)}</div><button class="unlock" type="submit">Sign in</button>
</form><p class="note">Do not share your password.</p>
<details class="request" id="request"><summary>Need access or a password reset?</summary>
<form method="post" action="/api/access-request">
<label for="request-name">Full name</label>
<input id="request-name" name="name" type="text" autocomplete="name" maxlength="100" required>
<button type="submit">Submit request</button>
</form></details></main>
<dialog class="forgot" id="forgot" aria-labelledby="forgot-title"><h2 id="forgot-title">Forgot your password?</h2><p>${safe.startsWith("/admin")?"The access-request form cannot recover your admin account. Use your saved admin password or arrange a manual recovery.":"You can request a new password. Siah will verify your identity and send it to you."}</p><div class="actions">${safe.startsWith("/admin")?"":'<button type="button" class="primary" id="request-reset">Request a new password</button>'}<button type="button" id="close-forgot">Try again</button></div></dialog>
<script>const p=document.getElementById("password"),s=document.getElementById("show"),modal=document.getElementById("forgot");s.addEventListener("click",()=>{const v=p.type==="text";p.type=v?"password":"text";s.textContent=v?"Show":"Hide";p.focus()});document.getElementById("close-forgot").addEventListener("click",()=>modal.close());const reset=document.getElementById("request-reset");if(reset)reset.addEventListener("click",()=>{modal.close();const details=document.getElementById("request");details.open=true;document.getElementById("request-name").focus()});try{const key="sv_nursing_failed_logins";let count=Number(sessionStorage.getItem(key))||0;if(${status===401}){count=Math.min(count+1,3);sessionStorage.setItem(key,String(count));if(count>=3)modal.showModal()}else if(${status===200})sessionStorage.removeItem(key)}catch{}</script>
</body></html>`,status);
}

function forbiddenPage() {
  return htmlResponse(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Admin access required</title>
<style>body{font-family:system-ui;background:#080b12;color:#f4f7ff;display:grid;place-items:center;min-height:100vh;margin:0}.c{max-width:500px;padding:28px;border:1px solid #2c3955;border-radius:20px;background:#111827}.brand{display:inline-flex;align-items:center;gap:10px;color:#f4f7ff;text-decoration:none;font-weight:900}.logo{width:42px;height:42px;display:grid;place-items:center;border-radius:13px;background:linear-gradient(135deg,#7c9cff,#9a7cff)}a{color:#9eb4ff}.links{display:flex;gap:12px;flex-wrap:wrap;margin-top:18px}</style></head>
<body><div class="c"><a class="brand" href="/" aria-label="Siahverse home"><span class="logo">S</span><span>Siahverse</span></a><h1>Admin access required</h1><p>This Siahverse page is limited to an administrator account.</p><div class="links"><a href="/">← Back</a><a href="/nursing/">Nursing</a></div></div></body></html>`,403);
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
  await ensureSiahDoTasks(context.env.DB);
  const siahdoCountRow=await context.env.DB.prepare("SELECT COUNT(*) AS n FROM siahdo_tasks").first();
  const siahdoTasks=Number(siahdoCountRow?.n || 0);
  const siahdoSecretConfigured=!!context.env.SIAHDO_ADMIN_PASSWORD;
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
<title>Siahverse Admin Center</title><style>
:root{color-scheme:dark;--bg:#080b12;--p:#111827;--p2:#172033;--t:#f4f7ff;--m:#aeb8cf;--a:#7c9cff;--a2:#9a7cff;--b:#2c3955;--ok:#4fd1a1;--bad:#ff7b86;--warn:#f4c95d}
*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at 12% -8%,rgba(124,156,255,.16),transparent 34rem),radial-gradient(circle at 98% 12%,rgba(154,124,255,.12),transparent 30rem),var(--bg);color:var(--t);font-family:Inter,system-ui,-apple-system,sans-serif}.wrap{width:min(1220px,calc(100% - 28px));margin:auto;padding:24px 0 64px}
.top{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:24px}.brand{display:flex;align-items:center;gap:12px;color:var(--t);text-decoration:none}.logo{width:48px;height:48px;display:grid;place-items:center;border-radius:15px;background:linear-gradient(135deg,var(--a),var(--a2));font-weight:950}.brand strong{display:block}.brand span{display:block;color:var(--m);font-size:12px;margin-top:3px}.nav{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.nav a,.nav button{font:inherit;font-weight:800;color:var(--t);background:var(--p2);border:1px solid var(--b);border-radius:11px;padding:9px 12px;text-decoration:none;cursor:pointer}
.hero{padding:12px 0 20px}.eyebrow{color:#b8c5e5;font-size:11px;font-weight:900;letter-spacing:.11em;text-transform:uppercase}.hero h1{font-size:clamp(2.3rem,6vw,4.4rem);letter-spacing:-.045em;line-height:.98;margin:6px 0 9px}.hero p{margin:0;color:var(--m);line-height:1.6;max-width:760px}.muted{color:var(--m)}.tiny{font-size:12px}
.notice{padding:13px 15px;border:1px solid #476b62;background:#102923;border-radius:13px;margin-bottom:16px}.code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:17px;font-weight:900;word-break:break-all;color:#dfe6ff;margin-top:7px}
.tabs{display:flex;gap:7px;overflow-x:auto;padding:7px;border:1px solid var(--b);border-radius:15px;background:rgba(17,24,39,.78);position:sticky;top:8px;z-index:20;backdrop-filter:blur(14px);margin-bottom:16px}.tab-btn{flex:0 0 auto;border:0;border-radius:10px;padding:10px 13px;background:transparent;color:var(--m);font-weight:850;cursor:pointer}.tab-btn.active{color:#fff;background:linear-gradient(135deg,var(--a),var(--a2))}.tab-panel{display:none}.tab-panel.active{display:block}
.panel{background:rgba(17,24,39,.94);border:1px solid var(--b);border-radius:20px;padding:20px;margin-bottom:16px}.panel h2{margin:0 0 6px}.panel p{line-height:1.55}.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.stat{background:var(--p2);border:1px solid var(--b);border-radius:15px;padding:15px}.stat b{display:block;font-size:25px;line-height:1}.stat span{display:block;color:var(--m);font-size:12px;margin-top:6px}.stat.good b{color:var(--ok)}.stat.warn b{color:var(--warn)}
.area-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.area-card{display:flex;flex-direction:column;min-height:170px;padding:18px;border:1px solid var(--b);border-radius:17px;background:linear-gradient(180deg,var(--p2),var(--p));text-decoration:none;color:var(--t)}.area-card:hover{border-color:#52678f}.area-icon{font-size:24px;margin-bottom:15px}.area-card h3{margin:0 0 7px}.area-card p{margin:0;color:var(--m);font-size:13px;flex:1}.area-link{margin-top:14px;color:#bfcaff;font-size:12px;font-weight:850}
.req-list{display:grid;gap:10px}.req-card{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:13px 14px;border:1px solid var(--b);border-radius:13px;background:var(--p2)}.acts{display:flex;gap:6px;flex-wrap:wrap}.acts form{margin:0}.btn{font:inherit;font-size:12px;font-weight:850;border:1px solid var(--b);border-radius:9px;padding:8px 10px;background:var(--p2);color:var(--t);cursor:pointer}.btn.primary{background:linear-gradient(135deg,var(--a),var(--a2));border:0}.btn.danger{color:#ffd5d9;border-color:#70404a;background:#321b22}.btn:disabled{opacity:.45;cursor:not-allowed}
.tablewrap{overflow:auto;border:1px solid var(--b);border-radius:16px}table{width:100%;border-collapse:collapse;min-width:900px;background:var(--p)}th,td{text-align:left;padding:13px 12px;border-bottom:1px solid var(--b);vertical-align:middle}th{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#bcc8e0;background:#111a2c;position:sticky;top:0}tr:last-child td{border-bottom:0}.status{display:inline-block;padding:5px 8px;border-radius:999px;font-size:12px;font-weight:850}.status.on{color:#b9ffe7;background:#103128;border:1px solid #285f50}.status.off{color:#c8d0e2;background:#20283a;border:1px solid #35415b}.device{display:inline-block;padding:5px 8px;border-radius:999px;font-size:12px;font-weight:850;color:#c8d0e2;background:#20283a;border:1px solid #35415b}.device.changed{color:#ffe1b8;background:#332314;border-color:#79552b}.device.neutral{color:#c8d0e2}
.setting-row{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:14px 0;border-bottom:1px solid var(--b)}.setting-row:last-child{border-bottom:0}.setting-row strong{display:block}.setting-row span{display:block;color:var(--m);font-size:12px;margin-top:3px}.chip{flex:0 0 auto;border:1px solid var(--b);border-radius:999px;padding:6px 9px;font-size:11px;font-weight:850}.chip.ok{color:#b9ffe7;border-color:#285f50;background:#103128}.chip.bad{color:#ffd5d9;border-color:#70404a;background:#321b22}
@media(max-width:850px){.stats{grid-template-columns:repeat(2,minmax(0,1fr))}.area-grid{grid-template-columns:1fr}}@media(max-width:700px){.wrap{width:min(100% - 18px,1220px);padding-top:16px}.stats{grid-template-columns:1fr 1fr}.panel{padding:16px}.req-card{align-items:flex-start;flex-direction:column}.tabs{top:6px}.nav a[href="/nursing/"]{display:none}}
</style></head><body><div class="wrap">
<div class="top"><a class="brand" href="/" aria-label="Siahverse home"><div class="logo">S</div><div><strong>Siahverse</strong><span>Admin Center</span></div></a><div class="nav"><a href="/">← Back</a><a href="/nursing/">Nursing</a><form method="post" action="/api/nursing-logout"><button>Log out</button></form></div></div>
<section class="hero"><div class="eyebrow">Control center</div><h1>Siahverse Admin</h1><p>Manage access, SiahDo, sessions, and site operations from one place. Signed in as ${esc(session.name)}.</p></section>
${notice ? '<div class="notice">'+esc(notice)+(newCode ? '<div class="code">'+esc(newCode)+'</div>' : '')+'</div>' : ''}
<nav class="tabs" aria-label="Admin sections"><button class="tab-btn active" type="button" data-tab="overview">Overview</button><button class="tab-btn" type="button" data-tab="access">Access ${requests.length ? '('+requests.length+')' : ''}</button><button class="tab-btn" type="button" data-tab="siahdo">SiahDo</button><button class="tab-btn" type="button" data-tab="security">Security</button></nav>

<section class="tab-panel active" id="tab-overview">
<div class="stats" id="adminStats"><div class="stat"><b>${rows.length}</b><span>Managed accounts</span></div><div class="stat good"><b>${enabled}</b><span>Enabled accounts</span></div><div class="stat ${requests.length?'warn':''}"><b>${requests.length}</b><span>Pending requests</span></div><div class="stat"><b>${siahdoTasks}</b><span>SiahDo tasks in D1</span></div></div>
<div class="panel" style="margin-top:16px"><h2>Areas</h2><p class="muted">Jump directly to the part of Siahverse you want to manage.</p><div class="area-grid">
<a class="area-card" href="#access" data-jump="access"><div class="area-icon">🔐</div><h3>Access</h3><p>Approve requests, manage accounts, revoke sessions, and reset access codes.</p><div class="area-link">Manage access →</div></a>
<a class="area-card" href="#siahdo" data-jump="siahdo"><div class="area-icon">✓</div><h3>SiahDo</h3><p>Manage the Cloudflare migration and D1-backed task storage.</p><div class="area-link">Manage SiahDo →</div></a>
<a class="area-card" href="#security" data-jump="security"><div class="area-icon">🛡️</div><h3>Security</h3><p>Review sessions, browser recognition, privacy, and configuration status.</p><div class="area-link">Review security →</div></a>
</div></div></section>

<section class="tab-panel" id="tab-access"><div class="panel"><h2>Pending access requests</h2><p class="muted">Requests waiting for approval.</p><div class="req-list" id="adminRequests">${requestCards || '<div class="muted">No pending requests.</div>'}</div></div><div class="panel"><h2>Accounts</h2><p class="muted" id="adminLoginSummary">${logins} successful logins recorded across ${rows.length} accounts.</p><div class="tablewrap"><table><thead><tr><th>Person</th><th>Status</th><th>Logins</th><th>Last login</th><th>Sessions</th><th>Browser/device</th><th>Actions</th></tr></thead><tbody id="adminPeople">${cards}</tbody></table></div></div></section>

<section class="tab-panel" id="tab-siahdo"><div class="stats"><div class="stat"><b>${siahdoTasks}</b><span>Tasks in D1</span></div><div class="stat ${siahdoSecretConfigured?'good':'warn'}"><b>${siahdoSecretConfigured?'Ready':'Needed'}</b><span>Admin secret</span></div><div class="stat"><b>Cloudflare</b><span>Target backend</span></div><div class="stat"><b>D1</b><span>Task storage</span></div></div><div class="panel" style="margin-top:16px"><h2>SiahDo Cloudflare migration</h2><p class="muted">Import the current homelab task list into D1 before moving <strong>todo.siahverse.cc</strong> to Cloudflare. Importing replaces the Cloudflare SiahDo task list with the current homelab list.</p><form method="post" action="/admin/siahdo-migrate" onsubmit="return confirm('Import the current SiahDo task list from the homelab into Cloudflare D1?')"><button class="btn primary">Import tasks from homelab</button></form></div></section>

<section class="tab-panel" id="tab-security"><div class="panel"><h2>Security & privacy</h2>
<div class="setting-row"><div><strong>One active session per access code</strong><span>A new login revokes the previous active session for that credential.</span></div><div class="chip ok">On</div></div>
<div class="setting-row"><div><strong>Browser recognition</strong><span>Uses a random cookie hash. It is not a hardware fingerprint.</span></div><div class="chip ok">On</div></div>
<div class="setting-row"><div><strong>Location / IP storage</strong><span>Siahverse does not intentionally save location, city, network, or IP data in its access log.</span></div><div class="chip ok">Off</div></div>
<div class="setting-row"><div><strong>SiahDo admin secret</strong><span>Required for Cloudflare-hosted task changes.</span></div><div class="chip ${siahdoSecretConfigured?'ok':'bad'}">${siahdoSecretConfigured?'Configured':'Not configured'}</div></div>
</div></section>
</div>
<script>(function(){const buttons=[...document.querySelectorAll('.tab-btn')],panels=[...document.querySelectorAll('.tab-panel')];function openTab(name,hash){const valid=buttons.some(b=>b.dataset.tab===name)?name:'overview';buttons.forEach(b=>b.classList.toggle('active',b.dataset.tab===valid));panels.forEach(p=>p.classList.toggle('active',p.id==='tab-'+valid));if(hash)history.replaceState(null,'','#'+valid)}buttons.forEach(b=>b.addEventListener('click',()=>openTab(b.dataset.tab,true)));document.querySelectorAll('[data-jump]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();openTab(a.dataset.jump,true);window.scrollTo({top:0,behavior:'smooth'})}));openTab(location.hash.replace('#','')||'overview',false);window.addEventListener('hashchange',()=>openTab(location.hash.replace('#',''),false));let busy=false;async function refresh(){if(document.hidden||busy)return;busy=true;try{const res=await fetch('/admin/',{credentials:'same-origin',cache:'no-store'});if(!res.ok)return;const fresh=new DOMParser().parseFromString(await res.text(),'text/html');const ids=['adminStats','adminRequests','adminLoginSummary','adminPeople'];if(ids.some(id=>!fresh.getElementById(id)))return;ids.forEach(id=>{document.getElementById(id).innerHTML=fresh.getElementById(id).innerHTML})}catch{}finally{busy=false}}setInterval(refresh,30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()})})();</script>
</body></html>`);
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
  if(path==='/deskhop'||path.startsWith('/deskhop/'))return deskhopAccess(context);
  if(path.startsWith('/api/account/'))return accountApi(context,path.slice('/api/account/'.length));
  if(path==='/account-todos'||path.startsWith('/account-todos/'))return accountTasks(context,path);

  if ((url.hostname==="siahverse.cc" || url.hostname==="www.siahverse.cc") && (path==="/nextset" || path==="/nextset/")) {
    const destination=new URL("https://nextset.siahverse.cc/");
    destination.search=url.search;
    return Response.redirect(destination,308);
  }

  if (!env.DB) return htmlResponse("<h1>Siahverse configuration error</h1><p>Cloudflare D1 binding <strong>DB</strong> is missing.</p>",500);

  const host=url.hostname.toLowerCase();
  const isSiahDoHost=host==="todo.siahverse.cc";
  const isNursingHost=host==="nursing.siahverse.cc";

  if (path==="/todos" || path==="/todos/" || path==="/todos/reorder" || path==="/todos/auth-check" || /^\/todos\/\d+$/.test(path)) {
    return handleSiahDoApi(context,path);
  }

  if (isSiahDoHost) {
    return serveSiahDoAsset(context,path);
  }

  if (isNursingHost && (path==="/" || path==="/index.html")) {
    return Response.redirect(new URL("/nursing/",url),302);
  }

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

  if(isClassExamPath(path)){
    const nursingSession=await getSession(env.DB,request);
    if(!nursingSession)return loginPage(path+url.search,'',200);
    return classExamAccess(context,nursingSession);
  }

  const protectedPath =
    path==="/pharm1" || path.startsWith("/pharm1/") ||
    path==="/medsurg1" || path.startsWith("/medsurg1/") ||
    path==="/admin" || path.startsWith("/admin/");

  if (!protectedPath) return context.next();

  const session=await getSession(env.DB,request);
  if (!session) return loginPage(path+url.search,"",200);

  if (path==="/admin" || path==="/admin/") {
    if (!session.is_admin) return forbiddenPage();
    if (request.method!=="GET") return new Response("Method Not Allowed",{status:405});
    return adminPage(context,session);
  }

  if (path==="/admin/siahdo-migrate") {
    if (!session.is_admin) return forbiddenPage();
    if (request.method!=="POST") return new Response("Method Not Allowed",{status:405});
    return migrateSiahDoFromHomelab(context,session);
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
