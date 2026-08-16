"use client";

import type { ItemDraft } from "@homebox-ai/ai";
import { CapturePhotoPicker, Input, Select, SubmitButton, TapButton } from "@homebox-ai/ui";
import { useRouter } from "next/navigation";
import type { ChangeEvent } from "react";
import { useRef, useState } from "react";

import { analyzeReceiptAction, importReceiptItemsAction } from "./actions";

interface ReceiptFormProps {
  locations: { id: string; name: string }[];
  labels: { id: string; name: string }[];
}

interface DraftRow {
  key: string;
  included: boolean;
  name: string;
  quantity: number;
  purchasePrice: string;
}

export function ReceiptForm({ locations, labels }: ReceiptFormProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [merchant, setMerchant] = useState<string | undefined>();
  const [purchaseDate, setPurchaseDate] = useState("");
  const [rows, setRows] = useState<DraftRow[] | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setRows(null);
    setError(null);
    setAnalyzing(true);

    try {
      const formData = new FormData();
      formData.set("photo", selected);
      const draft = await analyzeReceiptAction(formData);
      setMerchant(draft.merchant);
      setPurchaseDate(draft.purchaseDate ?? "");
      setRows(
        draft.items.map((item) => ({
          key: crypto.randomUUID(),
          included: true,
          name: item.name,
          quantity: item.quantity,
          purchasePrice: item.purchasePrice ?? "",
        })),
      );
      if (draft.items.length === 0) setError("Couldn't find any line items on that receipt");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't analyze that receipt");
    } finally {
      setAnalyzing(false);
    }
  }

  function updateRow(key: string, patch: Partial<DraftRow>) {
    setRows((prev) => prev?.map((row) => (row.key === key ? { ...row, ...patch } : row)) ?? null);
  }

  function reset() {
    setFile(null);
    setPreviewUrl(null);
    setRows(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(formData: FormData) {
    const included = rows?.filter((row) => row.included) ?? [];
    if (included.length === 0) {
      setError("Select at least one item to import");
      return;
    }

    setError(null);
    if (file) formData.set("photo", file);
    formData.set(
      "items",
      JSON.stringify(
        included.map((row): ItemDraft => ({
          name: row.name,
          quantity: row.quantity,
          purchasePrice: row.purchasePrice || undefined,
        })),
      ),
    );

    try {
      await importReceiptItemsAction(formData);
      router.push("/items");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't import these items");
    }
  }

  const includedCount = rows?.filter((row) => row.included).length ?? 0;

  if (!rows || rows.length === 0) {
    return (
      <CapturePhotoPicker
        previewUrl={previewUrl}
        analyzing={analyzing}
        analyzingLabel="Reading your receipt…"
        error={error}
        placeholder="Take or upload a receipt photo to get started."
        pickerLabel="Take or upload a receipt photo"
        retakeLabel="Retake photo"
        fileInputRef={fileInputRef}
        onFileChange={handleFileChange}
      />
    );
  }

  return (
    <form action={handleSubmit} className="flex h-full flex-col">
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6 md:mx-auto md:w-full md:max-w-2xl">
        {merchant && <p className="text-sm text-muted">From {merchant}</p>}

        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {rows.map((row) => (
            <li key={row.key} className="flex items-center gap-2 rounded-md border border-border p-2.5">
              <input
                type="checkbox"
                checked={row.included}
                onChange={(event) => updateRow(row.key, { included: event.target.checked })}
                className="accent-accent"
              />
              <Input
                value={row.name}
                onChange={(event) => updateRow(row.key, { name: event.target.value })}
                disabled={!row.included}
                className="flex-1"
                aria-label="Item name"
              />
              <Input
                type="number"
                min={1}
                value={row.quantity}
                onChange={(event) => updateRow(row.key, { quantity: Number(event.target.value) || 1 })}
                disabled={!row.included}
                className="w-16"
                aria-label="Quantity"
              />
              <Input
                value={row.purchasePrice}
                onChange={(event) => updateRow(row.key, { purchasePrice: event.target.value })}
                disabled={!row.included}
                placeholder="0.00"
                className="w-24"
                aria-label="Price"
              />
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex flex-1 flex-col gap-1.5 text-sm font-semibold text-ink">
            Purchase date
            <Input
              name="purchaseDate"
              type="date"
              value={purchaseDate}
              onChange={(event) => setPurchaseDate(event.target.value)}
            />
          </label>
          <label className="flex flex-1 flex-col gap-1.5 text-sm font-semibold text-ink">
            Location
            <Select name="locationId" defaultValue="">
              <option value="">No location</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </Select>
          </label>
        </div>

        {labels.length > 0 && (
          <fieldset className="flex flex-wrap gap-3 border-none p-0">
            {labels.map((label) => (
              <label key={label.id} className="flex items-center gap-1.5 text-sm text-body">
                <input type="checkbox" name="labelIds" value={label.id} className="accent-accent" />
                {label.name}
              </label>
            ))}
          </fieldset>
        )}

        {error && (
          <p role="alert" className="rounded-md bg-accent/10 px-3 py-2 text-sm text-accent-hover">
            {error}
          </p>
        )}
      </div>

      <div className="shrink-0 border-t border-border bg-white p-4 md:p-6">
        <div className="flex items-center justify-center gap-3 md:mx-auto md:w-full md:max-w-2xl">
          <SubmitButton disabled={includedCount === 0}>
            Import {includedCount} item{includedCount === 1 ? "" : "s"}
          </SubmitButton>
          <TapButton
            type="button"
            onClick={reset}
            className="cursor-pointer border-none bg-transparent text-sm font-semibold text-ink"
          >
            Start over
          </TapButton>
        </div>
      </div>
    </form>
  );
}
