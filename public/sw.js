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

// ── Slice 9: Web push ──────────────────────────────────────────────────────

// Fires when a push message arrives from the push service (Google/Apple/etc.),
// even if the app is closed. The message's data is in event.data; our server
// sends it as JSON like { "title": "...", "body": "...", "url": "/..." }.
self.addEventListener("push", (event) => {
  // Parse the payload. If anything is missing or it isn't JSON, fall back to
  // safe defaults so we still show *something* rather than throwing.
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    // Payload wasn't JSON — treat the raw text as the body.
    payload = { body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Success Power";
  const options = {
    body: payload.body || "",
    icon: "/android-chrome-192x192.png", // big icon shown in the notification
    badge: "/android-chrome-192x192.png", // small monochrome icon (Android status bar)
    // Stash the destination URL so the click handler below knows where to go.
    data: { url: payload.url || "/" },
  };

  // waitUntil keeps the service worker alive until the notification is shown.
  // Without it, the browser may kill the worker before showNotification finishes.
  event.waitUntil(self.registration.showNotification(title, options));
});

// Fires when the user taps the notification.
self.addEventListener("notificationclick", (event) => {
  event.notification.close(); // dismiss the banner

  const targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    // Look at every open window/tab belonging to this app.
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If the app is already open somewhere, focus it and send it to the URL.
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // Otherwise, open a brand-new window at the URL.
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
