const CACHE = "fresh-aquarius-shell-v2";
const SHELL = ["./","./index.html","./styles.css?v=2","./app.js?v=1","./manifest.webmanifest","./icon.svg","./banner-fresh-aquarius.webp"];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.pathname.endsWith("/fresh-aquarius.json")) {
    event.respondWith(fetch(req, {cache:"no-store"}));
    return;
  }

  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(cache => cache.put(req, copy));
      return res;
    }).catch(() => caches.match(req).then(hit => hit || caches.match("./index.html")))
  );
});