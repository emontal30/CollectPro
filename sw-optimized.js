/**
 * Service Worker محسن لتطبيق CollectPro
 * يحسن الأداء والتخزين المؤقت
 */

const CACHE_NAME = 'collectpro-v1.0.0';
const STATIC_CACHE = 'collectpro-static-v1.0.0';
const DYNAMIC_CACHE = 'collectpro-dynamic-v1.0.0';

// الملفات الثابتة التي يجب تخزينها مؤقتاً
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/style.css',
  '/sidebar.css',
  '/script.js',
  '/auth.js',
  '/sidebar.js',
  '/performance-optimizer.js',
  '/seo-optimizer.js',
  '/spa-router.js',
  '/lazy-components.js',
  '/state-manager.js',
  '/env.js',
  '/config.js',
  '/supabase-loader.js',
  '/public/logoapp.png',
  '/public/logo-tick.png',
  '/public/logo-momkn.png',
  '/public/logo-archive.png'
];

// الملفات الخارجية للتخزين المؤقت
const EXTERNAL_RESOURCES = [
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// تهيئة Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker: تثبيت');

  event.waitUntil(
    Promise.all([
      // تخزين الملفات الثابتة مؤقتاً
      caches.open(STATIC_CACHE).then(cache => {
        console.log('Service Worker: تخزين الملفات الثابتة مؤقتاً');
        return cache.addAll(STATIC_ASSETS);
      }),

      // تخزين الموارد الخارجية مؤقتاً
      caches.open(STATIC_CACHE).then(cache => {
        console.log('Service Worker: تخزين الموارد الخارجية مؤقتاً');
        return cache.addAll(EXTERNAL_RESOURCES.map(url => new Request(url, { mode: 'cors' })));
      })
    ])
  );

  // تخطي الانتظار والتفعيل الفوري
  self.skipWaiting();
});

// تفعيل Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker: تفعيل');

  event.waitUntil(
    Promise.all([
      // مسح التخزين المؤقت القديم
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE)
            .map(cacheName => caches.delete(cacheName))
        );
      }),

      // التحكم في العملاء
      self.clients.claim()
    ])
  );
});

// معالجة الطلبات
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // تجاهل طلبات Chrome extensions
  if (url.protocol === 'chrome-extension:') return;

  // معالجة الطلبات حسب النوع
  if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request));
  } else if (isAPIRequest(request)) {
    event.respondWith(handleAPIRequest(request));
  } else if (isExternalResource(request)) {
    event.respondWith(handleExternalResource(request));
  } else {
    event.respondWith(handleDynamicContent(request));
  }
});

/**
 * التحقق من أن الطلب لملف ثابت
 */
function isStaticAsset(request) {
  const url = new URL(request.url);
  return STATIC_ASSETS.some(asset => url.pathname.endsWith(asset.split('?')[0]));
}

/**
 * التحقق من أن الطلب لـ API
 */
function isAPIRequest(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/') || url.hostname.includes('supabase');
}

/**
 * التحقق من أن الطلب لمورد خارجي
 */
function isExternalResource(request) {
  const url = new URL(request.url);
  return EXTERNAL_RESOURCES.some(resource => request.url.includes(resource));
}

/**
 * معالجة الملفات الثابتة
 */
async function handleStaticAsset(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, networkResponse.clone());

    return networkResponse;
  } catch (error) {
    console.error('خطأ في معالجة الملف الثابت:', error);
    return new Response('خطأ في الشبكة', { status: 503 });
  }
}

/**
 * معالجة طلبات API
 */
async function handleAPIRequest(request) {
  try {
    // استراتيجية Network First لـ API
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('خطأ في الشبكة، البحث في التخزين المؤقت');
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    return new Response(JSON.stringify({
      error: 'غير متصل بالإنترنت',
      offline: true
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * معالجة الموارد الخارجية
 */
async function handleExternalResource(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request, {
      mode: 'cors',
      credentials: 'omit'
    });

    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('خطأ في تحميل المورد الخارجي:', error);
    return new Response('خطأ في الشبكة', { status: 503 });
  }
}

/**
 * معالجة المحتوى الديناميكي
 */
async function handleDynamicContent(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    // للصفحات، جرب إرجاع الصفحة الرئيسية من التخزين المؤقت
    if (request.destination === 'document') {
      const cachedIndex = await caches.match('/index.html');
      if (cachedIndex) {
        return cachedIndex;
      }
    }

    return new Response('غير متصل بالإنترنت', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

/**
 * معالجة الرسائل من الصفحة الرئيسية
 */
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CLEAR_CACHE':
      clearAllCaches();
      break;

    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_NAME });
      break;
  }
});

/**
 * مسح جميع التخزين المؤقت
 */
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
  console.log('تم مسح جميع التخزين المؤقت');
}

/**
 * معالجة الأخطاء العامة
 */
self.addEventListener('error', (event) => {
  console.error('Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker unhandled promise rejection:', event.reason);
});