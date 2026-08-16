"use client";

import { TapButton } from "@homebox-ai/ui";

import { deleteItemAction } from "../actions";

export function DeleteItemButton({ itemId, itemName }: { itemId: string; itemName: string }) {
  return (
    <form
      action={async (formData) => {
        if (!confirm(`Delete "${itemName}"? This can't be undone.`)) return;
        await deleteItemAction(formData);
      }}
    >
      <input type="hidden" name="itemId" value={itemId} />
      <TapButton
        type="submit"
        className="cursor-pointer border-none bg-transparent text-sm font-semibold text-accent-hover"
      >
        Delete
      </TapButton>
    </form>
  );
}
