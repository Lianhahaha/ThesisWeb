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
const VERSION = "tw-v3";
const PAGES = `${VERSION}-pages`;
const ASSETS = `${VERSION}-assets`;
/** Opened offline when the page asked for was never visited. */
const FALLBACK = "/offline.html";

/**
 * Pages that hold one student's own data. They are never written to Cache
 * Storage: these computers are shared, and a cached library, settings page or
 * search result (the query is in the URL) would outlive the session.
 */
const PRIVATE = [/^\/library(\/|$)/, /^\/settings(\/|$)/, /^\/shared\//, /^\/paper\//, /^\/login(\/|$)/, /^\/forgot-password(\/|$)/, /^\/search(\/|$)/];
const isPrivate = (pathname) => PRIVATE.some((re) => re.test(pathname));

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PAGES).then((c) => c.add(FALLBACK)).then(() => self.skipWaiting())
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

  // Next.js prefetches and client navigations carry ?_rsc (and Pages Router
  // uses /_next/data). They are tied to one build; caching one and then
  // deploying again makes the client render an old tree against new chunks.
  if (url.searchParams.has("_rsc") || url.pathname.startsWith("/_next/data/")) return;

  if (req.mode === "navigate") {
    // Private pages: always the network, never the cache. Offline shows the
    // generic fallback instead of someone else's saved page.
    if (isPrivate(url.pathname)) {
      event.respondWith(
        fetch(req).catch(async () => {
          const cache = await caches.open(PAGES);
          const hit = await cache.match(FALLBACK);
          if (hit) return hit;
          return new Response("You are offline.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        })
      );
      return;
    }

    // Public pages: network first, last copy kept. Key on the full path, not
    // just the pathname, so two URLs never overwrite each other.
    const cacheKey = `${url.pathname}${url.search}`;
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(PAGES).then((c) => c.put(cacheKey, copy));
          }
          return res;
        })
        .catch(async () => {
          const cache = await caches.open(PAGES);
          for (const key of [cacheKey, FALLBACK]) {
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
        try {
          const res = await fetch(req);
          if (res.ok) cache.put(req, res.clone());
          return res;
        } catch {
          // respondWith must always receive a Response, never undefined.
          return new Response("", { status: 504, statusText: "Gateway Timeout" });
        }
      })
    );
    return;
  }

  event.respondWith(
    caches.open(ASSETS).then(async (cache) => {
      const hit = await cache.match(req);
      if (hit) {
        // Refresh the cached copy in the background, but answer from cache.
        fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone());
          })
          .catch(() => {});
        return hit;
      }
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch {
        return new Response("", { status: 504, statusText: "Gateway Timeout" });
      }
    })
  );
});
