const CACHE_NAME = 'collectpro-static-v3';
const ASSETS = [
  './',
  './login.html',
  './index.html',
  './harvest.html',
  './archive.html',
  './style.css',
  './script.js',
  './auth.js',
  './logo-archive.png',
  './logo-momkn.png',
  './logo-tick.png',
  './manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Navigation requests: network-first, fallback to cache, then to login.html
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./login.html')))
    );
    return;
  }

  // Only handle GET
  if (req.method !== 'GET') return;

  // Bypass cross-origin requests (like CDNs) to avoid caching external scripts
  try {
    const url = new URL(req.url);
    if (url.origin !== self.location.origin) {
      return; // let the browser handle it normally
    }
  } catch {}

  // Same-origin assets: cache-first
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          return res;
        })
        .catch(() => cached);
    })
  );
});