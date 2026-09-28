const COOKIE_NAME = "sv_nursing_access";
const PBKDF2_ITERATIONS = 250000;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILURES = 7;

// Keep only enabled credentials here. IDs are anonymous; names and plaintext codes are never committed.
const ENABLED_CREDENTIALS = [
  {
    id: "student_005",
    salt: "x4EQ4kmPzbf4_DwHU6lOSg",
    hash: "qZ8qmnRFbVgaFunP-tYWCDHp_o8Xul4FozQLQbyi0e0"
  }
];

const failures = new Map();

function b64urlToBytes(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const raw = atob(padded);
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

async function derive(password, salt) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: b64urlToBytes(salt), iterations: PBKDF2_ITERATIONS },
    key,
    256
  );
  return new Uint8Array(bits);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function verifyPassword(password) {
  if (typeof password !== "string" || !password.startsWith("InSiahWeTrust!") || password.length !== 19) return null;
  for (const credential of ENABLED_CREDENTIALS) {
    const actual = await derive(password, credential.salt);
    const expected = b64urlToBytes(credential.hash);
    if (timingSafeEqual(actual, expected)) return credential.id;
  }
  return null;
}

function parseCookies(request) {
  const out = {};
  const raw = request.headers.get("Cookie") || "";
  for (const part of raw.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    try { out[key] = decodeURIComponent(value); } catch { out[key] = value; }
  }
  return out;
}

function clientKey(request) {
  return request.headers.get("CF-Connecting-IP") || request.headers.get("CF-Ray") || "unknown";
}

function rateLimited(request) {
  const key = clientKey(request);
  const now = Date.now();
  const item = failures.get(key);
  if (!item || now - item.started > RATE_WINDOW_MS) {
    failures.set(key, { started: now, count: 0 });
    return false;
  }
  return item.count >= MAX_FAILURES;
}

function noteFailure(request) {
  const key = clientKey(request);
  const now = Date.now();
  const item = failures.get(key);
  if (!item || now - item.started > RATE_WINDOW_MS) failures.set(key, { started: now, count: 1 });
  else item.count++;
}

function clearFailures(request) {
  failures.delete(clientKey(request));
}

function safeNext(value) {
  if (typeof value !== "string") return "/nursing/";
  if (value.startsWith("/nursing") || value.startsWith("/pharm1")) return value;
  return "/nursing/";
}

