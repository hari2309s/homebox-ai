"use client";

import { ConfirmDialog, TapButton } from "@homebox-ai/ui";
import { unstable_rethrow } from "next/navigation";
import { useState } from "react";

import { deleteItemAction } from "../actions";

export function DeleteItemButton({ itemId, itemName }: { itemId: string; itemName: string }) {
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
        className="absolute right-4 top-[52px] flex h-[42px] w-[42px] cursor-pointer items-center justify-center rounded-xl border-none bg-[#fbfaf6] text-ink shadow-card dark:bg-card"
      >
        <span className="material-symbols-rounded">more_horiz</span>
      </TapButton>
      {error && (
        <p role="alert" className="absolute right-4 top-[98px] rounded-xl bg-[#ecdccd] px-3 py-2 text-sm text-[#5a2e18]">
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
