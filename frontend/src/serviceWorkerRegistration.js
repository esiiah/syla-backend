// src/serviceWorkerRegistration.js
export function unregister() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
        console.log("[SW] ❌ Unregistered service worker:", registration.scope);
      }
    });
  }
}
