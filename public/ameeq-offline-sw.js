// Scoped to /ameeq only; never cache API responses, credentials or remote media.
const CACHE = 'arena-ameeq-shell-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.includes('/api/')) return;
  if (request.mode === 'navigate' && /\/ameeq\/?$/.test(url.pathname)) {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) { const copy=response.clone(); event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy))); }
      return response;
    }).catch(async () => (await caches.match(request, { ignoreSearch:true })) || new Response('Ameeq offline: open this page once while connected first.',{status:503,headers:{'Content-Type':'text/plain'}})));
  } else if (/\/assets\/[^/]+\.(js|css|woff2?)$/.test(url.pathname)) {
    event.respondWith(caches.open(CACHE).then(async cache => {
      const saved=await cache.match(request); if(saved)return saved;
      const response=await fetch(request);if(response.ok)await cache.put(request,response.clone());return response;
    }));
  }
});
