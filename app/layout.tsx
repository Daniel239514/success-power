import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { hasSubscriberAccess } from "@/lib/access";
import BottomNav from "./bottom-nav";
import SwRegister from "./sw-register";
import TimezoneSync from "./timezone-sync";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Success Power",
  description: "Your daily dose of Success Power.",
  // iPhones ignore most of the manifest, so these Apple-only settings tell iOS
  // how to behave when the app is launched from the home screen.
  appleWebApp: {
    capable: true, // Allow opening full-screen (no Safari toolbar) on iPhone
    title: "Success Power", // The name shown under the icon on an iPhone
    statusBarStyle: "black-translucent", // Blend the top status bar into the black background
  },
};

// In Next.js 16 the theme color must live here, in `viewport` — NOT in `metadata`
// (the old spot is deprecated and would print a warning). This sets the color
// the OS uses to tint app UI around your page.
export const viewport: Viewport = {
  themeColor: "#c9a84c",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Decide whether the bottom nav should show a "Subscribe" tab. Only a
  // logged-in free user needs it — subscribers and logged-out visitors don't.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isSubscriber = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_status, current_period_end")
      .eq("id", user.id)
      .single();
    isSubscriber = hasSubscriberAccess(profile);
  }

  const showSubscribe = Boolean(user) && !isSubscriber;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <BottomNav showSubscribe={showSubscribe} />
        <SwRegister />
        <TimezoneSync />
      </body>
    </html>
  );
}
