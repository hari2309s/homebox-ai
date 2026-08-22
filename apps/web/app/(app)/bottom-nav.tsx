"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { useState } from "react";

function Icon(props: ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    />
  );
}

function HomeIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="m3 11 9-7 9 7" />
      <path d="M5 10v9a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1v-9" />
    </Icon>
  );
}

function ScanIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M4 8V6a2 2 0 0 1 2-2h2" />
      <path d="M16 4h2a2 2 0 0 1 2 2v2" />
      <path d="M20 16v2a2 2 0 0 1-2 2h-2" />
      <path d="M8 20H6a2 2 0 0 1-2-2v-2" />
      <path d="M4 12h16" />
    </Icon>
  );
}

function ItemsIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M3 8l9-5 9 5-9 5-9-5Z" />
      <path d="M3 8v8l9 5 9-5V8" />
      <path d="M12 13v8" />
    </Icon>
  );
}

function LocationsIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </Icon>
  );
}

function LabelsIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M20.6 13.4 11 3.8a2 2 0 0 0-1.4-.6L3.5 3l-.2 6.1a2 2 0 0 0 .6 1.4l9.6 9.6a2 2 0 0 0 2.8 0l4.3-4.3a2 2 0 0 0 0-2.8Z" />
      <circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none" />
    </Icon>
  );
}

function ChatIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M4 5h16v10H9l-4 4V5Z" />
    </Icon>
  );
}

function CaptureIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="13.5" r="3.25" />
    </Icon>
  );
}

function ReceiptsIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </Icon>
  );
}

function MaintenanceIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <circle cx="6" cy="18" r="2.75" />
      <circle cx="18" cy="6" r="2.75" />
      <path d="m8 16 8-8" />
    </Icon>
  );
}

function MoreIcon(props: ComponentProps<"svg">) {
  return (
    <Icon {...props}>
      <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </Icon>
  );
}

// Kept to 3 so the collapsed mobile bar always fits one row without
// scrolling — everything else lives behind "More", which opens a small grid
// popover above the bar (see `expanded` below) instead of extending the same
// row, which would need horizontal scrolling to reach.
const PRIMARY_LINKS = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/items", label: "Items", icon: ItemsIcon },
  { href: "/chat", label: "Chat", icon: ChatIcon },
];

const MORE_LINKS = [
  { href: "/locations", label: "Locations", icon: LocationsIcon },
  { href: "/labels", label: "Labels", icon: LabelsIcon },
  { href: "/capture", label: "Capture", icon: CaptureIcon },
  { href: "/receipts", label: "Receipts", icon: ReceiptsIcon },
  { href: "/scan", label: "Scan", icon: ScanIcon },
  { href: "/maintenance", label: "Maintenance", icon: MaintenanceIcon },
];

// Desktop has room to show every tab in one row (unchanged from before the
// "More" button existed).
const ALL_LINKS = [...PRIMARY_LINKS, ...MORE_LINKS];

export function BottomNav({ unreadChatCount = 0 }: { unreadChatCount?: number }) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const isOnHiddenLink = MORE_LINKS.some((link) => link.href === pathname);

  function renderLink({ href, label, icon: LinkIcon }: (typeof ALL_LINKS)[number], onNavigate?: () => void) {
    const active = pathname === href;
    return (
      <Link
        key={href}
        href={href}
        onClick={onNavigate}
        className="relative flex min-w-16 flex-1 flex-col items-center gap-1 py-2.5 md:gap-1.5 md:py-4"
      >
        {active && (
          <motion.span
            layoutId="bottom-nav-active"
            className="absolute inset-x-2 inset-y-1 rounded-md bg-surface"
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          />
        )}
        <motion.span
          className="relative"
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <LinkIcon className={`h-5 w-5 md:h-6 md:w-6 ${active ? "text-ink" : "text-muted"}`} />
          {href === "/chat" && unreadChatCount > 0 && (
            <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-accent" />
          )}
        </motion.span>
        <span
          className={`relative text-[10px] font-semibold transition-colors duration-150 md:text-xs ${active ? "text-ink" : "text-muted"}`}
        >
          {label}
        </span>
      </Link>
    );
  }

  return (
    <nav id="app-bottom-nav" className="relative shrink-0 rounded-t-lg border-t border-border bg-surface-soft">
      {/* Mobile-only popover, positioned above the bar itself rather than
          extending its row — a 3-column grid so all 6 extra destinations are
          reachable with a glance and a tap, not a horizontal scroll. */}
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
              className="absolute inset-x-0 bottom-full z-50 grid grid-cols-3 gap-1 rounded-t-lg border border-b-0 border-border bg-surface-soft p-2 md:hidden"
            >
              {MORE_LINKS.map((link) => renderLink(link, () => setExpanded(false)))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="no-scrollbar flex md:hidden">
        {PRIMARY_LINKS.map((link) => renderLink(link))}
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          aria-label={expanded ? "Show fewer tabs" : "Show more tabs"}
          aria-expanded={expanded}
          className="flex min-w-16 flex-1 cursor-pointer flex-col items-center gap-1 border-none bg-transparent py-2.5"
        >
          <motion.span
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <MoreIcon className={`h-5 w-5 ${isOnHiddenLink || expanded ? "text-ink" : "text-muted"}`} />
          </motion.span>
          <span
            className={`text-[10px] font-semibold transition-colors duration-150 ${isOnHiddenLink || expanded ? "text-ink" : "text-muted"}`}
          >
            {expanded ? "Less" : "More"}
          </span>
        </button>
      </div>

      <div className="no-scrollbar hidden md:flex">{ALL_LINKS.map((link) => renderLink(link))}</div>
    </nav>
  );
}
