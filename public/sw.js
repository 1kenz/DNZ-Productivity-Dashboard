// Minimal service worker -- installability only, no offline caching.
// The dashboard needs live data, so we deliberately do NOT cache
// responses here; this just satisfies the browser's "installable app"
// requirement (an active SW controlling the page).

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Pass-through fetch handler (required by some browsers for installability).
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
