"use client";

import { TapButton } from "@homebox-ai/ui";
import type { ComponentProps } from "react";
import { useEffect, useState } from "react";

import { applyTheme, getStoredTheme, nextTheme, storeTheme, type Theme } from "../../lib/theme";

function Icon(props: ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    />
  );
}

function SystemIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <rect x="3" y="4" width="18" height="13" rx="1.5" />
      <path d="M8 21h8M12 17v4" />
    </Icon>
  );
}

function SunIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M3 12h2M19 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
    </Icon>
  );
}

function MoonIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />
    </Icon>
  );
}

const ICONS = { system: SystemIcon, light: SunIcon, dark: MoonIcon } satisfies Record<
  Theme,
  (props: ComponentProps<"svg">) => ReturnType<typeof Icon>
>;

const LABELS: Record<Theme, string> = { system: "System", light: "Light", dark: "Dark" };

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  // Avoids a hydration flash of the wrong icon: the server always renders
  // "System" (it has no access to localStorage), so the real stored value
  // is only shown once mounted — the page's actual colors are unaffected by
  // this since the inline script in layout.tsx already sets them pre-paint.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(getStoredTheme());
    setMounted(true);

    // Keeps the theme-color meta tag correct if the OS preference changes
    // live (e.g. auto night mode kicking in) while "system" is selected —
    // the page's own colors already update for free via CSS's media query,
    // but the meta tag needs JS since a manual choice has to be able to
    // override it, so it can't use that same media-query trick.
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    function handleSystemChange() {
      if (getStoredTheme() === "system") applyTheme("system");
    }
    media.addEventListener("change", handleSystemChange);
    return () => media.removeEventListener("change", handleSystemChange);
  }, []);

  function handleClick() {
    const next = nextTheme(theme);
    setTheme(next);
    storeTheme(next);
    applyTheme(next);
  }

  const CurrentIcon = ICONS[theme];

  return (
    <TapButton
      type="button"
      onClick={handleClick}
      aria-label={`Theme: ${LABELS[theme]}. Click to switch.`}
      title={`Theme: ${LABELS[theme]}`}
      className="cursor-pointer rounded-md border-none bg-transparent p-1 text-ink transition-colors duration-150 hover:text-accent"
    >
      {mounted ? (
        <CurrentIcon className="h-5 w-5 md:h-6 md:w-6" />
      ) : (
        <span aria-hidden="true" className="block h-5 w-5 md:h-6 md:w-6" />
      )}
    </TapButton>
  );
}
