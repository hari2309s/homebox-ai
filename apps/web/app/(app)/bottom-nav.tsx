"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

function NavIcon({ name, filled, className }: { name: string; filled?: boolean; className?: string }) {
  return (
    <span
      className={className}
      style={{ fontFamily: "'Material Symbols Rounded'", fontSize: 24, fontVariationSettings: filled ? "'FILL' 1" : undefined }}
    >
      {name}
    </span>
  );
}

const HOME_LINK = { href: "/", label: "Plan", icon: "map" };
const ITEMS_LINK = { href: "/items", label: "Things", icon: "inventory_2" };
const CHAT_LINK = { href: "/chat", label: "Ask", icon: "forum" };
const SEASONS_LINK = { href: "/calendar", label: "Seasons", icon: "yard" };

const PRIMARY_LINKS = [HOME_LINK, ITEMS_LINK, CHAT_LINK, SEASONS_LINK];

const MORE_LINKS = [
  { href: "/locations", label: "Locations", icon: "location_on" },
  { href: "/labels", label: "Labels", icon: "sell" },
  { href: "/capture", label: "Capture", icon: "photo_camera" },
  { href: "/receipts", label: "Receipts", icon: "receipt_long" },
  { href: "/scan", label: "Scan", icon: "qr_code_scanner" },
  { href: "/maintenance", label: "Maintain", icon: "build" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

const ALL_LINKS = [...PRIMARY_LINKS, ...MORE_LINKS];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav({ unreadChatCount = 0 }: { unreadChatCount?: number }) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);

  const activeMoreLink = MORE_LINKS.find((link) => isActive(pathname, link.href));
  const mobilePrimaryLinks = activeMoreLink
    ? [HOME_LINK, ITEMS_LINK, CHAT_LINK, activeMoreLink]
    : PRIMARY_LINKS;
  const mobileMoreLinks = activeMoreLink
    ? [SEASONS_LINK, ...MORE_LINKS.filter((l) => l.href !== activeMoreLink.href)]
    : MORE_LINKS;

  function renderLink(
    { href, label, icon }: (typeof ALL_LINKS)[number],
    group: "mobile" | "desktop",
    onNavigate?: () => void,
  ) {
    const active = isActive(pathname, href);
    return (
      <Link
        key={href}
        href={href}
        onClick={onNavigate}
        className="relative flex min-w-16 flex-1 flex-col items-center gap-[3px] py-[10px]"
      >
        {active && (
          <motion.span
            layoutId={`bottom-nav-active-${group}`}
            className="absolute inset-x-2 inset-y-1 rounded-[10px] bg-surface"
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          />
        )}
        <motion.span
          className="relative"
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <NavIcon name={icon} filled={active} className={active ? "text-accent" : "text-muted"} />
          {href === "/chat" && unreadChatCount > 0 && (
            <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-accent" />
          )}
        </motion.span>
        <span
          className={`relative text-[11px] font-semibold transition-colors duration-150 ${active ? "text-accent" : "text-muted"}`}
        >
          {label}
        </span>
      </Link>
    );
  }

  return (
    <nav id="app-bottom-nav" className="relative shrink-0 border-t border-border bg-[#fbfaf6] dark:bg-card">
      <AnimatePresence>
        {expanded && (
          <>
            <motion.div
              key="backdrop"
              className="fixed inset-0 z-40 bg-black/30 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setExpanded(false)}
            />
            <motion.div
              key="more-panel"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="absolute inset-x-0 bottom-full z-50 grid grid-cols-4 gap-1 border border-b-0 border-border bg-[#fbfaf6] p-2 dark:bg-card md:hidden"
            >
              {mobileMoreLinks.map((link) => renderLink(link, "mobile", () => setExpanded(false)))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="no-scrollbar flex md:hidden">
        {mobilePrimaryLinks.map((link) => renderLink(link, "mobile"))}
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          aria-label={expanded ? "Show fewer tabs" : "Show more tabs"}
          aria-expanded={expanded}
          className="flex min-w-16 flex-1 cursor-pointer flex-col items-center gap-[3px] border-none bg-transparent py-[10px]"
        >
          <motion.span
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <NavIcon name="more_horiz" className={expanded ? "text-accent" : "text-muted"} />
          </motion.span>
          <span
            className={`text-[11px] font-semibold transition-colors duration-150 ${expanded ? "text-accent" : "text-muted"}`}
          >
            More
          </span>
        </button>
      </div>

      <div className="no-scrollbar hidden md:flex">
        {ALL_LINKS.map((link) => renderLink(link, "desktop"))}
      </div>
    </nav>
  );
}
