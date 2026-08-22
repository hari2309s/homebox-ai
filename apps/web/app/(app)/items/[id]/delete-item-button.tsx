"use client";

import { ConfirmDialog, TapButton } from "@homebox-ai/ui";
import { unstable_rethrow } from "next/navigation";
import { useState } from "react";

import { deleteItemAction } from "../actions";

export function DeleteItemButton({ itemId, itemName }: { itemId: string; itemName: string }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setConfirmOpen(false);
    setError(null);
    const formData = new FormData();
    formData.set("itemId", itemId);
    try {
      await deleteItemAction(formData);
    } catch (err) {
      // deleteItemAction redirects on success, which Next.js implements by
      // throwing a special control-flow error — let that one keep propagating
      // instead of treating it as a failed delete.
      unstable_rethrow(err);
      setError(err instanceof Error ? err.message : "Couldn't delete this item");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <TapButton
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="cursor-pointer border-none bg-transparent text-sm font-semibold text-accent-hover"
      >
        Delete
      </TapButton>
      {error && (
        <p role="alert" className="text-sm text-accent-hover">
          {error}
        </p>
      )}
      <ConfirmDialog
        open={confirmOpen}
        title={`Delete "${itemName}"?`}
        description="This can't be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
