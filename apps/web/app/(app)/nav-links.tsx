"use client";

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
            className={
              active
                ? "rounded-md bg-surface px-3 py-1.5 text-sm font-semibold text-ink"
                : "rounded-md px-3 py-1.5 text-sm font-semibold text-muted transition-colors duration-150 hover:text-ink"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </>
  );
}
