const CACHE_NAME = 'imouse-v2.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/main.css',
  '/css/trackpad.css',
  '/css/launcher.css',
  '/css/keyboard.css',
  '/css/presentation.css',
  '/js/app.js',
  '/js/websocket.js',
  '/js/settings.js',
  '/js/trackpad.js',
  '/js/launcher.js',
  '/js/keyboard.js',
  '/js/presentation.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// インストール
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache opened');
        return cache.addAll(urlsToCache);
      })
  );
});

// フェッチ
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

// アクティベート
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
