// service-worker.js
const CACHE_NAME = "syla-cache-v1";
const OFFLINE_HTML = "/index.html"; // fallback
const NETWORK_TIMEOUT_MS = 5000;

// Always bypass /api/ requests and let them go to network
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Bypass API calls (allow them to go directly to the network)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(event.request).catch((err) => {
      // If network is down, return a JSON fallback for API requests
      if (event.request.method === "POST") {
        return new Response(JSON.stringify({ error: "Network error contacting API" }), {
          headers: { "Content-Type": "application/json" },
          status: 503,
        });
      }
      return caches.match(OFFLINE_HTML) || Response.error();
    }));
    return;
  }

  // For static assets and pages: network-first, fallback to cache
  event.respondWith(
    (async function () {
      try {
        const networkPromise = fetch(event.request);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("network timeout")), NETWORK_TIMEOUT_MS)
        );
        const response = await Promise.race([networkPromise, timeoutPromise]);

        // Put a copy in cache for offline use (only for GET responses)
        if (event.request.method === "GET" && response && response.status === 200) {
          const responseClone = response.clone();
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, responseClone).catch(() => {});
        }

        return response;
      } catch (err) {
        // fallback to cache
        const cached = await caches.match(event.request);
        if (cached) return cached;

        // fallback to index.html for navigation requests (SPA)
        if (event.request.mode === "navigate") {
          const indexCached = await caches.match(OFFLINE_HTML);
          if (indexCached) return indexCached;
        }

        return new Response("Offline", { status: 503, statusText: "Offline" });
      }
    })()
  );
});

self.addEventListener("install", (e) => {
  // optionally pre-cache index.html so offline fallback exists
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([OFFLINE_HTML]).catch(() => {
        // ignore failures (index might not exist in dev)
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  // cleanup old caches
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  clients.claim();
});
