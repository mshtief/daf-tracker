/* Daf Tracker service worker.
   If you ever change index.html / manifest.json / icon.png, bump CACHE_VERSION
   (v1 -> v2) and re-upload BOTH files, then close and reopen the app twice. */

const CACHE_VERSION = 'v2';
const CACHE_NAME = 'daf-tracker-shell-' + CACHE_VERSION;

const CORE = [
  './',
  './index.html',
  './manifest.json',
  './icon.png'
];

const FONT_CSS = 'https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@400;500;700;900&display=swap';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE);
    // Fonts are best-effort: never let them block offline support.
    try { await cache.add(new Request(FONT_CSS, { mode: 'no-cors' })); } catch (e) {}
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

/* Cache-first: serve from cache, fall back to network (and remember what we
   fetched — this is how the font files end up available offline). */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || !req.url.startsWith('http')) return;

  event.respondWith((async () => {
    const cached = await caches.match(req, { ignoreSearch: req.mode === 'navigate' });
    if (cached) return cached;
    try {
      const resp = await fetch(req);
      if (resp && (resp.ok || resp.type === 'opaque')) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, resp.clone()).catch(() => {});
      }
      return resp;
    } catch (err) {
      if (req.mode === 'navigate') {
        const shell = await caches.match('./index.html');
        if (shell) return shell;
      }
      throw err;
    }
  })());
});
