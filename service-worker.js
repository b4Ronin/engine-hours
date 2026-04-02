const CACHE_NAME="engine-hours-a5-v2";
self.addEventListener("install",e=>{
 e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(["./","./index.html","./app.js","./style.css"])));
 self.skipWaiting();
});
self.addEventListener("fetch",e=>{
 e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
