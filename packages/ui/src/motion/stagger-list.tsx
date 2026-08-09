"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ComponentProps, ReactNode } from "react";

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 320, damping: 26 },
  },
  exit: { opacity: 0, y: -10, scale: 0.98, transition: { duration: 0.15 } },
};

/** Animates its `StaggerItem` children in with a slight cascade on mount, and out on removal. */
export function StaggerList({
  children,
  ...props
}: Omit<ComponentProps<typeof motion.ul>, "children"> & { children: ReactNode }) {
  return (
    <motion.ul variants={containerVariants} initial="hidden" animate="show" {...props}>
      <AnimatePresence>{children}</AnimatePresence>
    </motion.ul>
  );
}

export function StaggerItem(props: ComponentProps<typeof motion.li>) {
  return <motion.li layout variants={itemVariants} exit="exit" {...props} />;
}
