// Service worker for BrewSpot POS PWA
const CACHE_NAME = 'brewspot-pos-v1';

self.addEventListener('install', (event) => {
  // Activate immediately without waiting for old workers to stop
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Minimal fetch handler required for PWA installability criteria
self.addEventListener('fetch', (event) => {
  // Let browser handle normal network fetching
  // We can pass through, but having a fetch listener satisfies browser A2HS requirements
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    fetch(event.request).catch(async () => {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      return new Response('Offline', { status: 503, statusText: 'Offline' });
    })
  );
});
