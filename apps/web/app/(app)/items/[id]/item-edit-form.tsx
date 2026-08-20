"use client";

import { FormField, Input, Select, SubmitButton } from "@homebox-ai/ui";
import { useState } from "react";

import { currencyLabel, SUPPORTED_CURRENCIES } from "../../../../lib/currency";
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
    currency: string;
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
        <span className="self-start rounded-full bg-card px-2.5 py-1 text-xs font-semibold text-muted">
          Asset #{String(item.assetId).padStart(4, "0")}
        </span>
      )}

      <FormField label="Name">
        <Input name="name" defaultValue={item.name} required />
      </FormField>

      <FormField label="Description">
        <Input name="description" defaultValue={item.description ?? ""} />
      </FormField>

      <div className="flex flex-col gap-3 sm:flex-row">
        <FormField label="Quantity" flex>
          <Input name="quantity" type="number" min={1} defaultValue={item.quantity} />
        </FormField>
        <FormField label="Location" flex>
          <Select name="locationId" defaultValue={item.locationId ?? ""}>
            <option value="">No location</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      {otherItems.length > 0 && (
        <FormField label="Part of item">
          <Select name="parentItemId" defaultValue={item.parentItemId ?? ""}>
            <option value="">Not part of another item</option>
            {otherItems.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name}
              </option>
            ))}
          </Select>
        </FormField>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <FormField label="Manufacturer" flex>
          <Input name="manufacturer" defaultValue={item.manufacturer ?? ""} />
        </FormField>
        <FormField label="Model number" flex>
          <Input name="modelNumber" defaultValue={item.modelNumber ?? ""} />
        </FormField>
        <FormField label="Serial number" flex>
          <Input name="serialNumber" defaultValue={item.serialNumber ?? ""} />
        </FormField>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <FormField label="Currency" flex>
          <Select name="currency" defaultValue={item.currency}>
            {SUPPORTED_CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {currencyLabel(code)}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Purchase price" flex>
          <Input name="purchasePrice" defaultValue={item.purchasePrice ?? ""} placeholder="0.00" />
        </FormField>
        <FormField label="Purchase date" flex>
          <Input name="purchaseDate" type="date" defaultValue={item.purchaseDate ?? ""} />
        </FormField>
      </div>

      <FormField label="Purchased from">
        <Input name="purchaseFrom" defaultValue={item.purchaseFrom ?? ""} />
      </FormField>

      <FormField label="Warranty expires">
        <Input name="warrantyExpires" type="date" defaultValue={item.warrantyExpires ?? ""} />
      </FormField>

      <div className="flex flex-col gap-3 sm:flex-row">
        <FormField label="Sale price" flex>
          <Input name="salePrice" defaultValue={item.salePrice ?? ""} placeholder="0.00" />
        </FormField>
        <FormField label="Sale date" flex>
          <Input name="saleDate" type="date" defaultValue={item.saleDate ?? ""} />
        </FormField>
        <FormField label="Sold to" flex>
          <Input name="soldTo" defaultValue={item.soldTo ?? ""} />
        </FormField>
      </div>

      <FormField label="Sale notes">
        <Input name="soldNotes" defaultValue={item.soldNotes ?? ""} />
      </FormField>

      <FormField label="Notes">
        <Input name="notes" defaultValue={item.notes ?? ""} />
      </FormField>

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
