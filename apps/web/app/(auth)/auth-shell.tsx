"use client";

import { AnimatedHomeboxIcon, FadeIn } from "@homebox-ai/ui";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

/** Icon/title/card shell shared by the forgot-password and reset-password pages — mirrors login's outer frame. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="no-scrollbar mx-auto flex h-dvh w-full max-w-lg flex-col items-center overflow-y-auto px-6 py-12">
      <div className="m-auto flex w-full flex-col items-center gap-10">
        <FadeIn className="flex flex-col items-center gap-2 text-center">
          <motion.div
            initial={{ scale: 0.5, rotate: -12, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.05 }}
          >
            <AnimatedHomeboxIcon size={96} />
          </motion.div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Homebox AI</h1>
        </FadeIn>

        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 24, delay: 0.15 }}
          className="flex w-full max-w-sm flex-col gap-5 rounded-lg bg-surface p-8 shadow-card"
        >
          {children}
        </motion.div>
      </div>
    </main>
  );
}
