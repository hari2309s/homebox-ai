"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { CHAT_LINK, HOME_LINK, isActive, ITEMS_LINK, PRIMARY_LINKS, SEASONS_LINK, TOOL_LINKS, type NavLink } from "./nav-links";

const TILE_STYLE: Record<string, { bg: string; color: string }> = {
  "/calendar": { bg: "#dfe8d6", color: "#3f6b45" },
  "/locations": { bg: "#dfe8d6", color: "#3f6b45" },
  "/labels": { bg: "#f6dde5", color: "#7a2f47" },
  "/capture": { bg: "#dfe8d6", color: "#3f6b45" },
  "/receipts": { bg: "#ecdccd", color: "#b0643f" },
  "/scan": { bg: "#e7e1d0", color: "#5a4f33" },
  "/maintenance": { bg: "#f6e7c4", color: "#6b4e10" },
  "/settings": { bg: "#e9e8e1", color: "#1f2622" },
};

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

export interface BottomNavMember {
  userId: string;
  initial: string;
  color: string;
}

interface BottomNavProps {
  unreadChatCount?: number;
  userName?: string;
  householdLabel?: string;
  members?: BottomNavMember[];
}

export function BottomNav({ unreadChatCount = 0, userName, householdLabel, members = [] }: BottomNavProps) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);

  const activeToolLink = TOOL_LINKS.find((link) => isActive(pathname, link.href));
  const primaryLinks = activeToolLink ? [HOME_LINK, ITEMS_LINK, CHAT_LINK, activeToolLink] : PRIMARY_LINKS;
  const moreLinks = activeToolLink
    ? [SEASONS_LINK, ...TOOL_LINKS.filter((l) => l.href !== activeToolLink.href)]
    : TOOL_LINKS;

  function renderLink({ href, label, icon }: NavLink) {
    const active = isActive(pathname, href);
    return (
      <Link
        key={href}
        href={href}
        className="relative flex min-w-16 flex-1 flex-col items-center gap-[3px] pt-[10px] pb-[10px]"
      >
        {active && (
          <motion.span
            layoutId="bottom-nav-bar"
            className="absolute top-0 h-[3px] w-[22px] rounded-b-[3px] bg-accent"
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          />
        )}
        <motion.span
          className="relative"
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
    <nav id="app-bottom-nav" className="relative shrink-0 border-t border-border bg-card lg:hidden">
      <AnimatePresence>
        {expanded && (
          <>
            <motion.div
              key="backdrop"
              className="fixed inset-0 z-40 bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setExpanded(false)}
            />
            <motion.div
              key="more-sheet"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="absolute inset-x-0 bottom-full z-50 flex flex-col gap-[14px] rounded-t-3xl bg-surface p-4 pb-[18px]"
            >
              {/* Household card */}
              {userName && (
                <Link
                  href="/settings/household"
                  onClick={() => setExpanded(false)}
                  className="flex items-center gap-3 rounded-[14px] border border-border bg-card p-[10px_12px] no-underline"
                >
                  <span
                    className="flex h-9 w-9 flex-none items-center justify-center rounded-full font-serif text-[16px] font-normal text-[#2c4d31]"
                    style={{ background: members[0]?.color ? `${members[0].color}30` : "#dfe8d6" }}
                  >
                    {members[0]?.initial ?? userName.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold text-ink">{householdLabel}</span>
                    <span className="block text-[12px] text-muted">
                      {members.length > 1
                        ? members.map((m) => m.initial).join(", ")
                        : "Invite someone"}
                    </span>
                  </span>
                  <span className="material-symbols-rounded text-[20px] text-faint">chevron_right</span>
                </Link>
              )}

              {/* Tool tiles */}
              <div className="grid grid-cols-3 gap-2">
                {moreLinks.map((link) => {
                  const style = TILE_STYLE[link.href];
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setExpanded(false)}
                      className="flex min-h-[72px] flex-col items-center gap-[6px] rounded-[14px] border border-border bg-card px-2 py-3 no-underline"
                    >
                      <span
                        className="material-symbols-rounded flex h-[38px] w-[38px] items-center justify-center rounded-[10px]"
                        style={{ background: style?.bg, color: style?.color, fontSize: 20 }}
                      >
                        {link.icon}
                      </span>
                      <span className="text-[13px] font-semibold text-ink">{link.label}</span>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="no-scrollbar flex">
        {primaryLinks.map((link) => renderLink(link))}
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          aria-label={expanded ? "Close menu" : "Show more tabs"}
          aria-expanded={expanded}
          className="relative flex min-w-16 flex-1 cursor-pointer flex-col items-center gap-[3px] border-none bg-transparent pt-[10px] pb-[10px]"
        >
          <motion.span
            whileTap={{ scale: 0.94 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <NavIcon name={expanded ? "close" : "more_horiz"} className={expanded ? "text-accent" : "text-muted"} />
          </motion.span>
          <span
            className={`text-[11px] font-semibold transition-colors duration-150 ${expanded ? "text-accent" : "text-muted"}`}
          >
            {expanded ? "Close" : "More"}
          </span>
        </button>
      </div>
    </nav>
  );
}
