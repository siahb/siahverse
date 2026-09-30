const CACHE='nursedoku-7a81125a6a';
const ASSETS=["./","index.html","manifest.webmanifest","icon.svg","assets/app.1908e7d8c2.js","assets/styles.861ef73b02.css","assets/puzzles.f65a8e5e36.js","assets/large-puzzles.e8d0d5e480.js","assets/account-config.eb68e98f84.js","assets/accounts.c88e34b7bf.js","assets/appearance.11c5f6c987.js","assets/shared-account.a2d49a535c.js"];

self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
// Activate on the next visit, keeping an in-progress board on a consistent version.
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('nursedoku-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url),scope=new URL(self.registration.scope);
 if(event.request.method!=='GET'||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
 if(event.request.mode==='navigate')event.respondWith(fetch(event.request).catch(()=>caches.open(CACHE).then(cache=>cache.match('index.html'))));
 else event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(event.request))||fetch(event.request)));
});
