export type Theme = "system" | "light" | "dark";

// Also hardcoded (can't share a module with it) in the inline pre-hydration
// script in app/layout.tsx, which needs this exact key to read the stored
// choice before React loads — keep the two in sync if this ever changes.
export const THEME_STORAGE_KEY = "homebox-ai-theme";

const NEXT: Record<Theme, Theme> = {
  system: "light",
  light: "dark",
  dark: "system",
};

/** The toggle button's click behavior: System -> Light -> Dark -> System, looping. */
export function nextTheme(current: Theme): Theme {
  return NEXT[current];
}

export function isTheme(value: string | null | undefined): value is Theme {
  return value === "system" || value === "light" || value === "dark";
}

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isTheme(stored) ? stored : "system";
}

export function storeTheme(theme: Theme): void {
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}

/** What "system" actually resolves to right now, from the OS preference. */
export function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme !== "system") return theme;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// The app header/bottom-nav's actual background color (--color-surface-soft
// in globals.css, light and dark values) — kept in sync by hand since the
// browser's own chrome (tab bar, PWA title bar) reads this meta tag, not CSS.
const THEME_COLOR: Record<"light" | "dark", string> = {
  light: "#fbf1de",
  dark: "#261c13",
};

function setThemeColorMeta(resolved: "light" | "dark"): void {
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[resolved]);
}

/**
 * Reflects `theme` onto the document. "system" clears the `data-theme`
 * override so globals.css's `prefers-color-scheme` media query takes over
 * instead of a forced choice — see the `[data-theme]` / `@media
 * (prefers-color-scheme)` pair there. The theme-color meta tag can't use
 * that same media-query trick (a manual light/dark choice needs to win over
 * the OS setting, and only JS knows which one is active), so it's always
 * set explicitly here instead.
 */
export function applyTheme(theme: Theme): void {
  if (theme === "system") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
  setThemeColorMeta(resolveTheme(theme));
}
