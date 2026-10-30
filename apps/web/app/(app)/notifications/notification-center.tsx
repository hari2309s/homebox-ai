"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { NOTIFICATION_ICON, NOTIFICATION_TONE, type AppNotification } from "../../../lib/notifications";
import {
  clearAll,
  getNotifications,
  getUnreadCount,
  markAllRead,
  markRead,
  subscribe,
} from "./notification-store";

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function NotificationRow({ n, onClose }: { n: AppNotification; onClose: () => void }) {
  const content = (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`flex items-start gap-3 rounded-[10px] px-3 py-[10px] transition-colors duration-150 ${n.read ? "" : "bg-selected-soft"} hover:bg-surface-soft`}
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
      {content}
    </Link>
  ) : (
    content
  );
}

/** Desktop sidebar bell button — opens a dropdown. */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const notifications = useSyncExternalStore(subscribe, getNotifications, getNotifications);
  const unread = useSyncExternalStore(subscribe, getUnreadCount, getUnreadCount);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-[10px] border-none bg-transparent text-muted transition-colors duration-150 hover:bg-surface-soft hover:text-ink"
      >
        <motion.span
          key={unread}
          initial={unread ? { rotate: -14 } : false}
          animate={{ rotate: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 12 }}
          className="material-symbols-rounded text-[20px]"
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

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            className="absolute bottom-full left-0 z-50 mb-2 w-[340px] overflow-hidden rounded-[14px] border border-border bg-card shadow-[8px_12px_24px_-10px_rgba(31,38,34,.35)]"
          >
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
              <span className="text-[14px] font-semibold text-ink">Notifications</span>
              <span className="flex gap-1">
                {unread > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="cursor-pointer border-none bg-transparent font-mono text-[10px] text-accent hover:underline"
                  >
                    MARK ALL READ
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="cursor-pointer border-none bg-transparent font-mono text-[10px] text-muted hover:text-ink"
                  >
                    CLEAR
                  </button>
                )}
              </span>
            </div>

            <div className="no-scrollbar max-h-[400px] overflow-y-auto p-1">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <span aria-hidden className="material-symbols-rounded text-[32px] text-muted">
                    notifications_off
                  </span>
                  <span className="text-[13px] text-muted">Nothing here yet</span>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {notifications.map((n) => (
                    <NotificationRow key={n.id} n={n} onClose={close} />
                  ))}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Mobile bottom-nav bell icon — just the badge count for tapping. */
export function NotificationBadge({ onClick }: { onClick: () => void }) {
  const unread = useSyncExternalStore(subscribe, getUnreadCount, getUnreadCount);

  return (
    <button
      type="button"
      aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
      onClick={onClick}
      className="relative flex cursor-pointer items-center justify-center border-none bg-transparent p-0"
    >
      <motion.span
        key={unread}
        initial={unread ? { rotate: -14 } : false}
        animate={{ rotate: 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 12 }}
        className="material-symbols-rounded text-[24px] text-muted"
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
          className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-accent"
        />
      )}
    </button>
  );
}
