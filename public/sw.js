/*
 * Thesisweb service worker: makes the installed app open without a
 * connection. Kept small and conservative:
 * - pages: network first, so a new deploy shows at once; the last copy of
 *   each visited page is kept for offline use;
 * - /_next/static files: cache first (their names change with every build);
 * - other same-origin files (icons, fonts): served from cache, refreshed in
 *   the background;
 * - /api and anything cross-origin (databases, Firebase): never cached.
 * Bump VERSION to drop every cached file after a breaking change.
 */
const VERSION = "tw-v1";
const PAGES = `${VERSION}-pages`;
const ASSETS = `${VERSION}-assets`;
/** Opened offline when the page asked for was never visited. */
const FALLBACK = ["/library", "/"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PAGES).then((c) => c.addAll(FALLBACK)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(PAGES).then((c) => c.put(url.pathname, copy));
          }
          return res;
        })
        .catch(async () => {
          const cache = await caches.open(PAGES);
          for (const key of [url.pathname, ...FALLBACK]) {
            const hit = await cache.match(key);
            if (hit) return hit;
          }
          return new Response("You are offline, and this page hasn't been opened on this device yet.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        })
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(ASSETS).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  event.respondWith(
    caches.open(ASSETS).then(async (cache) => {
      const hit = await cache.match(req);
      const refresh = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => hit);
      return hit || refresh;
    })
  );
});
