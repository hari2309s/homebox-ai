"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { isActive, PRIMARY_LINKS, TOOL_LINKS, type NavLink } from "./nav-links";

export interface SidebarMember {
  userId: string;
  initial: string;
  color: string;
}

interface SidebarProps {
  itemCount: number;
  dueCount: number;
  unreadChatCount: number;
  userName: string;
  householdLabel: string;
  members: SidebarMember[];
}

function MiniPlanLogo() {
  return (
    <div className="relative h-9 w-9 flex-none overflow-hidden rounded-[9px] bg-selected">
      <span className="absolute left-1 top-[15px] h-[17px] w-[18px] rounded-[2px] border-[1.5px] border-ink bg-rail" />
      <span className="absolute left-6 top-[18px] h-[14px] w-[9px] rounded-[2px] border-[1.5px] border-[#7a3f22] bg-[#ecdccd]" />
      <span className="absolute left-[21px] top-[3px] h-[11px] w-[11px] rounded-full bg-[#7fa572]" />
    </div>
  );
}

export function Sidebar({ itemCount, dueCount, unreadChatCount, userName, householdLabel, members }: SidebarProps) {
  const pathname = usePathname();
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const badges: Record<string, string> = {
    "/items": itemCount > 0 ? String(itemCount) : "",
    "/calendar": dueCount > 0 ? String(dueCount) : "",
    "/chat": unreadChatCount > 0 ? String(unreadChatCount) : "",
  };

  function row(link: NavLink, variant: "main" | "tool") {
    const active = isActive(pathname, link.href);
    const main = variant === "main";
    return (
      <Link
        key={link.href}
        href={link.href}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-[10px] rounded-[10px] px-[10px] no-underline transition-colors duration-150 ${
          main ? "h-10 text-[14px] font-semibold" : "h-9 text-[13px] font-medium"
        } ${active ? "bg-selected text-ink" : "text-body hover:bg-surface-soft"}`}
      >
        <span
          className="material-symbols-rounded"
          style={{ fontSize: main ? 20 : 18, fontVariationSettings: active ? "'FILL' 1" : undefined }}
        >
          {link.icon}
        </span>
        <span className="flex-1">{link.label}</span>
        {main && badges[link.href] && (
          <span className="font-mono text-[10px] text-[#7a3f22] dark:text-[#e7a582]">{badges[link.href]}</span>
        )}
      </Link>
    );
  }

  return (
    <aside
      id="app-sidebar"
      className="hidden w-[232px] flex-none flex-col gap-[2px] border-r border-border bg-rail px-3 py-5 lg:flex"
    >
      <Link href="/" className="flex items-center gap-[10px] px-2 pb-4 no-underline">
        <MiniPlanLogo />
        <div className="min-w-0">
          <div className="font-serif text-[18px] leading-none text-ink">Homebox</div>
          <div className="mt-[3px] truncate font-mono text-[9px] uppercase text-muted">{householdLabel}</div>
        </div>
      </Link>

      <form action="/items" method="GET" role="search" className="mx-[2px] mb-3">
        <label className="flex h-[38px] items-center gap-2 rounded-[10px] border border-border bg-card px-[10px] text-[13px] text-muted focus-within:border-accent">
          <span className="material-symbols-rounded text-[18px]">search</span>
          <input
            ref={searchRef}
            name="q"
            type="search"
            placeholder="Search"
            aria-label="Search things"
            className="min-w-0 flex-1 border-none bg-transparent text-[13px] text-ink outline-none placeholder:text-muted"
          />
          <span className="rounded-[4px] bg-surface-soft px-[5px] py-[2px] font-mono text-[10px]">⌘K</span>
        </label>
      </form>

      {PRIMARY_LINKS.map((link) => row(link, "main"))}

      <div className="px-[10px] pb-[6px] pt-4 font-mono text-[9px] text-[#9aa49c]">TOOLS</div>
      {TOOL_LINKS.map((link) => row(link, "tool"))}

      <div className="flex-1" />

      <Link href="/settings/household" className="flex items-center gap-2 border-t border-border p-[10px] no-underline">
        <span className="flex">
          {members.slice(0, 3).map((member, i) => (
            <span
              key={member.userId}
              className="flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 border-rail text-[11px] font-bold text-white"
              style={{ background: member.color, marginLeft: i === 0 ? 0 : -8 }}
            >
              {member.initial}
            </span>
          ))}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold text-ink">{userName}</div>
          <div className="truncate text-[11px] text-muted">
            {members.length > 1 ? `${members.length} in household` : "Invite someone"}
          </div>
        </div>
      </Link>
    </aside>
  );
}
