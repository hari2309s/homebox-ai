"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { clearPendingInviteAction } from "./pending-invite-actions";

export function PendingInviteBanner({
  href,
  from,
  relationship,
}: {
  href: string;
  from: string;
  relationship: string | null;
}) {
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);
  if (hidden || pathname === href) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-3 top-3 z-[90] mx-auto flex max-w-[560px] items-center gap-3 rounded-[14px] border border-border bg-card p-3 shadow-[8px_12px_24px_-10px_rgba(31,38,34,.35)] lg:left-[232px]"
    >
      <span
        aria-hidden
        className="material-symbols-rounded flex h-9 w-9 flex-none items-center justify-center rounded-full bg-selected text-accent"
      >
        diversity_3
      </span>
      <span className="min-w-0 flex-1 text-[13px] leading-snug text-body">
        <b className="text-ink">You&apos;re invited to join {from}&apos;s household</b>
        {relationship ? ` as their ${relationship.toLowerCase()}` : ""}.
      </span>
      <Link
        href={href}
        className="flex-none rounded-[9px] bg-accent px-3 py-[7px] text-[12px] font-semibold text-white no-underline"
      >
        Review invite
      </Link>
      <button
        type="button"
        aria-label="Dismiss invite"
        onClick={() => {
          setHidden(true);
          void clearPendingInviteAction();
        }}
        className="flex flex-none cursor-pointer border-none bg-transparent p-0 text-muted hover:text-ink"
      >
        <span aria-hidden className="material-symbols-rounded text-[18px]">
          close
        </span>
      </button>
    </div>
  );
}
