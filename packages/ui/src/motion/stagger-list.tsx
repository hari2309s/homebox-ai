"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ComponentProps, ReactNode } from "react";

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

/** Animates its `StaggerItem` children in with a slight cascade on mount, and out on removal. */
export function StaggerList({
  children,
  ...props
}: Omit<ComponentProps<typeof motion.ul>, "children"> & { children: ReactNode }) {
  return (
    <motion.ul variants={containerVariants} initial="hidden" animate="show" {...props}>
      <AnimatePresence initial={false}>{children}</AnimatePresence>
    </motion.ul>
  );
}

export function StaggerItem(props: ComponentProps<typeof motion.li>) {
  return <motion.li layout variants={itemVariants} exit="exit" {...props} />;
}
