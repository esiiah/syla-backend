// src/serviceWorkerRegistration.js

export function register() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      // Detect if we're behind a proxy by checking the pathname
      const currentPath = window.location.pathname;
      let swPath = "/service-worker.js";
      let scope = "/";
      
      // If pathname contains /proxy/ (code-server), adjust paths
      if (currentPath.includes("/proxy/")) {
        // Extract the proxy base path (e.g., /proxy/8000/)
        const proxyMatch = currentPath.match(/^(\/proxy\/\d+\/)/);
        if (proxyMatch) {
          const proxyBase = proxyMatch[1];
          swPath = `${proxyBase}service-worker.js`;
          scope = proxyBase;
        }
      }
      
      console.log("[SW] Registration attempt:");
      console.log("  - Current URL:", window.location.href);
      console.log("  - SW path:", swPath);
      console.log("  - Scope:", scope);

      navigator.serviceWorker
        .register(swPath, { scope: scope })
        .then((registration) => {
          console.log("[SW] ✅ Registered successfully");
          console.log("  - Scope:", registration.scope);
          console.log("  - Active:", registration.active ? "Yes" : "Installing...");
          
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            console.log("[SW] Update found");
            
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                console.log("[SW] New version available - refresh to update");
              }
            });
          });
        })
        .catch((error) => {
          console.error("[SW] ❌ Registration failed:", error);
          console.error("  - Tried path:", swPath);
          console.error("  - This is not critical - app will work without SW");
        });
    });
  } else {
    console.warn("[SW] Service Workers not supported in this browser");
  }
}

export function unregister() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
        console.log("[SW] Unregistered");
      })
      .catch((error) => {
        console.error("[SW] Unregister failed:", error.message);
      });
  }
}
