"use client";

import { AnimatedHomeboxIcon } from "@homebox-ai/ui";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";

import { subscribe, getUnreadCount } from "./notifications/notification-store";
import { NotificationSheet } from "./notifications/notification-sheet";

/** Map top-level pathname segments to human-readable page titles. */
const PAGE_TITLES: Record<string, string> = {
  "/": "Home",
  "/items": "Things",
  "/chat": "Ask",
  "/calendar": "Seasons",
  "/locations": "Places",
  "/labels": "Labels",
  "/capture": "Capture",
  "/receipts": "Receipts",
  "/scan": "Scan",
  "/maintenance": "Maintain",
  "/settings": "Settings",
};

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  // Match parent route: /items/abc → "Things", /settings/household → "Settings"
  const segment = "/" + pathname.split("/")[1];
  return PAGE_TITLES[segment] ?? "Homebox";
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

interface MobileHeaderProps {
  userName: string;
}

/** Persistent mobile header — app icon, greeting, page title, notification bell. */
export function MobileHeader({ userName }: MobileHeaderProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const unread = useSyncExternalStore(subscribe, getUnreadCount, getUnreadCount);

  const firstName = userName.split(" ")[0];
  const title = getPageTitle(pathname);
  const isHome = pathname === "/";

  return (
    <header className="flex shrink-0 items-center gap-3 px-4 pb-1 pt-3 lg:hidden">
      <AnimatedHomeboxIcon size={36} />
      <div className="min-w-0 flex-1">
        {isHome ? (
          <>
            <div className="text-[13px] text-muted">{getGreeting()},</div>
            <div className="truncate font-serif text-[18px] leading-tight text-ink">{firstName}</div>
          </>
        ) : (
          <>
            <div className="text-[11px] font-medium text-muted">{getGreeting()}, {firstName}</div>
            <div className="truncate font-serif text-[18px] leading-tight text-ink">{title}</div>
          </>
        )}
      </div>
      <button
        type="button"
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
        onClick={() => setOpen(true)}
        className="relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-[10px] border border-border bg-card shadow-card"
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
