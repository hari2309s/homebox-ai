"use client";

import { motion } from "framer-motion";
import type { ComponentProps } from "react";

const TAGS = {
  div: motion.div,
  nav: motion.nav,
} as const;

type Tag = keyof typeof TAGS;

type FadeInProps<T extends Tag> = ComponentProps<(typeof TAGS)[T]> & {
  as?: T;
  delay?: number;
  y?: number;
};

/** Fades and slides content in on mount. Use `delay` to stagger a handful of sections by hand. */
export function FadeIn<T extends Tag = "div">({ as, delay = 0, y = 12, ...props }: FadeInProps<T>) {
  const MotionTag = TAGS[as ?? "div"];
  return (
    <MotionTag
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {...(props as any)}
    />
  );
}
