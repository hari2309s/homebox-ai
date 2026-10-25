import { MotionConfig } from "framer-motion";
import type { Metadata, Viewport } from "next";
import { Onest, Young_Serif, Red_Hat_Mono } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

const onest = Onest({ subsets: ["latin"], variable: "--font-onest", display: "swap" });
const youngSerif = Young_Serif({ subsets: ["latin"], weight: "400", variable: "--font-young-serif", display: "swap" });
const redHatMono = Red_Hat_Mono({ subsets: ["latin"], variable: "--font-red-hat-mono", display: "swap" });

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
  themeColor: "#e9e8e1",
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
    if (meta) meta.setAttribute("content", isDark ? "#1e2420" : "#e9e8e1");
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${onest.variable} ${youngSerif.variable} ${redHatMono.variable}`} suppressHydrationWarning>
      <head>
        {/* Rendered directly, not just via `metadata`, so it doesn't blank out (browsers then show the URL) between dynamic-route navigations. */}
        <title>Homebox AI — Know what you own, and where it is.</title>
        {/* Static, non-user-controlled script; must run inline and synchronously before paint. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,300..500,0..1,0&display=block"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        {/* Disables transform/layout animations app-wide for prefers-reduced-motion,
            without every motion.* usage needing its own check. */}
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </body>
    </html>
  );
}
