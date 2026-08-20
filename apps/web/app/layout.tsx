import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "Homebox AI — Know what you own, and where it is.",
  description: "AI-native home inventory",
  manifest: "/manifest.webmanifest",
};

// Single static default (light) — the inline script below corrects this
// synchronously, before paint, for dark/system-dark, so there's exactly one
// theme-color meta tag in the document rather than the two OS-media-query
// ones Next's array form would render (which can't represent "the user
// explicitly picked dark while their OS is in light mode" at all).
export const viewport: Viewport = {
  themeColor: "#fbf1de",
};

// Sets `data-theme` and the theme-color meta tag before React hydrates,
// straight from localStorage — otherwise an explicit dark/light choice (or a
// system choice against a dark OS) would flash the wrong theme for a frame
// on every load. Duplicates THEME_STORAGE_KEY and the --color-surface-soft
// values from lib/theme.ts / globals.css (kept in sync by hand) since this
// runs before any app bundle — including that module — is loaded.
const themeInitScript = `
(function () {
  try {
    var theme = localStorage.getItem("homebox-ai-theme");
    if (theme === "light" || theme === "dark") {
      document.documentElement.setAttribute("data-theme", theme);
    }
    var isDark = theme === "dark" || (theme !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", isDark ? "#261c13" : "#fbf1de");
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
