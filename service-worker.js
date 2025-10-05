// service-worker.js
const BASE = '/<REPO>/';        // <-- '/<REPO>/' på GitHub Pages, annars '/'
const CACHE_NAME = 'savedit-v10'; // bumpa version vid varje deploy

// Lista det du vill förladda i cachen:
const PRECACHE = [
  `${BASE}`,
  `${BASE}index.html`,
  `${BASE}manifest.webmanifest`,
  `${BASE}icons/icon-192.png`,
  `${BASE}icons/icon-512.png`,
  // lägg till ev. bundlade filer, t.ex. `${BASE}assets/app.abcd1234.js`
];

// Install – förladda viktiga filer
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting(); // hoppa till den nya versionen snabbare
});

// Activate – rensa gamla cacher
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// Hjälp-funktioner
const isSameOrigin = (url) => {
  try { return new URL(url, self.location.origin).origin === self.location.origin; }
  catch { return false; }
};

// Fetch – network-first för navigering (HTML), cache-first för övriga
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Hantera bara GET
  if (req.method !== 'GET') return;

  // Begränsa scope till vårt BASE-path och same-origin
  if (!isSameOrigin(url) || !url.pathname.startsWith(BASE)) return;

  // Navigationsförfrågningar (SPA-stöd + offline-fallback)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() =>
          // fallbacka till vår cache:ad index.html
          caches.match(`${BASE}index.html`)
        )
    );
    return;
  }

  // Övriga GET: cache-first, annars nätverk -> cache
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        // Lagra bara OK-responser (undvik 404/opaques)
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match(`${BASE}index.html`)); // sista fallback
    })
  );
});

