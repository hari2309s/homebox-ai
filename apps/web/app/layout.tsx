import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "Homebox AI — Know what you own, and where it is.",
  description: "AI-native home inventory",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#f7deae",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Rendered directly, not just via `metadata`, so it doesn't blank out (browsers then show the URL) between dynamic-route navigations. */}
        <title>Homebox AI — Know what you own, and where it is.</title>
      </head>
      <body>{children}</body>
    </html>
  );
}
