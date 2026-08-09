"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

// Unlike layout.tsx (persists across navigations within the group),
// template.tsx remounts on every navigation — that's what makes this
// actually animate each page transition instead of only firing once.
export default function Template({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
