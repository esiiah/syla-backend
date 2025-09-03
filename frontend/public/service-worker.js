// service-worker.js
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // ✅ Bypass all backend API calls
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

// Optional: instant updates after deploy
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(clients.claim());
});
