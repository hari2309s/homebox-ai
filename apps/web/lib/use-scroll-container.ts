"use client";

import { useLayoutEffect, useRef, useState } from "react";

/**
 * Finds the nearest ancestor marked `data-scroll-container` (CrudShell's own
 * scrolling div — see crud-shell.tsx) so a `Virtualizer` can attach to the
 * page's actual scroll container via `scrollRef`, instead of the library's
 * default assumption that its own direct DOM parent is what scrolls (it
 * isn't here — several wrapper elements sit in between).
 *
 * `ready` stays false until this resolves client-side, so callers should
 * render their normal (unvirtualized) markup until then: it's what server
 * renders and what the first client render must match to avoid a hydration
 * mismatch, and it's also what a router without JS keeps seeing. Resolution
 * happens in a layout effect — synchronous and pre-paint — so switching to
 * the virtualized view right after doesn't produce a visible flash.
 */
export function useScrollContainer<T extends HTMLElement>() {
  const anchorRef = useRef<T>(null);
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const container = anchorRef.current?.closest<HTMLElement>("[data-scroll-container]") ?? null;
    scrollContainerRef.current = container;
    setReady(container !== null);
  }, []);

  return { anchorRef, scrollContainerRef, ready };
}
