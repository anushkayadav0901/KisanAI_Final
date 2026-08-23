const VERSION = "kisan-v1";
const SHELL_CACHE = `${VERSION}-shell`;
const DATA_CACHE = `${VERSION}-data`;
const IMAGE_CACHE = `${VERSION}-img`;

const MAX_IMAGES = 60;

const SHELL_ASSETS = ["/", "/index.html", "/offline.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
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

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  await Promise.all(keys.slice(0, keys.length - maxEntries).map((k) => cache.delete(k)));
}

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

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/api/ai")) return;

  if (
    url.pathname.startsWith("/v1/consent") ||
    url.pathname.startsWith("/v1/data")
  ) {
    return;
  }

  if (url.pathname.startsWith("/v1/")) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (request.destination === "image") {
    event.respondWith(cacheFirst(request, IMAGE_CACHE, MAX_IMAGES));
    return;
  }

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

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
  }
});

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
