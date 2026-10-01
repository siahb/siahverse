const CACHE='nursedoku-f8ed9f8aab';
const ASSETS=["./","index.html","manifest.webmanifest","icon.svg","assets/app.648a984c43.js","assets/styles.3e4e4ac9b1.css","assets/puzzles.ad028b6d5f.js","assets/large-puzzles.b5dbb536ca.js","assets/account-config.cc916e79c2.js","assets/accounts.b52b1f32a3.js","assets/appearance.11c5f6c987.js","assets/shared-account.a2d49a535c.js","assets/tutorial.d3a29e2f49.js","assets/shift000.58ff5b0f2f.js"];

self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
// Activate on the next visit, keeping an in-progress board on a consistent version.
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('nursedoku-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url),scope=new URL(self.registration.scope);
 if(event.request.method!=='GET'||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
 if(event.request.mode==='navigate')event.respondWith(fetch(event.request).catch(()=>caches.open(CACHE).then(cache=>cache.match('index.html'))));
 else event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(event.request))||fetch(event.request)));
});

