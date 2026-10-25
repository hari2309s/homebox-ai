"use client";

import { AnimatedHomeboxIcon } from "@homebox-ai/ui";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="no-scrollbar mx-auto flex h-dvh w-full max-w-md flex-col items-center overflow-y-auto px-5 py-10">
      <div className="m-auto flex w-full flex-col items-center gap-8">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.05 }}
          className="flex flex-col items-center gap-2.5 text-center"
        >
          <AnimatedHomeboxIcon size={96} />
          <h1 className="font-serif text-[30px] leading-none text-ink">Homebox</h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 24, delay: 0.12 }}
          className="flex w-full flex-col gap-4 rounded-[14px] border border-border bg-card p-6 shadow-card"
        >
          {children}
        </motion.div>
      </div>
    </main>
  );
}
