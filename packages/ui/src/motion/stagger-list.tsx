"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Children, cloneElement, isValidElement } from "react";
import type { ComponentProps, ReactElement, ReactNode } from "react";

const BASE_DELAY = 0.05;
const STEP = 0.07;

const itemVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  show: (index: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 320, damping: 26, delay: BASE_DELAY + index * STEP },
  }),
  exit: { opacity: 0, y: -10, scale: 0.98, transition: { duration: 0.15 } },
};

/**
 * Animates its `StaggerItem` children in with a slight cascade on mount, and
 * out on removal. Each item's delay is computed from its index explicitly
 * (via `custom`) rather than via parent `staggerChildren` orchestration —
 * nesting `AnimatePresence` between this list and its items breaks both
 * variant-propagation and orchestration timing, so both are done by hand.
 */
export function StaggerList({
  children,
  ...props
}: Omit<ComponentProps<typeof motion.ul>, "children"> & { children: ReactNode }) {
  const items = Children.toArray(children).filter(isValidElement) as ReactElement<{ custom?: number }>[];

  return (
    <motion.ul {...props}>
      <AnimatePresence>{items.map((child, index) => cloneElement(child, { custom: index }))}</AnimatePresence>
    </motion.ul>
  );
}

export function StaggerItem({ custom, ...props }: ComponentProps<typeof motion.li> & { custom?: number }) {
  return (
    <motion.li layout variants={itemVariants} custom={custom} initial="hidden" animate="show" exit="exit" {...props} />
  );
}
