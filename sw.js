
const CACHE_NAME = 'collectpro-cache-v1';
const urlsToCache = [
  '/',
  'index.html',
  'dashboard.html',
  'harvest.html',
  'archive.html',
  'subscriptions.html',
  'my-subscription.html',
  'admin.html',
  'payment.html',
  'style.css',
  'index.css',
  'sidebar.css',
  'admin.css',
  'subscriptions.css',
  'my-subscription.css',
  'payment.css',
  'script.js',
  'index.js',
  'sidebar.js',
  'admin.js',
  'subscriptions.js',
  'my-subscription.js',
  'payment.js',
  'supabase-client.js',
  'site.webmanifest',
  'logo-momkn.png',
  'logo-tick.png',
  'apple-touch-icon.png',
  'favicon.ico',
  'favicon.svg',
  'favicon-96x96.png',
  'web-app-manifest-192x192.png',
  'web-app-manifest-512x512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

self.addEventListener('install', event => {
  // Perform install steps
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
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
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
