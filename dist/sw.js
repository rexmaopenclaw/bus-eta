// Bus ETA PWA service worker — cache static assets for offline, never cache API/ETA data
const CACHE = 'buseta-v3';
const CORE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Never cache API responses (ETA/auth data must stay live)
  if (url.pathname.startsWith('/api/')) return;

  // Never cache version.json — version check must always be live
  if (url.pathname === '/version.json') return;

  // Cross-origin (ETA endpoints: rt.data.gov.hk, data.etabus.gov.hk):
  // passthrough — never cache, ETA must always be live
  if (url.origin !== self.location.origin) return;

  // Same-origin static: stale-while-revalidate
  e.respondWith(
    caches.match(e.request).then((hit) => {
      const fetched = fetch(e.request).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || fetched;
    })
  );
});
