const CACHE_NAME = 'bedtime-story-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './pwa-192x192.png',
  './pwa-512x512.png',
  './favicon.svg'
];

// Install: Precache shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: Cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: Network-first falling back to cache
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Handle navigation requests (for SPA)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('./index.html');
      })
    );
    return;
  }

  // Standard asset fetching
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses for our own assets
        if (response.ok && url.origin === location.origin) {
          const cacheCopy = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, cacheCopy);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});