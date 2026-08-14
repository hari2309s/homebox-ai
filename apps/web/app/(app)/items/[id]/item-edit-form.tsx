"use client";

import { Input, Select, SubmitButton } from "@homebox-ai/ui";

import { updateItemAction } from "../actions";

interface ItemEditFormProps {
  item: {
    id: string;
    name: string;
    description: string | null;
    quantity: number;
    purchasePrice: string | null;
    purchaseDate: string | null;
    salePrice: string | null;
    saleDate: string | null;
    warrantyExpires: string | null;
    locationId: string | null;
    notes: string | null;
  };
  locations: { id: string; name: string }[];
  labels: { id: string; name: string }[];
  selectedLabelIds: string[];
}

export function ItemEditForm({ item, locations, labels, selectedLabelIds }: ItemEditFormProps) {
  const selected = new Set(selectedLabelIds);

  return (
    <form action={updateItemAction} className="flex flex-col gap-4 rounded-md border border-border bg-surface-soft p-4">
      <input type="hidden" name="itemId" value={item.id} />

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
        Name
        <Input name="name" defaultValue={item.name} required />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
        Description
        <Input name="description" defaultValue={item.description ?? ""} />
      </label>

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex flex-1 flex-col gap-1.5 text-sm font-semibold text-ink">
          Quantity
          <Input name="quantity" type="number" min={1} defaultValue={item.quantity} />
        </label>
        <label className="flex flex-1 flex-col gap-1.5 text-sm font-semibold text-ink">
          Location
          <Select name="locationId" defaultValue={item.locationId ?? ""}>
            <option value="">No location</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </Select>
        </label>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex flex-1 flex-col gap-1.5 text-sm font-semibold text-ink">
          Purchase price
          <Input name="purchasePrice" defaultValue={item.purchasePrice ?? ""} placeholder="0.00" />
        </label>
        <label className="flex flex-1 flex-col gap-1.5 text-sm font-semibold text-ink">
          Purchase date
          <Input name="purchaseDate" type="date" defaultValue={item.purchaseDate ?? ""} />
        </label>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex flex-1 flex-col gap-1.5 text-sm font-semibold text-ink">
          Sale price
          <Input name="salePrice" defaultValue={item.salePrice ?? ""} placeholder="0.00" />
        </label>
        <label className="flex flex-1 flex-col gap-1.5 text-sm font-semibold text-ink">
          Sale date
          <Input name="saleDate" type="date" defaultValue={item.saleDate ?? ""} />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
        Warranty expires
        <Input name="warrantyExpires" type="date" defaultValue={item.warrantyExpires ?? ""} />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
        Notes
        <Input name="notes" defaultValue={item.notes ?? ""} />
      </label>

      {labels.length > 0 && (
        <fieldset className="flex flex-wrap gap-3 border-none p-0">
          {labels.map((label) => (
            <label key={label.id} className="flex items-center gap-1.5 text-sm text-body">
              <input
                type="checkbox"
                name="labelIds"
                value={label.id}
                defaultChecked={selected.has(label.id)}
                className="accent-accent"
              />
              {label.name}
            </label>
          ))}
        </fieldset>
      )}

      <SubmitButton className="self-start">Save changes</SubmitButton>
    </form>
  );
}
