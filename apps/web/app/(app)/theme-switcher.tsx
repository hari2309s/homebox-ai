"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { useEffect, useId, useRef, useState, type MouseEvent } from "react";
import { flushSync } from "react-dom";

import { applyTheme, getStoredTheme, resolveTheme, storeTheme, THEME_STORAGE_KEY, type Theme } from "../../lib/theme";

const OPTIONS: { value: Theme; label: string; icon: string }[] = [
  { value: "system", label: "System", icon: "brightness_auto" },
  { value: "light", label: "Light", icon: "light_mode" },
  { value: "dark", label: "Dark", icon: "dark_mode" },
];

/** Lets every switcher on the page (sidebar + settings) follow a change made in any of them. */
const THEME_EVENT = "homebox-theme-change";

// Each icon gets its own entrance when it becomes the active one.
const ICON_VARIANTS: Record<Theme, Variants> = {
  system: { hidden: { scale: 0.4, opacity: 0 }, shown: { scale: 1, opacity: 1 } },
  light: { hidden: { rotate: -120, scale: 0.5, opacity: 0 }, shown: { rotate: 0, scale: 1, opacity: 1 } },
  dark: { hidden: { rotate: 40, x: 6, opacity: 0 }, shown: { rotate: 0, x: 0, opacity: 1 } },
};

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { ready: Promise<void> };
};

export function ThemeSwitcher({ variant = "full" }: { variant?: "compact" | "full" }) {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);
  const reduceMotion = useReducedMotion();
  const groupId = useId();
  const busyRef = useRef(false);

  useEffect(() => {
    setTheme(getStoredTheme());
    setMounted(true);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (getStoredTheme() === "system") applyTheme("system");
    };
    const onOtherSwitcher = () => setTheme(getStoredTheme());
    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      const next = getStoredTheme();
      applyTheme(next);
      setTheme(next);
    };
    media.addEventListener("change", onSystemChange);
    window.addEventListener(THEME_EVENT, onOtherSwitcher);
    window.addEventListener("storage", onStorage);
    return () => {
      media.removeEventListener("change", onSystemChange);
      window.removeEventListener(THEME_EVENT, onOtherSwitcher);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  function choose(next: Theme, event: MouseEvent<HTMLButtonElement>) {
    if (next === theme || busyRef.current) return;
    const commit = () => {
      storeTheme(next);
      applyTheme(next);
      setTheme(next);
      window.dispatchEvent(new Event(THEME_EVENT));
    };

    const doc = document as ViewTransitionDocument;
    const looksDifferent = resolveTheme(next) !== resolveTheme(theme);
    if (!looksDifferent || reduceMotion || !doc.startViewTransition) {
      commit();
      return;
    }

    // Reveal the new theme as a circle growing from the button that was pressed.
    const box = event.currentTarget.getBoundingClientRect();
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    busyRef.current = true;
    const transition = doc.startViewTransition(() => flushSync(commit));
    transition.ready
      .then(() => {
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 560, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)", pseudoElement: "::view-transition-new(root)" },
        );
      })
      .catch(() => {})
      .finally(() => {
        setTimeout(() => {
          busyRef.current = false;
        }, 560);
      });
  }

  const compact = variant === "compact";

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={`relative grid grid-cols-3 rounded-[10px] bg-surface-soft p-[3px] ${compact ? "w-full" : "w-full max-w-[360px]"}`}
    >
      {OPTIONS.map((option) => {
        const active = mounted && option.value === theme;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={compact ? `${option.label} theme` : undefined}
            title={compact ? `${option.label} theme` : undefined}
            onClick={(event) => choose(option.value, event)}
            className={`relative flex cursor-pointer items-center justify-center gap-[6px] rounded-[8px] border-none bg-transparent font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent ${
              compact ? "h-8 text-[12px]" : "h-10 text-[13px]"
            } ${active ? "text-ink" : "text-muted hover:text-ink"}`}
          >
            {active && (
              <motion.span
                layoutId={`${groupId}-pill`}
                className="absolute inset-0 rounded-[8px] bg-card shadow-[0_1px_3px_rgba(31,38,34,.15)]"
                transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <motion.span
              key={active ? `${option.value}-on` : `${option.value}-off`}
              aria-hidden
              className={`material-symbols-rounded relative ${compact ? "text-[17px]" : "text-[18px]"} ${active ? "text-accent" : ""}`}
              style={{ fontVariationSettings: active ? "'FILL' 1" : undefined }}
              variants={ICON_VARIANTS[option.value]}
              initial={active && !reduceMotion ? "hidden" : false}
              animate="shown"
              transition={{ type: "spring", stiffness: 300, damping: 18 }}
            >
              {option.icon}
            </motion.span>
            {!compact && <span className="relative">{option.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
