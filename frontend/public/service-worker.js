/* eslint-disable no-restricted-globals */

const CACHE_NAME = "syla-pwa-cache-v1";
const urlsToCache = [
  "/",
  "/manifest.json",
  "/favicon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) return caches.delete(name);
        })
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Bypass backend API calls
  if (url.pathname.includes("/upload") || url.origin === "https://syla-backend.onrender.com") {
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache other requests
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => cachedResponse || fetch(event.request))
  );
});
