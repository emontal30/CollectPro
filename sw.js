/**
 * Service Worker for CollectPro PWA
 * Handles caching, offline functionality, and app updates
 */

const CACHE_NAME = 'collectpro-v1.2.0';
const STATIC_CACHE = 'collectpro-static-v1.2.0';
const DYNAMIC_CACHE = 'collectpro-dynamic-v1.2.0';

// Files to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/harvest.html',
  '/counter.html',
  '/archive.html',
  '/subscriptions.html',
  '/my-subscription.html',
  '/payment.html',
  '/admin.html',
  '/style.css',
  '/index.css',
  '/admin.css',
  '/counter-table.css',
  '/my-subscription.css',
  '/payment.css',
  '/subscriptions.css',
  '/sidebar.css',
  '/script.js',
  '/index.js',
  '/admin.js',
  '/counter.js',
  '/my-subscription.js',
  '/payment.js',
  '/subscriptions.js',
  '/sidebar.js',
  '/supabase-client.js',
  '/install-prompt.js',
  '/site.webmanifest',
  '/manifest.json',
  '/favicon.ico',
  '/favicon.svg',
  '/favicon-96x96.png',
  '/apple-touch-icon.png',
  '/logo-momkn.png',
  '/web-app-manifest-192x192.png',
  '/web-app-manifest-512x512.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('📱 Service Worker: Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('📱 Service Worker: Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('📱 Service Worker: Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('📱 Service Worker: Installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('📱 Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('📱 Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('📱 Service Worker: Activation complete');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and external requests
  if (event.request.method !== 'GET' ||
      !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Handle API requests differently
  if (event.request.url.includes('/rest/v1/') ||
      event.request.url.includes('supabase')) {
    // For API requests, try network first, then cache
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful API responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then((cache) => cache.put(event.request, responseClone));
          }
          return response;
        })
        .catch(() => {
          // Return cached API response if available
          return caches.match(event.request);
        })
    );
    return;
  }

  // For static assets, try cache first, then network
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request)
          .then((response) => {
            // Don't cache if not successful
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Cache the response
            const responseToCache = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch((error) => {
            console.error('📱 Service Worker: Fetch failed:', error);
            // Return offline fallback for HTML pages
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});