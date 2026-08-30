/* Sideline service worker — cache the app shell so it opens with no signal. */
const CACHE = "sideline-v31";
const SHELL = [
  "./", "./index.html", "./app.js", "./config.js", "./manifest.json",
  "./vendor/react.production.min.js",
  "./vendor/react-dom.production.min.js",
  "./vendor/supabase.min.js",
  "./icons/icon-192.png", "./icons/icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  // Never cache Supabase traffic — it must always hit the network.
  if (url.hostname.endsWith("supabase.co")) return;

  // App shell: serve from cache first, refresh in the background.
  if (url.origin === self.location.origin) {
    e.respondWith(caches.match(e.request).then((hit) => {
      const net = fetch(e.request).then((res) => {
        if (res && res.ok) caches.open(CACHE).then((c) => c.put(e.request, res.clone()));
        return res;
      }).catch(() => hit);
      return hit || net;
    }));
    return;
  }

  // Fonts and anything else: cache after first success, fall back to cache offline.
  e.respondWith(fetch(e.request).then((res) => {
    if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match(e.request)));
});
