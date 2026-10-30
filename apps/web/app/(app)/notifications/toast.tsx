"use client";

import { toast, Toaster as SonnerToaster } from "sonner";

import { NOTIFICATION_ICON, NOTIFICATION_TONE, type NotificationKind } from "../../../lib/notifications";

/**
 * Homebox-styled sonner `<Toaster />` — drops in at the root layout level.
 * Uses CSS variable tokens so it follows light/dark automatically.
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      offset={16}
      gap={8}
      visibleToasts={4}
      toastOptions={{
        unstyled: true,
        className:
          "w-[min(380px,calc(100vw-32px))] rounded-[14px] border border-border bg-card p-3 shadow-[8px_12px_24px_-10px_rgba(31,38,34,.35)] text-body font-sans",
      }}
    />
  );
}

interface NotifyOptions {
  title: string;
  body?: string;
  kind?: NotificationKind;
  href?: string;
  /** Auto-dismiss after this many ms (default 5 000). Pass `Infinity` for persistent. */
  duration?: number;
}

/**
 * Fire a themed Homebox toast. Returns the toast id so it can be dismissed
 * programmatically (`toast.dismiss(id)`).
 */
export function notify({ title, body, kind = "info", href, duration = 5000 }: NotifyOptions) {
  return toast.custom(
    (id) => (
      <div
        className="flex w-full items-start gap-3"
        role={href ? "link" : undefined}
        onClick={
          href
            ? () => {
                window.location.href = href;
                toast.dismiss(id);
              }
            : undefined
        }
        style={href ? { cursor: "pointer" } : undefined}
      >
        <span
          aria-hidden
          className={`material-symbols-rounded flex h-9 w-9 flex-none items-center justify-center rounded-full ${NOTIFICATION_TONE[kind]}`}
          style={{ fontSize: 18 }}
        >
          {NOTIFICATION_ICON[kind]}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold leading-snug text-ink">{title}</span>
          {body && <span className="mt-[2px] block text-[13px] leading-snug text-body">{body}</span>}
        </span>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={(e) => {
            e.stopPropagation();
            toast.dismiss(id);
          }}
          className="flex flex-none cursor-pointer border-none bg-transparent p-0 text-muted hover:text-ink"
        >
          <span aria-hidden className="material-symbols-rounded text-[16px]">
            close
          </span>
        </button>
      </div>
    ),
    { duration },
  );
}
