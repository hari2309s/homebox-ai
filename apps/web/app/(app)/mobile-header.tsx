"use client";

import { motion } from "framer-motion";
import { useState, useSyncExternalStore } from "react";

import { subscribe, getUnreadCount } from "./notifications/notification-store";
import { NotificationSheet } from "./notifications/notification-sheet";

/** Persistent mobile header — always visible on phone/tablet, hidden on desktop. */
export function MobileHeader() {
  const [open, setOpen] = useState(false);
  const unread = useSyncExternalStore(subscribe, getUnreadCount, getUnreadCount);

  return (
    <header className="flex shrink-0 items-center justify-end px-4 py-2 lg:hidden">
      <button
        type="button"
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
        onClick={() => setOpen(true)}
        className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-[10px] border border-border bg-card shadow-card"
      >
        <motion.span
          key={unread}
          initial={unread ? { rotate: -14 } : false}
          animate={{ rotate: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 12 }}
          className="material-symbols-rounded text-[20px] text-ink"
          style={{ fontVariationSettings: unread ? "'FILL' 1" : undefined }}
        >
          notifications
        </motion.span>
        {unread > 0 && (
          <motion.span
            key="badge"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 20 }}
            className="absolute -right-[2px] -top-[2px] flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-danger px-[4px] font-mono text-[10px] font-bold text-white"
          >
            {unread > 9 ? "9+" : unread}
          </motion.span>
        )}
      </button>
      <NotificationSheet open={open} onClose={() => setOpen(false)} />
    </header>
  );
}
