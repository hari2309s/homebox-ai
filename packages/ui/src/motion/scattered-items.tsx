"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";

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

/* ------------------------------------------------------------------ */
/*  Peripheral positions — avoid center column where the form sits     */
/*  0–2  top strip    (always visible)                                 */
/*  3–5  left margin  (desktop only, hidden < md)                      */
/*  6–8  right margin (desktop only, hidden < md)                      */
/*  9–11 bottom strip (always visible)                                 */
/* ------------------------------------------------------------------ */

interface Slot {
  left: number;
  top: number;
  /** Base rotation (deg). */
  r: number;
  /** Vertical drift amplitude (px). */
  dy: number;
  /** Rotation drift amplitude (deg). */
  dr: number;
}

const SLOTS: Slot[] = [
  // Top strip — staggered heights, asymmetric spacing
  { left: 7, top: 5, r: -22, dy: 11, dr: 5 },
  { left: 42, top: 8, r: 14, dy: 9, dr: 3 },
  { left: 82, top: 4, r: -8, dy: 13, dr: 4 },
  // Left margin (md+) — varied horizontal offsets and vertical rhythm
  { left: 5, top: 22, r: 25, dy: 12, dr: 6 },
  { left: 16, top: 46, r: -18, dy: 10, dr: 3 },
  { left: 7, top: 72, r: 12, dy: 14, dr: 5 },
  // Right margin (md+) — different rhythm from left side
  { left: 94, top: 32, r: -14, dy: 11, dr: 4 },
  { left: 84, top: 58, r: 20, dy: 9, dr: 6 },
  { left: 93, top: 82, r: -26, dy: 12, dr: 3 },
  // Bottom strip — staggered heights, asymmetric spacing
  { left: 18, top: 94, r: 16, dy: 10, dr: 4 },
  { left: 56, top: 96, r: -12, dy: 8, dr: 5 },
  { left: 85, top: 93, r: 22, dy: 11, dr: 3 },
];

/** Organized: peripheral but slightly irregular grid (not perfectly aligned). */
const ORGANIZED: { left: number; top: number }[] = [
  // Top — offset heights and uneven horizontal gaps
  { left: 15, top: 5 },
  { left: 48, top: 7 },
  { left: 78, top: 4 },
  // Left column — staggered inward
  { left: 5, top: 26 },
  { left: 10, top: 48 },
  { left: 4, top: 72 },
  // Right column — different offsets from left
  { left: 96, top: 34 },
  { left: 90, top: 56 },
  { left: 95, top: 80 },
  // Bottom — offset heights and uneven gaps
  { left: 22, top: 95 },
  { left: 53, top: 93 },
  { left: 82, top: 96 },
];

/** Indices 3–8 are side-margin icons, hidden on mobile. */
const MD_START = 3;
const MD_END = 8;

/* ------------------------------------------------------------------ */
/*  Framer Motion variants (controls left, top, opacity only)          */
/* ------------------------------------------------------------------ */

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const itemVariants: Variants = {
  hidden: (i: number) => ({
    left: `${SLOTS[i]!.left}%`,
    top: `${SLOTS[i]!.top}%`,
    opacity: 0,
  }),
  scattered: (i: number) => ({
    left: `${SLOTS[i]!.left}%`,
    top: `${SLOTS[i]!.top}%`,
    opacity: 0.55,
    transition: { delay: i * 0.06, duration: 0.6, ease: EASE },
  }),
  organized: (i: number) => ({
    left: `${ORGANIZED[i]!.left}%`,
    top: `${ORGANIZED[i]!.top}%`,
    opacity: 0.22,
    transition: {
      type: "spring",
      stiffness: 120,
      damping: 20,
      delay: i * 0.04,
    },
  }),
  instant: (i: number) => ({
    left: `${ORGANIZED[i]!.left}%`,
    top: `${ORGANIZED[i]!.top}%`,
    opacity: 0.15,
  }),
};

/* ------------------------------------------------------------------ */
/*  CSS floating keyframe (rotation + vertical drift)                  */
/* ------------------------------------------------------------------ */

const FLOAT_CSS = `
@keyframes si-float {
  0%, 100% {
    transform: translateY(0) rotate(var(--si-r, 0deg));
  }
  50% {
    transform: translateY(var(--si-dy, -10px)) rotate(calc(var(--si-r, 0deg) + var(--si-dr, 3deg)));
  }
}
`;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface ScatteredItemsProps {
  className?: string;
  /** When false, renders the final organized state with no animation. */
  animate?: boolean;
  /** "scattered" = floating, "organized" = settled. */
  stage?: "scattered" | "organized";
}

export function ScatteredItems({
  className = "",
  animate: shouldAnimate = true,
  stage = "scattered",
}: ScatteredItemsProps) {
  const reducedMotion = useReducedMotion();
  const skip = reducedMotion || !shouldAnimate;
  const floating = !skip && stage === "scattered";

  const fmAnimate = skip ? "instant" : stage === "scattered" ? "scattered" : "organized";

  return (
    <div
      className={`pointer-events-none select-none overflow-hidden ${className}`}
      style={{ contain: "layout style" } as React.CSSProperties}
      aria-hidden
    >
      <style dangerouslySetInnerHTML={{ __html: FLOAT_CSS }} />

      {ALL_ITEMS.map((icon, i) => {
        const s = SLOTS[i]!;
        const desktopOnly = i >= MD_START && i <= MD_END;

        return (
          <motion.div
            key={icon}
            custom={i}
            variants={itemVariants}
            initial="hidden"
            animate={fmAnimate}
            className={`absolute ${desktopOnly ? "hidden md:block" : ""}`}
            style={{ transform: "translate(-50%, -50%)" }}
          >
            <span
              className="material-symbols-rounded inline-block text-accent will-change-transform"
              style={{
                fontSize: 30,
                transform: floating ? `rotate(${s.r}deg)` : "rotate(0deg)",
                transition: "transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
                animation: floating
                  ? `si-float ${5 + (i % 4) * 0.8}s ease-in-out ${i * 0.3}s infinite`
                  : "none",
                "--si-r": `${s.r}deg`,
                "--si-dy": `${-s.dy}px`,
                "--si-dr": `${s.dr}deg`,
              } as React.CSSProperties}
            >
              {icon}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
