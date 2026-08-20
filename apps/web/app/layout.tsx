import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "Homebox AI — Know what you own, and where it is.",
  description: "AI-native home inventory",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7deae" },
    { media: "(prefers-color-scheme: dark)", color: "#2c2117" },
  ],
};

// Sets `data-theme` before React hydrates, straight from localStorage —
// otherwise an explicit dark/light choice would flash the wrong theme for a
// frame on every load. "system" needs no entry here at all: globals.css's
// `prefers-color-scheme` media query handles it with zero JS. Duplicates
// THEME_STORAGE_KEY from lib/theme.ts (kept in sync by hand) since this runs
// before any app bundle — including that module — is loaded.
const themeInitScript = `
(function () {
  try {
    var theme = localStorage.getItem("homebox-ai-theme");
    if (theme === "light" || theme === "dark") {
      document.documentElement.setAttribute("data-theme", theme);
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Rendered directly, not just via `metadata`, so it doesn't blank out (browsers then show the URL) between dynamic-route navigations. */}
        <title>Homebox AI — Know what you own, and where it is.</title>
        {/* Static, non-user-controlled script; must run inline and synchronously before paint. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
