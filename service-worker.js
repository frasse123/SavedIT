// service-worker.js
// Härled bas-stig från SW-scope (fungerar på root OCH /repo/)
const BASE = new URL(self.registration.scope).pathname.replace(/\/+$/, '/') || '/';
const CACHE_NAME = 'savedit-v15'; // bumpa

const PRECACHE = [
  `${BASE}`,                 // '/'
  `${BASE}index.html`,
  `${BASE}manifest.webmanifest`,
  `${BASE}icons/icon-192.png`,
  `${BASE}icons/icon-512.png`,
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    )
  );
  self.clients.claim();
});

const isSameOrigin = (url) => {
  try { return new URL(url, self.location.origin).origin === self.location.origin; }
  catch { return false; }
};

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== 'GET') return;
  if (!isSameOrigin(url) || !url.pathname.startsWith(BASE)) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => { caches.open(CACHE_NAME).then(c => c.put(req, res.clone())); return res; })
        .catch(() => caches.match(`${BASE}index.html`))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.status === 200 && (res.type === 'basic' || res.type === 'cors')) {
          caches.open(CACHE_NAME).then(c => c.put(req, res.clone()));
        }
        return res;
      }).catch(() => caches.match(`${BASE}index.html`));
    })
  );
});
