// A minimal service worker.
//
// Right now its only job is to EXIST and be registered, because a browser
// requires a registered service worker before it will offer to "install" the
// app to a home screen. We are deliberately keeping it empty of features:
// no offline caching and no push notifications yet (those come in a later slice).

self.addEventListener("install", () => {
  // Don't wait around — make this worker take over as soon as it's installed.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Start controlling any already-open pages right away.
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // We are NOT caching anything yet, so we don't interfere with network
  // requests — the browser handles them as normal. We keep this empty listener
  // here only because some browsers look for a fetch handler before treating
  // the app as installable.
});
