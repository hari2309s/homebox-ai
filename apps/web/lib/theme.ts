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

/**
 * Reflects `theme` onto the document. "system" clears the override so
 * globals.css's `prefers-color-scheme` media query takes over instead of a
 * forced choice — see the `[data-theme]` / `@media (prefers-color-scheme)`
 * pair there.
 */
export function applyTheme(theme: Theme): void {
  if (theme === "system") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
}
