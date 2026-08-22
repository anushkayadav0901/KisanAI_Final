/**
 * sw.js -- Kisan AI service worker
 *
 * Written by hand rather than generated, because what gets cached and what
 * does not is a product decision here, not a build detail.
 *
 * The user is a farmer on a 2G connection in a village with intermittent
 * coverage. The app has to open when the network does not, advisories already
 * received have to stay readable, and a diagnosis captured with no signal must
 * not be lost.
 *
 * Strategy per request type:
 *   app shell (HTML/JS/CSS)  cache-first, refreshed in the background
 *   /v1 open-data API        stale-while-revalidate -- a day-old outbreak map
 *                            beats a spinner, and it is stamped with its age
 *   AI inference (/api/ai)   never cached; a stale diagnosis is worse than none
 *   images                   cache-first with a hard cap
 */

const VERSION = "kisan-v1";
const SHELL_CACHE = `${VERSION}-shell`;
const DATA_CACHE = `${VERSION}-data`;
const IMAGE_CACHE = `${VERSION}-img`;

const MAX_IMAGES = 60;

/** The minimum needed to render something useful with no network at all. */
const SHELL_ASSETS = ["/", "/index.html", "/offline.html"];

// -- Install / activate --------------------------------------------------------

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      // Individual failures must not abort the install, so each asset is
      // requested on its own rather than through addAll.
      .then((cache) =>
        Promise.allSettled(SHELL_ASSETS.map((url) => cache.add(url))),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !k.startsWith(VERSION))
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// -- Helpers -------------------------------------------------------------------

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  await Promise.all(keys.slice(0, keys.length - maxEntries).map((k) => cache.delete(k)));
}

/**
 * Stale-while-revalidate for the open-data API.
 *
 * The cached copy is served immediately and stamped with the time it was
 * stored, so the UI can tell the officer "this is 3 hours old" instead of
 * silently presenting stale numbers as live.
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DATA_CACHE);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        const body = await response.clone().blob();
        const headers = new Headers(response.headers);
        headers.set("X-Cached-At", new Date().toISOString());
        await cache.put(request, new Response(body, { status: 200, headers }));
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    // Deliberately not awaited: the refresh continues in the background while
    // the user gets the cached copy immediately.
    void network;
    return cached;
  }

  const fresh = await network;
  if (fresh) return fresh;

  return new Response(
    JSON.stringify({
      error: "offline",
      message: "No cached copy of this data and the network is unavailable.",
    }),
    { status: 503, headers: { "Content-Type": "application/json" } },
  );
}

async function cacheFirst(request, cacheName, cap) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
      if (cap) trimCache(cacheName, cap);
    }
    return response;
  } catch {
    return cached ?? Response.error();
  }
}

// -- Fetch routing -------------------------------------------------------------

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Only handle our own origin; third-party scripts are left alone.
  if (url.origin !== self.location.origin) return;

  // AI inference is never served from cache -- a stale crop diagnosis could send
  // a farmer to spray the wrong thing.
  if (url.pathname.startsWith("/api/ai")) return;

  // Consent state is never cached either. Showing a farmer a stale copy of who
  // can read their data, after they revoked it, would be worse than showing
  // nothing at all.
  if (
    url.pathname.startsWith("/v1/consent") ||
    url.pathname.startsWith("/v1/data")
  ) {
    return;
  }

  // Open-data API: serve cached immediately, refresh behind it.
  if (url.pathname.startsWith("/v1/")) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (request.destination === "image") {
    event.respondWith(cacheFirst(request, IMAGE_CACHE, MAX_IMAGES));
    return;
  }

  // Navigations: network first so deploys land, falling back to the shell and
  // then to a dedicated offline page.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((c) => c.put("/index.html", copy));
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(SHELL_CACHE);
          return (
            (await cache.match("/index.html")) ??
            (await cache.match("/offline.html")) ??
            new Response("Offline", { status: 503 })
          );
        }),
    );
    return;
  }

  // Hashed build assets are immutable, so cache-first is safe.
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
  }
});

// -- Sync trigger --------------------------------------------------------------
// The page owns the queue (it needs IndexedDB and the API client); the worker
// simply tells every open tab that connectivity is back.

self.addEventListener("sync", (event) => {
  if (event.tag === "kisan-sync-diagnoses") {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((c) => c.postMessage({ type: "SYNC_QUEUE" }));
      }),
    );
  }
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
