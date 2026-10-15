// Minimal offline cache (prototype). Network-first, fall back to cache.
self.addEventListener('install',e=>self.skipWaiting());
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open('homekeep-v1').then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request)))});
