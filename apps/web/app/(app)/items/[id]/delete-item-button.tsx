"use client";

import { ConfirmDialog, TapButton } from "@homebox-ai/ui";
import { useState } from "react";

import { deleteItemAction } from "../actions";

export function DeleteItemButton({ itemId, itemName }: { itemId: string; itemName: string }) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleDelete() {
    setConfirmOpen(false);
    const formData = new FormData();
    formData.set("itemId", itemId);
    await deleteItemAction(formData);
  }

  return (
    <>
      <TapButton
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="cursor-pointer border-none bg-transparent text-sm font-semibold text-accent-hover"
      >
        Delete
      </TapButton>
      <ConfirmDialog
        open={confirmOpen}
        title={`Delete "${itemName}"?`}
        description="This can't be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
