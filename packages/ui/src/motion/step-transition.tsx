"use client";

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const SLIDE_PX = 60;

const variants: Variants = {
  enter: (direction: number) => ({
    x: direction * SLIDE_PX,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.35, ease: EASE },
  },
  exit: (direction: number) => ({
    x: -direction * SLIDE_PX,
    opacity: 0,
    transition: { duration: 0.25, ease: EASE },
  }),
};

interface StepTransitionProps {
  /** Must change when the step changes (used as React key). */
  stepKey: number | string;
  /** 1 = forward (slide left), -1 = backward (slide right). */
  direction: number;
  children: ReactNode;
  className?: string;
}

/**
 * Direction-aware step transition for multi-step flows.
 *
 * Wrap with `<AnimatePresence mode="wait" custom={direction}>` and give each
 * step a unique `key` so exits and enters are animated.
 */
export function StepTransition({ stepKey, direction, children, className }: StepTransitionProps) {
  return (
    <motion.div
      key={stepKey}
      custom={direction}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      className={className}
    >
      {children}
    </motion.div>
  );
}
