const CACHE_NAME = "careerfit-v6.2-20261008-r7";
const ASSETS = ["./","./index.html","./style.css","./app.js","./manifest.json","./icon.svg","./icon-180.png","./icon-192.png","./icon-512.png","./resume-template.html"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch", event => {
  if(event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  const isAppAsset = /\/(app\.js|index\.html|style\.css|resume-template\.html|service-worker\.js)$/.test(url.pathname);
  if(isAppAsset){
    event.respondWith(fetch(event.request, {cache:"no-store"}).then(response=>{
      const copy=response.clone(); caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy)); return response;
    }).catch(()=>caches.match(event.request)));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy=response.clone(); caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy)); return response;
  }).catch(()=>caches.match("./index.html"))));
});
