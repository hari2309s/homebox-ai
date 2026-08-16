"use client";

import { Input, Select, SubmitButton } from "@homebox-ai/ui";
import { useState } from "react";

import { updateItemAction } from "../actions";

interface ItemEditFormProps {
  item: {
    id: string;
    name: string;
    description: string | null;
    quantity: number;
    assetId: number | null;
    serialNumber: string | null;
    modelNumber: string | null;
    manufacturer: string | null;
    insured: boolean;
    archived: boolean;
    lifetimeWarranty: boolean;
    purchasePrice: string | null;
    purchaseDate: string | null;
    purchaseFrom: string | null;
    salePrice: string | null;
    saleDate: string | null;
    soldTo: string | null;
    soldNotes: string | null;
    warrantyExpires: string | null;
    locationId: string | null;
    parentItemId: string | null;
    notes: string | null;
  };
  locations: { id: string; name: string }[];
  labels: { id: string; name: string; color: string | null }[];
  otherItems: { id: string; name: string }[];
  selectedLabelIds: string[];
}

export function ItemEditForm({ item, locations, labels, otherItems, selectedLabelIds }: ItemEditFormProps) {
  const selected = new Set(selectedLabelIds);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    try {
      await updateItemAction(formData);
    } catch (err) {
      // e.g. setting "Part of item" to one of this item's own sub-items — a
      // plain user mistake, not a crash: show it inline instead of letting
      // the throw reach Next's uncaught-error page.
      setError(err instanceof Error ? err.message : "Couldn't save that change");
    }
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4 rounded-md border border-border bg-surface-soft p-4">
      <input type="hidden" name="itemId" value={item.id} />

      {item.assetId != null && (
        <span className="self-start rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-muted">
          Asset #{String(item.assetId).padStart(4, "0")}
        </span>
      )}

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

      {otherItems.length > 0 && (
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
          Part of item
          <Select name="parentItemId" defaultValue={item.parentItemId ?? ""}>
            <option value="">Not part of another item</option>
            {otherItems.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name}
              </option>
            ))}
          </Select>
        </label>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex flex-1 flex-col gap-1.5 text-sm font-semibold text-ink">
          Manufacturer
          <Input name="manufacturer" defaultValue={item.manufacturer ?? ""} />
        </label>
        <label className="flex flex-1 flex-col gap-1.5 text-sm font-semibold text-ink">
          Model number
          <Input name="modelNumber" defaultValue={item.modelNumber ?? ""} />
        </label>
        <label className="flex flex-1 flex-col gap-1.5 text-sm font-semibold text-ink">
          Serial number
          <Input name="serialNumber" defaultValue={item.serialNumber ?? ""} />
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
        <label className="flex flex-1 flex-col gap-1.5 text-sm font-semibold text-ink">
          Purchased from
          <Input name="purchaseFrom" defaultValue={item.purchaseFrom ?? ""} />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
        Warranty expires
        <Input name="warrantyExpires" type="date" defaultValue={item.warrantyExpires ?? ""} />
      </label>

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex flex-1 flex-col gap-1.5 text-sm font-semibold text-ink">
          Sale price
          <Input name="salePrice" defaultValue={item.salePrice ?? ""} placeholder="0.00" />
        </label>
        <label className="flex flex-1 flex-col gap-1.5 text-sm font-semibold text-ink">
          Sale date
          <Input name="saleDate" type="date" defaultValue={item.saleDate ?? ""} />
        </label>
        <label className="flex flex-1 flex-col gap-1.5 text-sm font-semibold text-ink">
          Sold to
          <Input name="soldTo" defaultValue={item.soldTo ?? ""} />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
        Sale notes
        <Input name="soldNotes" defaultValue={item.soldNotes ?? ""} />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
        Notes
        <Input name="notes" defaultValue={item.notes ?? ""} />
      </label>

      <fieldset className="flex flex-wrap gap-4 border-none p-0">
        <label className="flex items-center gap-1.5 text-sm text-body">
          <input type="checkbox" name="insured" defaultChecked={item.insured} className="accent-accent" />
          Insured
        </label>
        <label className="flex items-center gap-1.5 text-sm text-body">
          <input
            type="checkbox"
            name="lifetimeWarranty"
            defaultChecked={item.lifetimeWarranty}
            className="accent-accent"
          />
          Lifetime warranty
        </label>
        <label className="flex items-center gap-1.5 text-sm text-body">
          <input type="checkbox" name="archived" defaultChecked={item.archived} className="accent-accent" />
          Archived
        </label>
      </fieldset>

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
              {label.color && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: label.color }} />}
              {label.name}
            </label>
          ))}
        </fieldset>
      )}

      {error && (
        <p role="alert" className="text-sm text-accent-hover">
          {error}
        </p>
      )}

      <SubmitButton className="self-start">Save changes</SubmitButton>
    </form>
  );
}
