const CACHE_NAME = "gold-signal-v4-adfit";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css?v=20261019-stitch3",
  "./app.js?v=20261022-adfit1",
  "./adfit-config.js?v=20261022-adfit1",
  "./adfit.js?v=20261022-adfit1",
  "./adfit.css?v=20261022-adfit1",
  "./favicon.svg",
  "./manifest.webmanifest",
  "./privacy.html",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("gold-signal-") && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  // Advertising, measurement, fonts and all other third-party traffic bypass this worker.
  // In particular, a failed SDK request must never receive index.html as JavaScript.
  if (requestUrl.origin !== self.location.origin) return;

  if (requestUrl.pathname.endsWith("/data/market.json")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (!response.ok) throw new Error(`market data ${response.status}`);
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)));
          return response;
        })
        .catch(async () => (await caches.match(event.request)) || Response.error()),
    );
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(async () =>
      (await caches.match(event.request)) || (await caches.match("./index.html")) || Response.error()));
    return;
  }

  event.respondWith(caches.match(event.request).then((cached) =>
    cached || fetch(event.request).catch(() => Response.error())));
});
