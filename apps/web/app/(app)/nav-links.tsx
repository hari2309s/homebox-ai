"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/items", label: "Items" },
  { href: "/locations", label: "Locations" },
  { href: "/labels", label: "Labels" },
  { href: "/chat", label: "Chat" },
  { href: "/capture", label: "Capture" },
  { href: "/receipts", label: "Receipts" },
  { href: "/maintenance", label: "Maintenance" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <>
      {LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className="relative rounded-md px-3 py-1.5 text-sm font-semibold"
          >
            {active && (
              <motion.span
                layoutId="nav-active-pill"
                className="absolute inset-0 rounded-md bg-surface"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span
              className={`relative transition-colors duration-150 ${active ? "text-ink" : "text-muted hover:text-ink"}`}
            >
              {link.label}
            </span>
          </Link>
        );
      })}
    </>
  );
}
