"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState, type ReactNode } from "react";

import { LogoutButton } from "../logout-button";

export interface AccordionRow {
  slug: string;
  icon: string;
  title: string;
  sub: string;
  ibg: string;
  ic: string;
  bg?: string;
  bd?: string;
  tc?: string;
  content: ReactNode;
}

interface Props {
  displayName: string;
  email: string;
  avatarUrl: string | null;
  profileContent: ReactNode;
  rows: AccordionRow[];
}

export function MobileSettingsAccordion({ displayName, email, avatarUrl, profileContent, rows }: Props) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const initial = (displayName || email || "?").trim().charAt(0).toUpperCase();
  const profileOpen = openSlug === "profile";

  function toggle(slug: string) {
    setOpenSlug((prev) => (prev === slug ? null : slug));
  }

  return (
    <div className="flex flex-col gap-2 p-4 lg:hidden">
      {/* User card — expands profile section (avatar + name) */}
      <div className="overflow-hidden rounded-[14px] border border-border bg-card">
        <button
          type="button"
          onClick={() => toggle("profile")}
          className="flex w-full cursor-pointer items-center gap-3 border-none bg-transparent p-[10px_12px]"
        >
          <span className="flex h-12 w-12 flex-none items-center justify-center overflow-hidden rounded-full bg-[#dfe8d6]">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="font-serif text-[20px] text-[#2c4d31]">{initial}</span>
            )}
          </span>
          <div className="min-w-0 flex-1 text-left">
            <div className="truncate text-[15px] font-semibold text-ink">{displayName || email}</div>
            {displayName && <div className="truncate text-[12px] text-muted">{email}</div>}
          </div>
          <span className="text-[13px] font-semibold text-accent">{profileOpen ? "Close" : "Edit"}</span>
        </button>
        <AnimatePresence initial={false}>
          {profileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-3 px-3 pb-4 pt-1">{profileContent}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Accordion rows */}
      {rows.map((row) => {
        const isOpen = openSlug === row.slug;
        return (
          <div
            key={row.slug}
            className="overflow-hidden rounded-[14px] border"
            style={{ background: row.bg ?? "#fff", borderColor: row.bd ?? "#d9dbd2" }}
          >
            <button
              type="button"
              onClick={() => toggle(row.slug)}
              className="flex w-full min-h-[56px] cursor-pointer items-center gap-3 border-none bg-transparent px-3 py-3"
            >
              <span
                className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px]"
                style={{ background: row.ibg }}
              >
                <span className="material-symbols-rounded text-[18px]" style={{ color: row.ic }}>
                  {row.icon}
                </span>
              </span>
              <div className="min-w-0 flex-1 text-left">
                <div className="text-[14px] font-semibold" style={{ color: row.tc ?? "#1f2622" }}>
                  {row.title}
                </div>
                <div className="truncate text-[12px] text-muted">{row.sub}</div>
              </div>
              <motion.span
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="material-symbols-rounded text-[#a3aba5]"
              >
                expand_more
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col gap-3 px-3 pb-4 pt-1">{row.content}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      <LogoutButton variant="row" />

      <div className="pb-4 text-center font-mono text-[10px] text-muted">HOMEBOX &middot; SETTINGS</div>
    </div>
  );
}
