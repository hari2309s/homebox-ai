"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useSyncExternalStore } from "react";

import { NOTIFICATION_ICON, NOTIFICATION_TONE, type AppNotification } from "../../../lib/notifications";
import { clearAll, getNotifications, getUnreadCount, markAllRead, markRead, subscribe } from "./notification-store";

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function Row({ n, onClose }: { n: AppNotification; onClose: () => void }) {
  const inner = (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 30 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`flex items-start gap-3 rounded-[10px] px-3 py-[10px] ${n.read ? "" : "bg-selected-soft"}`}
      onClick={() => {
        markRead(n.id);
        if (n.href) onClose();
      }}
    >
      <span
        aria-hidden
        className={`material-symbols-rounded flex h-8 w-8 flex-none items-center justify-center rounded-full ${NOTIFICATION_TONE[n.kind]}`}
        style={{ fontSize: 16 }}
      >
        {NOTIFICATION_ICON[n.kind]}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className={`text-[13px] leading-snug ${n.read ? "text-body" : "font-semibold text-ink"}`}>
            {n.title}
          </span>
          <span className="flex-none font-mono text-[10px] text-muted">{timeAgo(n.timestamp)}</span>
        </span>
        {n.body && <span className="mt-[1px] block text-[12px] leading-snug text-muted">{n.body}</span>}
      </span>
      {!n.read && <span className="mt-[6px] h-2 w-2 flex-none rounded-full bg-accent" />}
    </motion.div>
  );

  return n.href ? (
    <Link href={n.href} className="no-underline">
      {inner}
    </Link>
  ) : (
    inner
  );
}

/** Full-screen sheet for mobile, slides up from bottom. */
export function NotificationSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const notifications = useSyncExternalStore(subscribe, getNotifications, getNotifications);
  const unread = useSyncExternalStore(subscribe, getUnreadCount, getUnreadCount);
  const close = useCallback(() => onClose(), [onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-[100] bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />
          <motion.div
            key="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-[101] flex max-h-[85dvh] flex-col rounded-t-[20px] border-t border-border bg-card"
          >
            {/* Handle */}
            <div className="flex justify-center pt-2 pb-1">
              <div className="h-1 w-8 rounded-full bg-border" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3">
              <span className="text-[16px] font-semibold text-ink">Notifications</span>
              <span className="flex gap-2">
                {unread > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="cursor-pointer border-none bg-transparent font-mono text-[10px] text-accent"
                  >
                    MARK ALL READ
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="cursor-pointer border-none bg-transparent font-mono text-[10px] text-muted"
                  >
                    CLEAR
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Close"
                  onClick={close}
                  className="flex cursor-pointer border-none bg-transparent p-0 text-muted"
                >
                  <span aria-hidden className="material-symbols-rounded text-[20px]">
                    close
                  </span>
                </button>
              </span>
            </div>

            {/* List */}
            <div className="no-scrollbar flex-1 overflow-y-auto px-2 pb-[env(safe-area-inset-bottom,12px)]">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <span aria-hidden className="material-symbols-rounded text-[32px] text-muted">
                    notifications_off
                  </span>
                  <span className="text-[13px] text-muted">Nothing here yet</span>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {notifications.map((n) => (
                    <Row key={n.id} n={n} onClose={close} />
                  ))}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
