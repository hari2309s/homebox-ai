"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

import { WalkingDots } from "./walking-dots";

interface PwaSplashProps {
  /** Household/home name shown below the brand, e.g. "14 ELM ROW". */
  householdName?: string;
  /** Whether data is ready. Once true, the splash cross-fades out (300ms). */
  ready?: boolean;
}

/**
 * J10 PWA splash screen.
 * Animated icon + brand + household name + walking dots.
 * Cross-fades to the app once `ready` is true (min 300ms, max 2.5s then falls back to skeletons).
 */
export function PwaSplash({ householdName, ready = false }: PwaSplashProps) {
  const [visible, setVisible] = useState(true);
  const [timedOut, setTimedOut] = useState(false);

  // Maximum display time — fall back to skeletons after 2.5s.
  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  // Once ready or timed out, fade out after 300ms min.
  useEffect(() => {
    if (!ready && !timedOut) return;
    const timer = setTimeout(() => setVisible(false), 300);
    return () => clearTimeout(timer);
  }, [ready, timedOut]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-[18px] bg-surface"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Animated house icon — simplified for now, can be replaced with full SVG */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <div className="flex h-[120px] w-[120px] items-center justify-center rounded-[28px] bg-[#dfe8d6]">
              <span className="material-symbols-rounded text-[56px] text-[#2c4d31]" style={{ fontVariationSettings: "'FILL' 1" }}>
                home
              </span>
            </div>
          </motion.div>

          <span className="font-serif text-[34px] text-ink">Homebox</span>

          <div className="absolute bottom-16 flex flex-col items-center gap-[10px]">
            <WalkingDots size={8} />
            <span className="font-mono text-[10px] tracking-[.06em] text-muted">
              {householdName ? `OPENING ${householdName.toUpperCase()}` : "OPENING THE HOUSE"}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
