"use client";

import { useEffect } from "react";

// This is a tiny browser-side helper. The "use client" line at the top means
// this code runs in the visitor's browser (not on the server). When the page
// loads, it asks the browser to register our service worker (public/sw.js).
// It draws nothing on screen — it just does that one background job.
export default function SwRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        // If registration fails, log it so we can see why — but don't crash the page.
        console.error("Service worker registration failed:", error);
      });
    }
  }, []);

  return null;
}
