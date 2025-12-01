// -------------------------------
// JAPAN ROUTE FINDER - SERVICE WORKER
// Optimized caching for PWA + offline support
// -------------------------------

const CACHE_STATIC = "jrf-static-v1";
const CACHE_DYNAMIC = "jrf-dynamic-v1";

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/style.css",
  "/script.js",
  "/manifest.json",
  "/fallback-offline.html"
];

// -------------------------------
// INSTALL - Cache app shell
// -------------------------------
self.addEventListener("install", event => {
  console.log("[SW] Installing...");

  event.waitUntil(
    caches.open(CACHE_STATIC).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );

  self.skipWaiting();
});

// -------------------------------
// ACTIVATE - Clean old caches
// -------------------------------
self.addEventListener("activate", event => {
  console.log("[SW] Activating...");

  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_STATIC && key !== CACHE_DYNAMIC) {
            console.log("[SW] Deleting old cache:", key);
            return caches.delete(key);
          }
        })
      )
    )
  );

  self.clients.claim();
});

// -------------------------------
// FETCH - Smart caching strategy
// -------------------------------
self.addEventListener("fetch", event => {

  const request = event.request;

  // Don't cache Google Maps / APIs (they break offline)
  const blockList = [
    "googleapis.com",
    "gstatic.com",
    "maps.googleapis.com",
    "maps.gstatic.com"
  ];

  if (blockList.some(domain => request.url.includes(domain))) {
    return event.respondWith(fetch(request));
  }

  // HTML pages → Network first, offline fallback
  if (request.headers.get("accept")?.includes("text/html")) {
    return event.respondWith(
      fetch(request)
        .then(response => {
          cacheDynamic(request, response.clone());
          return response;
        })
        .catch(() => caches.match(request).then(res => res || caches.match("/fallback-offline.html")))
    );
  }

  // Static assets (CSS, JS, images) → Cache first
  if (
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "image"
  ) {
    return event.respondWith(
      caches.match(request).then(cached => {
        return (
          cached ||
          fetch(request).then(response => {
            cacheDynamic(request, response.clone());
            return response;
          })
        );
      })
    );
  }

  // Default: network with dynamic cache fallback
  return event.respondWith(
    fetch(request)
      .then(response => {
        cacheDynamic(request, response.clone());
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// -------------------------------
// Helper: Dynamic caching
// -------------------------------
function cacheDynamic(request, response) {
  if (!response || !response.ok) return;

  caches.open(CACHE_DYNAMIC).then(cache => {
    cache.put(request, response);
  });
}