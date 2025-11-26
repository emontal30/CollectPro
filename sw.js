/**
 * Service Worker for CollectPro PWA
 * Handles caching, offline functionality, and app updates
 */

// Version management - يتم تحديث هذا الرقم مع كل تحديث
const APP_VERSION = '2.8.5';
const CACHE_NAME = `collectpro-v${APP_VERSION}`;
const STATIC_CACHE = `collectpro-static-v${APP_VERSION}`;
const DYNAMIC_CACHE = `collectpro-dynamic-v${APP_VERSION}`;

// Files to cache immediately (core files only)
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
  '/site.webmanifest',
  '/install-prompt.js',
  '/sw.js',
  '/favicon.svg',
  '/favicon-96x96.png',
  '/favicon.ico',
  '/logo-momkn.png',
  '/manifest/icon-512x512.png',
  '/manifest/icon-192x192.png',
  '/ios/apple-touch-icon-120x120.png',
  '/ios/apple-touch-icon-152x152.png',
  '/ios/apple-touch-icon-167x167.png',
  '/ios/apple-touch-icon-180x180.png'
];

// Dynamic asset patterns for hashed files
const ASSET_PATTERNS = [
  /\.(css|js)$/,
  /\.(png|jpg|jpeg|gif|svg|ico|webp)$/,
  /\/assets\//
];

// Helper function to check if URL is an asset
function isAssetUrl(url) {
  return ASSET_PATTERNS.some(pattern => pattern.test(url));
}

// Install event - تخزين الملفات الأساسية
self.addEventListener('install', (event) => {
  console.log(`📦 Installing Service Worker v${APP_VERSION}`);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching static assets');
        return Promise.allSettled(
          STATIC_ASSETS.map(url => 
            cache.add(url).catch(err => {
              console.warn(`⚠️ Failed to cache ${url}:`, err);
            })
          )
        );
      })
      .then(() => {
        console.log('✅ Static assets cached successfully');
        // Force the waiting service worker to become the active service worker
        return self.skipWaiting();
      })
  );
});

// Activate event - تنظيف الكاش القديم
self.addEventListener('activate', (event) => {
  console.log(`🔄 Activating Service Worker v${APP_VERSION}`);
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE &&
                cacheName.startsWith('collectpro-')) {
              console.log(`🗑️ Deleting old cache: ${cacheName}`);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Old caches cleaned up');
        // Take control of all open pages
        return self.clients.claim();
      })
  );
});

// Fetch event - استراتيجيات التخزين المتقدمة
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-HTTP requests
  if (!request.url.startsWith('http')) {
    return;
  }

  // استراتيجية متقدمة للتحديثات التلقائية
  if (url.origin === self.location.origin) {
    // للملفات الثابتة: Cache First with Network Fallback
    if (STATIC_ASSETS.includes(url.pathname) || isAssetUrl(url.pathname)) {
      event.respondWith(
        caches.match(request)
          .then((cachedResponse) => {
            // إرسال النسخة المخزنة فوراً
            const fetchPromise = fetch(request)
              .then((networkResponse) => {
                // تحديث الكاش بالنسخة الجديدة
                if (networkResponse.ok) {
                  const responseClone = networkResponse.clone();
                  caches.open(CACHE_NAME).then((cache) => {
                    cache.put(request, responseClone);
                  });
                }
                return networkResponse;
              })
              .catch(() => {
                // إذا فشلت الشبكة، استخدم النسخة المخزنة
                return cachedResponse;
              });

            // إرجاع النسخة المخزنة فوراً مع تحديث في الخلفية
            return cachedResponse || fetchPromise;
          })
      );
      return;
    }

    // لصفحات HTML: Network First with Cache Fallback
    if (url.pathname.endsWith('.html') || url.pathname === '/') {
      event.respondWith(
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse.ok) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => {
            return caches.match(request);
          })
      );
      return;
    }
  }

  // للطلبات الخارجية (API): Network Only
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) {
    event.respondWith(fetch(request));
    return;
  }

  // للباقي: Cache First with Network Fallback
  event.respondWith(
    caches.match(request)
      .then((response) => {
        return response || fetch(request);
      })
  );
});

// Message event - للتحكم في التحديثات
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: APP_VERSION });
  }
});

// Push notification support (للمستقبل)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/manifest/icon-192x192.png',
      badge: '/favicon-96x96.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      },
      actions: [
        {
          action: 'explore',
          title: 'فتح التطبيق',
          icon: '/manifest/icon-192x192.png'
        },
        {
          action: 'close',
          title: 'إغلاق',
          icon: '/favicon-96x96.png'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
