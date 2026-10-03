const CACHE='nursedoku-4d6b87ba85';
const ASSETS=["./","index.html","manifest.webmanifest","icon.svg","assets/app.e579810aeb.js","assets/styles.811b274a90.css","assets/puzzles.f65a8e5e36.js","assets/large-puzzles.e8d0d5e480.js","assets/account-config.eb68e98f84.js","assets/accounts.1a07f7309a.js","assets/appearance.ee40228e94.js","assets/shared-account.a2d49a535c.js","assets/tutorial.6a736fc2f7.js","assets/shift000.16728e9d85.js"];

self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
// Activate on the next visit, keeping an in-progress board on a consistent version.
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('nursedoku-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url),scope=new URL(self.registration.scope);
 if(event.request.method!=='GET'||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
 if(event.request.mode==='navigate')event.respondWith(fetch(event.request).catch(()=>caches.open(CACHE).then(cache=>cache.match('index.html'))));
 else event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(event.request))||fetch(event.request)));
});


