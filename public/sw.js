self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  // A minimal fetch handler is required by Chromium to pass the PWA installability criteria.
  // We simply pass the request through. This is an "online-first" strategy suitable for an AI tool.
  e.respondWith(
    fetch(e.request).catch(() => {
      // Basic fallback
      return new Response('Network error or offline mode.', {
        status: 503,
        statusText: 'Service Unavailable'
      });
    })
  );
});