function loginPage(next = "/nursing/", error = "", status = 200) {
  const escapedNext = safeNext(next).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const errorHtml = error ? `<div class="error" role="status">${error}</div>` : '<div class="error" aria-hidden="true"></div>';
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Nursing Resources | Siahverse</title>
<style>
:root{color-scheme:dark;--bg:#080b12;--panel:#111827;--panel2:#172033;--text:#f4f7ff;--muted:#aeb8cf;--accent:#7c9cff;--accent2:#9a7cff;--border:#2c3955;--bad:#ff9aa4}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:20px;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:radial-gradient(circle at 20% 0%,rgba(124,156,255,.14),transparent 32rem),radial-gradient(circle at 90% 20%,rgba(154,124,255,.11),transparent 28rem),var(--bg);color:var(--text)}
.card{width:min(430px,100%);padding:28px;border:1px solid var(--border);border-radius:22px;background:linear-gradient(180deg,var(--panel2),var(--panel));box-shadow:0 24px 80px rgba(0,0,0,.45)}
.logo{width:54px;height:54px;display:grid;place-items:center;border-radius:17px;background:linear-gradient(135deg,var(--accent),var(--accent2));font-size:24px;font-weight:950;margin-bottom:18px}
.kicker{font-size:12px;font-weight:900;letter-spacing:.11em;text-transform:uppercase;color:#b8c5e5}
h1{font-size:32px;line-height:1.05;margin:6px 0 8px}.sub{color:var(--muted);line-height:1.55;margin:0 0 22px}
label{display:block;font-size:13px;font-weight:850;color:#c9d3ea;margin-bottom:7px}
.row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}
input{width:100%;min-height:50px;border:1px solid var(--border);border-radius:12px;background:#0d1422;color:#fff;padding:11px 12px;font:inherit;outline:none}
input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(124,156,255,.16)}
button{font:inherit;font-weight:850;cursor:pointer}.show{min-width:66px;border:1px solid var(--border);border-radius:12px;background:var(--panel2);color:var(--text);padding:0 12px}
.unlock{width:100%;min-height:50px;border:0;border-radius:12px;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;margin-top:8px}
.error{min-height:27px;padding-top:7px;color:var(--bad);font-size:13px;font-weight:800}
.note{margin:16px 0 0;color:var(--muted);font-size:12px;line-height:1.5}
</style>
</head>
<body>
<main class="card">
<div class="logo">S</div>
<div class="kicker">Siahverse</div>
<h1>Nursing Resources</h1>
<p class="sub">Enter your assigned access password to continue.</p>
<form method="post" action="/api/nursing-login">
<input type="hidden" name="next" value="${escapedNext}">
<label for="password">Access password</label>
<div class="row">
<input id="password" name="password" type="password" autocomplete="current-password" autofocus required>
<button class="show" type="button" id="show">Show</button>
</div>
${errorHtml}
<button class="unlock" type="submit">Unlock</button>
</form>
<p class="note">Access is assigned individually. Do not share your password.</p>
</main>
<script>
const p=document.getElementById("password"),s=document.getElementById("show");
s.addEventListener("click",()=>{const visible=p.type==="text";p.type=visible?"password":"text";s.textContent=visible?"Show":"Hide";p.focus()});
</script>
</body>
</html>`;
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=UTF-8",
      "Cache-Control": "no-store, private",
      "X-Robots-Tag": "noindex, nofollow"
    }
  });
}

async function handleLogin(request) {
  if (rateLimited(request)) {
    return loginPage("/nursing/", "Too many incorrect attempts. Try again in a few minutes.", 429);
  }
  let form;
  try { form = await request.formData(); }
  catch { return loginPage("/nursing/", "Unable to read the login form.", 400); }

  const password = String(form.get("password") || "");
  const next = safeNext(String(form.get("next") || "/nursing/"));
  const id = await verifyPassword(password);

  if (!id) {
    noteFailure(request);
    console.log(JSON.stringify({ event: "nursing_login_failed", at: new Date().toISOString() }));
    return loginPage(next, "Incorrect or inactive access password.", 401);
  }

  clearFailures(request);
  console.log(JSON.stringify({ event: "nursing_login_success", credential_id: id, at: new Date().toISOString() }));

  return new Response(null, {
    status: 303,
    headers: {
      "Location": next,
      "Set-Cookie": `${COOKIE_NAME}=${encodeURIComponent(password)}; Path=/; HttpOnly; Secure; SameSite=Lax`,
      "Cache-Control": "no-store"
    }
  });
}

function handleLogout() {
  return new Response(null, {
    status: 303,
    headers: {
      "Location": "/nursing/",
      "Set-Cookie": `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
      "Cache-Control": "no-store"
    }
  });
}

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === "/api/nursing-login") {
    if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
    return handleLogin(request);
  }

  if (path === "/api/nursing-logout") {
    if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
    return handleLogout();
  }

  const protectedPath =
    path === "/nursing" || path.startsWith("/nursing/") ||
    path === "/pharm1" || path.startsWith("/pharm1/");

  if (!protectedPath) return context.next();

  const password = parseCookies(request)[COOKIE_NAME];
  const id = password ? await verifyPassword(password) : null;

  if (!id) return loginPage(path + url.search, "", 200);

  console.log(JSON.stringify({ event: "nursing_resource_access", credential_id: id, path, at: new Date().toISOString() }));
  return context.next();
}
