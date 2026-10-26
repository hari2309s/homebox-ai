"use client";

import { ConfirmDialog, TapButton } from "@homebox-ai/ui";
import { unstable_rethrow } from "next/navigation";
import { useState } from "react";

import { deleteItemAction } from "../actions";

const FLOATING =
  "absolute right-4 top-[52px] flex h-[42px] w-[42px] cursor-pointer items-center justify-center rounded-xl border-none bg-rail text-ink shadow-card";

export function DeleteItemButton({
  itemId,
  itemName,
  className = FLOATING,
  icon = "more_horiz",
}: {
  itemId: string;
  itemName: string;
  className?: string;
  icon?: string;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    setDeleting(true);
    const formData = new FormData();
    formData.set("itemId", itemId);
    try {
      await deleteItemAction(formData);
    } catch (err) {
      unstable_rethrow(err);
      setError(err instanceof Error ? err.message : "Couldn't delete this item");
      setDeleting(false);
      setConfirmOpen(false);
    }
  }

  return (
    <>
      <TapButton
        type="button"
        onClick={() => setConfirmOpen(true)}
        aria-label={`Delete ${itemName}`}
        className={className}
      >
        <span className="material-symbols-rounded text-[20px]">{icon}</span>
      </TapButton>
      {error && (
        <p role="alert" className="absolute right-4 top-[98px] z-10 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger-ink">
          {error}
        </p>
      )}
      <ConfirmDialog
        open={confirmOpen}
        title={`Delete "${itemName}"?`}
        description="This can't be undone."
        confirmLabel="Delete"
        confirming={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
