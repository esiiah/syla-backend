// src/serviceWorkerRegistration.js

export function register() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register(`/service-worker.js`)
      .then((registration) => {
        console.log("ServiceWorker registered:", registration);
      })
      .catch((error) => {
        console.error("ServiceWorker registration failed:", error);
      });
  }
}
