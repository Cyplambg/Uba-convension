const CACHE = "zouane-v1";
const ASSETS = ["/", "/auth", "/assets/"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE).then((cache) => {
          if (request.url.startsWith(self.location.origin)) {
            cache.put(request, clone);
          }
        });
        return response;
      })
      .catch(() => caches.match(request).then((cached) => {
        return cached || caches.match("/");
      }))
  );
});
