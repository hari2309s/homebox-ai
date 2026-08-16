"use client";

import { motion } from "framer-motion";
import type { ComponentProps } from "react";

/**
 * A bare `motion.button` with just hover/tap feedback baked in — no visual
 * styling of its own, unlike `Button`. For the many small text/icon buttons
 * (Edit, Delete, Cancel, nav icons, …) that each need their own colors and
 * sizing but should still feel interactive like everything else in the app.
 */
export function TapButton({ whileHover, whileTap, transition, ...props }: ComponentProps<typeof motion.button>) {
  return (
    <motion.button
      whileHover={whileHover ?? { scale: 1.06 }}
      whileTap={whileTap ?? { scale: 0.94 }}
      transition={transition ?? { type: "spring", stiffness: 400, damping: 17 }}
      {...props}
    />
  );
}
