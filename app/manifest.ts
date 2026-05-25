import type { MetadataRoute } from "next";

// This file IS the manifest. Next.js 16 turns it into a file the browser can
// read at /manifest.webmanifest, and automatically links it in every page.
// The manifest tells a phone how to show your site as an installed app:
// its name, the icons, the colors, and how it should open.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Success Power", // Full name (shown on the splash screen / install dialog)
    short_name: "SP", // Short name (shown under the icon, where space is tight)
    description: "Your daily dose of Success Power.",
    start_url: "/", // Which page opens when the app icon is tapped
    display: "standalone", // Open full-screen like an app (no browser address bar)
    background_color: "#0a0a0a", // Splash-screen background while the app loads
    theme_color: "#c9a84c", // App's accent color (used by the OS app UI)
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
