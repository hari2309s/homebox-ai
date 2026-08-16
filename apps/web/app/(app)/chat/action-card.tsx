"use client";

import { Spinner, TapButton } from "@homebox-ai/ui";
import { useState } from "react";

import type { PendingAction } from "@homebox-ai/ai";

const ACTION_LABELS: Record<PendingAction["type"], string> = {
  create_location: "New location",
  create_label: "New label",
  create_item: "New item",
  update_item: "Update item",
  add_maintenance_entry: "Maintenance entry",
};

interface ActionCardProps {
  action: PendingAction;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

/** Shown in place of a plain reply bubble when the assistant proposes a create/update/log action — nothing happens until the user picks one of these. */
export function ActionCard({ action, onConfirm, onCancel }: ActionCardProps) {
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    setPending(true);
    try {
      await onConfirm();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-accent/30 bg-white p-4 text-sm shadow-sm">
      <span className="w-fit rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent-hover">
        {ACTION_LABELS[action.type]}
      </span>
      <p className="m-0 text-body">{action.summary}</p>
      <div className="flex gap-2">
        <TapButton
          type="button"
          onClick={handleConfirm}
          disabled={pending}
          whileHover={pending ? undefined : { scale: 1.02 }}
          className="flex flex-1 cursor-pointer items-center justify-center rounded-md bg-accent px-3 py-2 font-bold text-white transition-colors duration-150 hover:bg-accent-hover disabled:cursor-default disabled:opacity-60"
        >
          {pending ? <Spinner size={16} /> : "Confirm"}
        </TapButton>
        <TapButton
          type="button"
          onClick={onCancel}
          disabled={pending}
          whileHover={pending ? undefined : { scale: 1.02 }}
          className="cursor-pointer rounded-md border border-border bg-white px-3 py-2 font-semibold text-body transition-colors duration-150 hover:border-accent disabled:cursor-default disabled:opacity-60"
        >
          Cancel
        </TapButton>
      </div>
    </div>
  );
}
