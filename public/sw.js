const CACHE_NAME = 'bolao-v3'; // Incremented version

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force the waiting service worker to become the active service worker
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/manifest.json'
      ]);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(), // Become the controller for all clients immediately
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

self.addEventListener('fetch', (event) => {
  // Strategy: Network First, falling back to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If it's a valid response, clone it and put it in cache
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// Listener para mensagens (como atualizar a bolinha/badge)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_BADGE') {
    if (navigator.setAppBadge) {
      navigator.setAppBadge(event.data.count).catch((error) => {
        console.error('Erro ao definir badge:', error);
      });
    }
  } else if (event.data && event.data.type === 'CLEAR_BADGE') {
    if (navigator.clearAppBadge) {
      navigator.clearAppBadge().catch((error) => {
        console.error('Erro ao limpar badge:', error);
      });
    }
  }
});
