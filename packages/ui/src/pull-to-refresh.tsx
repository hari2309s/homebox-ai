"use client";

import type { ReactNode } from "react";
import { useCallback, useRef, useState } from "react";

import { WalkingDots } from "./walking-dots";

const PULL_THRESHOLD = 64;
const RESISTANCE = 0.5;
const MAX_PULL = 120;
const MIN_DISPLAY_MS = 600;

interface PullToRefreshProps {
  /** Async function called when the user releases past the threshold. */
  onRefresh: () => Promise<void>;
  /** Label shown while pulling (e.g. "RELEASE TO WALK THE PLOT"). */
  pullLabel?: string;
  /** Label shown while refreshing (e.g. "WALKING THE PLOT"). */
  refreshLabel?: string;
  children: ReactNode;
  className?: string;
}

/**
 * J10 pull-to-refresh wrapper.
 * Pull past 64px with 0.5× resistance to trigger refresh.
 * Shows hop dots + contextual text, minimum 600ms display.
 */
export function PullToRefresh({
  onRefresh,
  pullLabel = "RELEASE TO WALK THE PLOT",
  refreshLabel = "WALKING THE PLOT",
  children,
  className,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const pulling = useRef(false);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (refreshing) return;
      const el = containerRef.current;
      if (!el || el.scrollTop > 0) return;
      startY.current = e.touches[0]!.clientY;
      pulling.current = true;
    },
    [refreshing],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!pulling.current || refreshing) return;
      const delta = (e.touches[0]!.clientY - startY.current) * RESISTANCE;
      if (delta <= 0) {
        setPullDistance(0);
        return;
      }
      setPullDistance(Math.min(delta, MAX_PULL));
    },
    [refreshing],
  );

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;

    if (pullDistance >= PULL_THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(PULL_THRESHOLD);
      const start = Date.now();
      try {
        await onRefresh();
      } catch {
        // swallow — caller handles errors
      }
      const elapsed = Date.now() - start;
      if (elapsed < MIN_DISPLAY_MS) {
        await new Promise((r) => setTimeout(r, MIN_DISPLAY_MS - elapsed));
      }
      setRefreshing(false);
      setPullDistance(0);
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, refreshing, onRefresh]);

  const pastThreshold = pullDistance >= PULL_THRESHOLD;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-y-auto ${className ?? ""}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      {(pullDistance > 0 || refreshing) && (
        <div
          className="flex flex-col items-center justify-center gap-[6px]"
          style={{
            height: refreshing ? PULL_THRESHOLD : pullDistance,
            transition: pulling.current ? "none" : "height 200ms ease-out",
          }}
        >
          <WalkingDots size={pastThreshold || refreshing ? 12 : 8} />
          <span className="font-mono text-[10px] tracking-wide text-accent">
            {refreshing ? refreshLabel : pastThreshold ? pullLabel : ""}
          </span>
        </div>
      )}

      {/* Sync progress bar (2px) — shown only while refreshing */}
      {refreshing && (
        <div className="h-[2px] w-full overflow-hidden bg-[#e9e8e1]">
          <div className="h-full w-[58%] animate-pulse bg-accent" />
        </div>
      )}

      {children}
    </div>
  );
}
