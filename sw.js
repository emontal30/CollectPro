/**
 * Service Worker for CollectPro PWA
 * Handles caching, offline functionality, and app updates
 */

const CACHE_NAME = 'collectpro-v2.8.1';
const STATIC_CACHE = 'collectpro-static-v2.8.1';
const DYNAMIC_CACHE = 'collectpro-dynamic-v2.8.1';

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
  '/manifest.json',
  '/style.css',
  '/index.css',
  '/sidebar.css',
  '/admin.css',
  '/src/main.js',
  '/src/install-prompt.js',
  '/src/notifications.js',
  '/manifest/icon-512x512.png',
  '/manifest/icon-192x192.png',
  '/manifest/icon-144x144.png',
  '/manifest/icon-96x96.png',
  '/manifest/icon-72x72.png',
  '/manifest/icon-48x48.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('📦 Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('✅ Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker activated');
        return self.clients.claim();
      })
      .catch((error) => {
        console.error('❌ Failed to activate service worker:', error);
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip external requests (APIs, CDNs, etc.)
  if (url.origin !== self.location.origin) {
    return;
  }
  
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        // Serve from cache if available
        if (cachedResponse) {
          console.log('📦 Serving from cache:', request.url);
          return cachedResponse;
        }
        
        // Otherwise fetch from network
        return fetch(request)
          .then((networkResponse) => {
            // Don't cache non-successful responses
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            
            // Clone the response since it can only be consumed once
            const responseToCache = networkResponse.clone();
            
            // Cache dynamic content
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                console.log('💾 Caching dynamic content:', request.url);
                cache.put(request, responseToCache);
              })
              .catch((error) => {
                console.error('❌ Failed to cache dynamic content:', error);
              });
            
            return networkResponse;
          })
          .catch((error) => {
            console.error('❌ Network request failed:', error);
            
            // Try to serve from cache as fallback
            return caches.match(request)
              .then((fallbackResponse) => {
                if (fallbackResponse) {
                  console.log('🔄 Serving from cache as fallback:', request.url);
                  return fallbackResponse;
                }
                
                // Return offline page for HTML requests
                if (request.headers.get('accept')?.includes('text/html')) {
                  return caches.match('/index.html');
                }
                
                // Return error for other requests
                return new Response('Offline', { 
                  status: 503, 
                  statusText: 'Service Unavailable' 
                });
              });
          });
      })
      .catch((error) => {
        console.error('❌ Fetch handler error:', error);
        return new Response('Service Worker Error', { 
          status: 500, 
          statusText: 'Internal Server Error' 
        });
      })
  );
});

// Push event - handle push notifications
self.addEventListener('push', (event) => {
  console.log('📬 Push message received');
  
  const options = {
    body: event.data ? event.data.text() : 'New notification from CollectPro',
    icon: '/manifest/icon-192x192.png',
    badge: '/manifest/icon-96x96.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Open App',
        icon: '/manifest/icon-96x96.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/manifest/icon-96x96.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('CollectPro', options)
      .then(() => {
        console.log('✅ Push notification displayed');
      })
      .catch((error) => {
        console.error('❌ Failed to show push notification:', error);
      })
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
        .then(() => {
          console.log('✅ App opened from notification');
        })
        .catch((error) => {
          console.error('❌ Failed to open app from notification:', error);
        })
    );
  }
});

// Background sync event
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync event:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle background sync logic here
      console.log('✅ Background sync completed')
    );
  }
});

// Periodic background sync
self.addEventListener('periodicsync', (event) => {
  console.log('⏰ Periodic background sync event:', event.tag);
  
  if (event.tag === 'periodic-sync') {
    event.waitUntil(
      // Handle periodic sync logic here
      console.log('✅ Periodic background sync completed')
    );
  }
});

// Message event for communication with main app
self.addEventListener('message', (event) => {
  console.log('💬 Message received from main app:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    console.log('⏭️ Service Worker skipped waiting');
  }
});

// Cleanup old caches periodically
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEANUP_CACHES') {
    event.waitUntil(
      caches.keys()
        .then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => {
              if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                return caches.delete(cacheName);
              }
            })
          );
        })
        .then(() => {
          console.log('🗑️ Old caches cleaned up');
          event.ports[0].postMessage({ type: 'CLEANUP_COMPLETE' });
        })
    );
  }
});

console.log('🚀 Service Worker loaded successfully');
