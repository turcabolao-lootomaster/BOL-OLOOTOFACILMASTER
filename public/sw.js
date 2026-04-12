const CACHE_NAME = 'bolao-v1';

self.addEventListener('install', (event) => {
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

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
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
