// service-worker.js - Complete Version
const CACHE_NAME = "syla-cache-v1";
const OFFLINE_HTML = "/index.html"; // fallback
const NETWORK_TIMEOUT_MS = 5000;

// Assets to pre-cache on install
const PRECACHE_ASSETS = [
  "/",
  "/index.html",
];

// ============================================================================
// INSTALL EVENT - Pre-cache essential assets
// ============================================================================
self.addEventListener("install", (event) => {
  console.log("[ServiceWorker] Install event");
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[ServiceWorker] Pre-caching offline page");
      return cache.addAll(PRECACHE_ASSETS).catch((error) => {
        console.error("[ServiceWorker] Pre-cache failed:", error);
        // Don't fail installation if pre-cache fails
      });
    })
  );
  
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// ============================================================================
// ACTIVATE EVENT - Clean up old caches
// ============================================================================
self.addEventListener("activate", (event) => {
  console.log("[ServiceWorker] Activate event");
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            // Delete old cache versions
            return cacheName !== CACHE_NAME;
          })
          .map((cacheName) => {
            console.log("[ServiceWorker] Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );
  
  // Take control of all pages immediately
  return self.clients.claim();
});

// ============================================================================
// FETCH EVENT - Network-first strategy with intelligent fallbacks
// ============================================================================
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // ============================================================================
  // Strategy 1: API REQUESTS - Always go to network, never cache
  // ============================================================================
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Return successful API response
          return response;
        })
        .catch((error) => {
          console.error("[ServiceWorker] API fetch failed:", error);
          
          // Return appropriate error response based on request method
          if (request.method === "POST" || request.method === "PUT" || request.method === "DELETE") {
            return new Response(
              JSON.stringify({ 
                error: "Network error contacting API",
                offline: true,
                message: "You appear to be offline. Please check your connection."
              }), 
              {
                headers: { "Content-Type": "application/json" },
                status: 503,
              }
            );
          }
          
          // For GET requests, try to return offline page
          return caches.match(OFFLINE_HTML).then((cachedResponse) => {
            return cachedResponse || new Response(
              JSON.stringify({ error: "Offline" }), 
              {
                headers: { "Content-Type": "application/json" },
                status: 503,
              }
            );
          });
        })
    );
    return;
  }

  // ============================================================================
  // Strategy 2: STATIC ASSETS - Network-first with cache fallback
  // ============================================================================
  if (
    url.pathname.startsWith("/assets/") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".woff") ||
    url.pathname.endsWith(".woff2")
  ) {
    event.respondWith(
      networkFirstWithTimeout(request, NETWORK_TIMEOUT_MS)
    );
    return;
  }

  // ============================================================================
  // Strategy 3: NAVIGATION REQUESTS - Network-first with offline fallback
  // ============================================================================
  if (request.mode === "navigate" || request.headers.get("accept").includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache successful navigation responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone).catch(() => {
                console.warn("[ServiceWorker] Failed to cache navigation response");
              });
            });
          }
          return response;
        })
        .catch(() => {
          console.log("[ServiceWorker] Navigation request failed, serving offline page");
          // Serve cached version or offline page
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || caches.match(OFFLINE_HTML);
          });
        })
    );
    return;
  }

  // ============================================================================
  // Strategy 4: ALL OTHER REQUESTS - Network-first with cache fallback
  // ============================================================================
  event.respondWith(
    networkFirstWithTimeout(request, NETWORK_TIMEOUT_MS)
  );
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Network-first strategy with timeout and cache fallback
 */
async function networkFirstWithTimeout(request, timeout) {
  try {
    // Race between network request and timeout
    const networkPromise = fetch(request);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Network timeout")), timeout);
    });

    const response = await Promise.race([networkPromise, timeoutPromise]);

    // Cache successful GET responses
    if (request.method === "GET" && response && response.status === 200) {
      const responseClone = response.clone();
      caches.open(CACHE_NAME).then((cache) => {
        cache.put(request, responseClone).catch(() => {
          console.warn("[ServiceWorker] Failed to cache response");
        });
      });
    }

    return response;
  } catch (error) {
    console.log("[ServiceWorker] Network request failed, trying cache:", error.message);
    
    // Try to serve from cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log("[ServiceWorker] Serving from cache:", request.url);
      return cachedResponse;
    }

    // If it's a navigation request, serve offline page
    if (request.mode === "navigate") {
      const offlinePage = await caches.match(OFFLINE_HTML);
      if (offlinePage) {
        return offlinePage;
      }
    }

    // Last resort: return error response
    return new Response("Offline", { 
      status: 503, 
      statusText: "Service Unavailable",
      headers: { "Content-Type": "text/plain" }
    });
  }
}

// ============================================================================
// MESSAGE HANDLER - For communication with clients
// ============================================================================
self.addEventListener("message", (event) => {
  console.log("[ServiceWorker] Message received:", event.data);

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data && event.data.type === "CLEAR_CACHE") {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            return caches.delete(cacheName);
          })
        );
      }).then(() => {
        event.ports[0].postMessage({ success: true });
      })
    );
  }

  if (event.data && event.data.type === "GET_VERSION") {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// ============================================================================
// BACKGROUND SYNC (Optional - for offline form submissions)
// ============================================================================
self.addEventListener("sync", (event) => {
  console.log("[ServiceWorker] Sync event:", event.tag);
  
  if (event.tag === "sync-data") {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  // Implement your sync logic here
  console.log("[ServiceWorker] Syncing data...");
}

// ============================================================================
// PUSH NOTIFICATIONS (Optional - for push notifications)
// ============================================================================
self.addEventListener("push", (event) => {
  console.log("[ServiceWorker] Push notification received");
  
  const options = {
    body: event.data ? event.data.text() : "New notification",
    icon: "/icon-192x192.png",
    badge: "/badge-72x72.png",
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: "explore",
        title: "Open App"
      },
      {
        action: "close",
        title: "Close"
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification("Syla Analytics", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  console.log("[ServiceWorker] Notification clicked:", event.action);
  
  event.notification.close();

  if (event.action === "explore") {
    event.waitUntil(
      clients.openWindow("/")
    );
  }
});

console.log("[ServiceWorker] Script loaded successfully");
