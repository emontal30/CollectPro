const CACHE_VERSION = 'v1.0.1';
const CACHE_NAME = `collectpro-${CACHE_VERSION}`;
const STATIC_CACHE = 'collectpro-static-v1';
const DYNAMIC_CACHE = 'collectpro-dynamic-v1';

const STATIC_ASSETS = [
  '/',
  'index.html',
  'manifest.json',
  'public/logoapp.png',
  'public/logo-momkn.png'
];

const API_ENDPOINTS = [
  '/api/'
];

// Install event - cache static assets
self.addEventListener('install', function(event) {
  console.log('Service Worker: Installing...');
  console.log('🔍 Debug - STATIC_ASSETS:', STATIC_ASSETS);

  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(function(cache) {
        console.log('Service Worker: Caching static assets');
        console.log('🔍 Debug - Cache name:', STATIC_CACHE);

        // Check each asset before caching
        return Promise.all(STATIC_ASSETS.map(async (asset) => {
          try {
            console.log('🔍 Debug - Checking asset:', asset);
            const response = await fetch(asset);
            console.log('✅ Asset available:', asset, response.status);
            return response;
          } catch (error) {
            console.log('❌ Asset not available:', asset, error);
            throw error;
          }
        })).then(responses => {
          console.log('🔍 Debug - All assets checked, adding to cache');
          return cache.addAll(STATIC_ASSETS);
        });
      })
    ])
  );

  // Force activation of new service worker
  self.skipWaiting();
});

// Activate event - cleanup old caches
self.addEventListener('activate', function(event) {
  console.log('Service Worker: Activating...');

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(function(cacheNames) {
        return Promise.all(
          cacheNames.map(function(cacheName) {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all pages
      self.clients.claim()
    ])
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', function(event) {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  event.respondWith(
    cacheFirst(request)
      .catch(() => networkFirst(request))
      .catch(() => offlineFallback(request))
  );
});

// Cache first strategy for static assets
async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    throw error;
  }
}

// Network first strategy for dynamic content
async function networkFirst(request) {
  const cache = await caches.open(DYNAMIC_CACHE);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

// Offline fallback
function offlineFallback(request) {
  if (request.destination === 'document') {
    return caches.match('./index.html');
  }
  return new Response('Offline content not available', {
    status: 503,
    statusText: 'Service Unavailable'
  });
}

// Background sync for offline actions
self.addEventListener('sync', function(event) {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    // Handle offline actions when back online
    console.log('Service Worker: Background sync triggered');
    // Add your background sync logic here
  } catch (error) {
    console.error('Service Worker: Background sync failed:', error);
  }
}