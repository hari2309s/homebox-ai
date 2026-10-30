"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { CHAT_LINK, HOME_LINK, isActive, ITEMS_LINK, PRIMARY_LINKS, SEASONS_LINK, TOOL_LINKS, type NavLink } from "./nav-links";

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

export function BottomNav({ unreadChatCount = 0 }: { unreadChatCount?: number }) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);

  const activeToolLink = TOOL_LINKS.find((link) => isActive(pathname, link.href));
  const primaryLinks = activeToolLink ? [HOME_LINK, ITEMS_LINK, CHAT_LINK, activeToolLink] : PRIMARY_LINKS;
  const moreLinks = activeToolLink
    ? [SEASONS_LINK, ...TOOL_LINKS.filter((l) => l.href !== activeToolLink.href)]
    : TOOL_LINKS;

  function renderLink({ href, label, icon }: NavLink, onNavigate?: () => void) {
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
            layoutId="bottom-nav-active"
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
    <nav id="app-bottom-nav" className="relative shrink-0 border-t border-border bg-rail lg:hidden">
      <AnimatePresence>
        {expanded && (
          <>
            <motion.div
              key="backdrop"
              className="fixed inset-0 z-40 bg-black/30"
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
              className="absolute inset-x-0 bottom-full z-50 grid grid-cols-4 gap-1 border border-b-0 border-border bg-rail p-2"
            >
              {moreLinks.map((link) => renderLink(link, () => setExpanded(false)))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="no-scrollbar flex">
        {primaryLinks.map((link) => renderLink(link))}
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
    </nav>
  );
}
