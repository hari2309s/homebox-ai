"use client";

import { Input, Select, SubmitButton } from "@homebox-ai/ui";
import type { ReactNode } from "react";

import { toastItemCreated } from "../notifications/use-notifications";
import { createItemAction } from "./actions";

export function QuickAddForm({
  locationOptions,
  defaultLocationId,
}: {
  locationOptions: ReactNode;
  defaultLocationId: string;
}) {
  return (
    <form
      action={async (formData) => {
        await createItemAction(formData);
        toastItemCreated(String(formData.get("name") ?? ""));
      }}
      className="flex gap-2"
    >
      <Input name="name" placeholder="Quick add…" aria-label="New thing name" required className="flex-1" />
      <Select name="locationId" defaultValue={defaultLocationId} aria-label="Location" className="max-w-[140px]">
        <option value="">No location</option>
        {locationOptions}
      </Select>
      <SubmitButton className="!px-4" aria-label="Add thing">
        <span className="material-symbols-rounded text-[18px]">add</span>
      </SubmitButton>
    </form>
  );
}
