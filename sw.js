const CACHE_NAME = 'collectpro-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/harvest.html',
  '/archive.html',
  '/admin.html',
  '/login.html',
  '/my-subscription.html',
  '/payment.html',
  '/subscriptions.html',
  '/style.css',
  '/sidebar.css',
  '/login.css',
  '/admin.css',
  '/my-subscription.css',
  '/payment.css',
  '/subscriptions.css',
  '/script.js',
  '/sidebar.js',
  '/login.js',
  '/admin.js',
  '/my-subscription.js',
  '/payment.js',
  '/subscriptions.js',
  '/logo-momkn.png',
  '/logo-archive.png',
  '/logo-tick.png',
  '/manifest.json'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});