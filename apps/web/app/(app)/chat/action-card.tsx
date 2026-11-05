"use client";

import { TapButton, WalkingDots } from "@homebox-ai/ui";
import { useState } from "react";

import type { PendingAction } from "@homebox-ai/ai";

/* ------------------------------------------------------------------ */
/*  Per-action-type config (icon, colors, confirm label)               */
/* ------------------------------------------------------------------ */

interface ActionMeta {
  icon: string;
  iconBg: string;
  iconColor: string;
  label: string;
  confirmLabel: string;
}

const ACTION_META: Record<PendingAction["type"], ActionMeta> = {
  create_location: {
    icon: "location_on",
    iconBg: "var(--color-selected)",
    iconColor: "var(--color-accent)",
    label: "NEW LOCATION",
    confirmLabel: "Create it",
  },
  create_label: {
    icon: "sell",
    iconBg: "var(--color-selected)",
    iconColor: "var(--color-accent)",
    label: "NEW LABEL",
    confirmLabel: "Create it",
  },
  create_item: {
    icon: "add_circle",
    iconBg: "var(--color-selected)",
    iconColor: "var(--color-accent)",
    label: "NEW ITEM",
    confirmLabel: "Add it",
  },
  update_item: {
    icon: "move_item",
    iconBg: "var(--color-warn-soft)",
    iconColor: "var(--color-warn)",
    label: "UPDATE ITEM",
    confirmLabel: "Do it",
  },
  add_maintenance_entry: {
    icon: "build",
    iconBg: "var(--color-warn-soft)",
    iconColor: "var(--color-warn)",
    label: "MAINTENANCE LOG",
    confirmLabel: "Log it",
  },
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface ActionCardProps {
  action: PendingAction;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

/** Proposed-action card matching Design J6 Screen 31. */
export function ActionCard({ action, onConfirm, onCancel }: ActionCardProps) {
  const [pending, setPending] = useState(false);
  const meta = ACTION_META[action.type];

  async function handleConfirm() {
    setPending(true);
    try {
      await onConfirm();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[8px_12px_24px_-16px_rgba(0,0,0,.25)]">
      {/* Body */}
      <div className="flex items-center gap-[10px] px-3 py-[10px]">
        <span
          className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px]"
          style={{ background: meta.iconBg, color: meta.iconColor }}
        >
          <span className="material-symbols-rounded text-[20px]">{meta.icon}</span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-ink">{action.summary}</div>
          <div className="font-mono text-[10px] text-muted">{meta.label}</div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-[6px] border-t border-border/60 bg-surface-soft px-3 py-2">
        <span className="flex-1 text-[13px] text-muted">Confirm?</span>
        <TapButton
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="cursor-pointer rounded-lg border border-border bg-card px-[10px] py-[6px] text-[13px] font-semibold text-ink disabled:opacity-60"
        >
          Cancel
        </TapButton>
        <TapButton
          type="button"
          onClick={handleConfirm}
          disabled={pending}
          className="flex cursor-pointer items-center gap-1 rounded-lg border-none bg-accent px-[10px] py-[7px] text-[13px] font-semibold text-on-accent disabled:opacity-60"
        >
          {pending ? <WalkingDots size={5} /> : meta.confirmLabel}
        </TapButton>
      </div>
    </div>
  );
}
