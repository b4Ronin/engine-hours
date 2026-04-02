const CACHE_NAME="engine-hours-a6-v1";
const APP_SHELL=[
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./service-worker.js"
];

self.addEventListener("install", function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.map(function(key){
          if(key!==CACHE_NAME){
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function(event){
  if(event.request.mode==="navigate"){
    event.respondWith(
      fetch(event.request).then(function(response){
        const clone=response.clone();
        caches.open(CACHE_NAME).then(function(cache){
          cache.put("./index.html", clone);
        });
        return response;
      }).catch(function(){
        return caches.match("./index.html");
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function(cached){
      if(cached){ return cached; }
      return fetch(event.request).then(function(response){
        const clone=response.clone();
        caches.open(CACHE_NAME).then(function(cache){
          cache.put(event.request, clone);
        });
        return response;
      }).catch(function(){
        return caches.match("./index.html");
      });
    })
  );
});
