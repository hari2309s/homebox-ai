"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { useMemo } from "react";

/* ------------------------------------------------------------------ */
/*  Household items — Material Symbols icon names                      */
/* ------------------------------------------------------------------ */

const ALL_ITEMS = [
  "handyman",
  "potted_plant",
  "weekend",
  "light",
  "pedal_bike",
  "blender",
  "checkroom",
  "local_laundry_service",
  "yard",
  "directions_car",
  "chair",
  "kitchen",
] as const;

/** Reduced set for small screens. */
const MOBILE_ITEMS = [
  "handyman",
  "potted_plant",
  "weekend",
  "light",
  "yard",
  "kitchen",
] as const;

/* ------------------------------------------------------------------ */
/*  Deterministic "random" positions seeded by index                   */
/* ------------------------------------------------------------------ */

function seededRandom(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

/** Scattered start positions (percentage-based) and rotations. */
function scatteredPos(index: number) {
  const r = (i: number) => seededRandom(index * 7 + i);
  return {
    x: `${10 + r(0) * 80}%`,
    y: `${5 + r(1) * 90}%`,
    rotate: -30 + r(2) * 60,
  };
}

/* Organized positions: 3×4 grid inside the "house" area (centered). */
const GRID_COLS = 4;
const GRID_PAD_X = 18; // % from each side
const GRID_PAD_Y = 15;
const GRID_SPAN_X = 100 - GRID_PAD_X * 2;
const GRID_SPAN_Y = 100 - GRID_PAD_Y * 2;

function organizedPos(index: number, total: number) {
  const cols = Math.min(GRID_COLS, total);
  const col = index % cols;
  const row = Math.floor(index / cols);
  const rows = Math.ceil(total / cols);
  return {
    x: `${GRID_PAD_X + (cols > 1 ? (col / (cols - 1)) * GRID_SPAN_X : GRID_SPAN_X / 2)}%`,
    y: `${GRID_PAD_Y + (rows > 1 ? (row / (rows - 1)) * GRID_SPAN_Y : GRID_SPAN_Y / 2)}%`,
    rotate: 0,
  };
}

/* ------------------------------------------------------------------ */
/*  Variants                                                           */
/* ------------------------------------------------------------------ */

const STAGGER_DELAY = 0.06;

const itemVariants: Variants = {
  scattered: (i: number) => {
    const pos = scatteredPos(i);
    return {
      left: pos.x,
      top: pos.y,
      rotate: pos.rotate,
      opacity: 0,
      scale: 0.7,
      transition: { duration: 0 },
    };
  },
  appear: (i: number) => {
    const pos = scatteredPos(i);
    return {
      left: pos.x,
      top: pos.y,
      rotate: pos.rotate,
      opacity: 0.5,
      scale: 1,
      transition: {
        delay: i * 0.03,
        duration: 0.3,
        ease: [0.16, 1, 0.3, 1],
      },
    };
  },
  organized: (i: number) => ({
    ...organizedPos(i, 12),
    opacity: 0.22,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 25,
      delay: 0.8 + i * STAGGER_DELAY,
    },
  }),
  /** Reduced-motion: skip straight to the organized state with no animation. */
  instant: (i: number) => ({
    ...organizedPos(i, 12),
    opacity: 0.18,
    scale: 1,
    rotate: 0,
    transition: { duration: 0 },
  }),
};

const houseVariants: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { delay: 0.3, duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
  instant: { opacity: 1, scale: 1, transition: { duration: 0 } },
};

/* ------------------------------------------------------------------ */
/*  Idle breathing (CSS keyframe — lighter than JS animation loop)     */
/* ------------------------------------------------------------------ */

const IDLE_CSS = `
@keyframes scattered-breathe {
  0%, 100% { opacity: var(--si-base-opacity); transform: translate(-50%,-50%) scale(1); }
  50% { opacity: calc(var(--si-base-opacity) + 0.04); transform: translate(-50%,-50%) scale(1.03); }
}
`;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

type Intensity = "subtle" | "medium";

const OPACITY: Record<Intensity, number> = {
  subtle: 0.15,
  medium: 0.3,
};

interface ScatteredItemsProps {
  className?: string;
  /** Controls the base opacity of organized items. */
  intensity?: Intensity;
  /** When false, renders the final organized state with no animation. */
  animate?: boolean;
  /** Override which stage to show ("scattered" stays scattered). */
  stage?: "scattered" | "organized";
}

export function ScatteredItems({
  className = "",
  intensity = "subtle",
  animate = true,
  stage = "organized",
}: ScatteredItemsProps) {
  const reducedMotion = useReducedMotion();
  const skip = reducedMotion || !animate;
  const baseOpacity = OPACITY[intensity];

  // Pick item set based on screen width (SSR-safe: default to full set, CSS hides extras).
  const items = ALL_ITEMS;
  const mobileCount = MOBILE_ITEMS.length;

  // Memoize organized positions so they don't recalculate on every render.
  const positions = useMemo(
    () => items.map((_, i) => organizedPos(i, items.length)),
    [items],
  );

  // Animation sequence: scattered → appear → organized (or instant if reduced motion).
  const itemAnimate = skip
    ? "instant"
    : stage === "scattered"
      ? "appear"
      : ["appear", "organized"];

  return (
    <div
      className={`pointer-events-none select-none overflow-hidden ${className}`}
      style={{ contain: "layout style" } as React.CSSProperties}
      aria-hidden
    >
      <style dangerouslySetInnerHTML={{ __html: IDLE_CSS }} />

      {/* House outline — visible only when organized */}
      <motion.div
        className="absolute left-1/2 top-1/2 hidden h-[60%] w-[55%] -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 border-dashed border-border md:block"
        variants={houseVariants}
        initial="hidden"
        animate={skip ? "instant" : "visible"}
      >
        {/* Internal room dividers */}
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-border opacity-50" />
        <div className="absolute left-0 top-[45%] h-px w-full bg-border opacity-50" />
      </motion.div>

      {/* Scattered / organized items */}
      {items.map((icon, i) => {
        const org = positions[i]!;
        return (
          <motion.span
            key={icon}
            custom={i}
            variants={itemVariants}
            initial="scattered"
            animate={itemAnimate}
            className={`material-symbols-rounded absolute -translate-x-1/2 -translate-y-1/2 text-border will-change-transform ${i >= mobileCount ? "hidden md:block" : ""}`}
            style={{
              fontSize: 28,
              // After the spring animation ends, hand off to CSS idle breathing.
              // The organized variant sets the final position; CSS animation adds the pulse.
              animationName: skip || stage === "scattered" ? "none" : "scattered-breathe",
              animationDuration: `${3.5 + (i % 3) * 0.5}s`,
              animationTimingFunction: "ease-in-out",
              animationIterationCount: "infinite",
              animationDelay: `${2.2 + i * 0.15}s`,
              "--si-base-opacity": baseOpacity,
              // Fallback positions for SSR (organized state).
              left: org.x,
              top: org.y,
            } as React.CSSProperties}
          >
            {icon}
          </motion.span>
        );
      })}
    </div>
  );
}
