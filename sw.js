const CACHE_NAME = 'collectpro-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/harvest.html',
  '/archive.html',
  '/subscriptions.html',
  '/my-subscription.html',
  '/payment.html',
  '/admin.html',
  '/index.css',
  '/style.css',
  '/sidebar.css',
  '/admin.css',
  '/my-subscription.css',
  '/payment.css',
  '/subscriptions.css',
  '/index.js',
  '/script.js',
  '/sidebar.js',
  '/admin.js',
  '/my-subscription.js',
  '/payment.js',
  '/subscriptions.js',
  '/logoapp.png',
  '/logo-momkn.png',
  '/logo-archive.png',
  '/logo-tick.png',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

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

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
