"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";

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

const LINKS = [
  { href: "/items", label: "Items", icon: ItemsIcon },
  { href: "/locations", label: "Locations", icon: LocationsIcon },
  { href: "/labels", label: "Labels", icon: LabelsIcon },
  { href: "/chat", label: "Chat", icon: ChatIcon },
  { href: "/capture", label: "Capture", icon: CaptureIcon },
  { href: "/receipts", label: "Receipts", icon: ReceiptsIcon },
  { href: "/maintenance", label: "Maintenance", icon: MaintenanceIcon },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      id="app-bottom-nav"
      className="no-scrollbar flex shrink-0 overflow-x-auto rounded-t-lg border-t border-border bg-surface-soft"
    >
      {LINKS.map(({ href, label, icon: LinkIcon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className="relative flex min-w-16 flex-1 flex-col items-center gap-1 py-2.5 md:gap-1.5 md:py-4"
          >
            {active && (
              <motion.span
                layoutId="bottom-nav-active"
                className="absolute inset-x-2 inset-y-1 rounded-md bg-surface"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <LinkIcon className={`relative h-5 w-5 md:h-6 md:w-6 ${active ? "text-ink" : "text-muted"}`} />
            <span
              className={`relative text-[10px] font-semibold transition-colors duration-150 md:text-xs ${active ? "text-ink" : "text-muted"}`}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
