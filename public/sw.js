const CACHE = "zouane-v2";
const ASSETS = ["/", "/auth", "/assets/"];

const downloads = new Map();
let downloadId = 0;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function base64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

self.addEventListener("message", (event) => {
  const msg = event.data;
  if (msg?.type === "CACHE_DOWNLOAD") {
    const token = `dl_${++downloadId}_${Date.now()}`;
    const bytes = base64ToBytes(msg.data);
    downloads.set(token, { data: bytes, filename: msg.filename, mime: msg.mime });
    setTimeout(() => downloads.delete(token), 60000);
    event.ports[0]?.postMessage({ type: "DOWNLOAD_READY", token });
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const match = url.pathname.match(/^\/__download\/([^/]+)\/(.+)$/);
  if (match) {
    const token = match[1];
    const entry = downloads.get(token);
    if (entry) {
      downloads.delete(token);
      event.respondWith(
        new Response(entry.data, {
          headers: {
            "Content-Type": entry.mime,
            "Content-Disposition": `attachment; filename="${entry.filename}"`,
            "Content-Length": String(entry.data.length),
          },
        })
      );
      return;
    }
    event.respondWith(new Response("Expired", { status: 410 }));
    return;
  }

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
      .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
  );
});
