"use client";

import type { ItemDraft } from "@homebox-ai/ai";
import { CapturePhotoPicker, FormField, Input, Select, SubmitButton } from "@homebox-ai/ui";
import { useRouter } from "next/navigation";
import type { ChangeEvent } from "react";
import { useRef, useState } from "react";

import { currencyLabel, normalizeCurrency, SUPPORTED_CURRENCIES } from "../../../lib/currency";
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

function StepHeader({ step, total, label }: { step: number; total: number; label: string }) {
  return (
    <div className="flex flex-col gap-3 px-4 pb-3 pt-1">
      <div className="flex-1 text-center">
        <div className="font-serif text-[19px] text-ink">Import a receipt</div>
        <div className="font-mono text-[10px] text-muted">
          STEP {step} OF {total} · {label.toUpperCase()}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className="h-[3px] rounded-full"
            style={{ background: i < step ? "#3f6b45" : "var(--color-border)" }}
          />
        ))}
      </div>
    </div>
  );
}

export function ReceiptForm({ locations, labels }: ReceiptFormProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [merchant, setMerchant] = useState<string | undefined>();
  const [purchaseDate, setPurchaseDate] = useState("");
  const [currency, setCurrency] = useState(normalizeCurrency(undefined));
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
      setCurrency(normalizeCurrency(draft.currency));
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
    setCurrency(normalizeCurrency(undefined));
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
    formData.set("currency", currency);
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
  const step = !rows ? (analyzing ? 2 : 1) : 3;

  if (!rows || rows.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <StepHeader step={step} total={3} label={analyzing ? "Reading" : "Upload"} />
        <CapturePhotoPicker
          previewUrl={previewUrl}
          analyzing={analyzing}
          analyzingLabel="Reading your receipt…"
          error={error}
          placeholder="Snap or drop a receipt. I'll pull out each line item, the store and the date."
          pickerLabel="Take or upload a receipt photo"
          retakeLabel="Retake photo"
          fileInputRef={fileInputRef}
          onFileChange={handleFileChange}
        />
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="flex h-full flex-col">
      <StepHeader step={3} total={3} label="Choose" />

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4">
        {merchant && (
          <p className="font-mono text-[11px] text-muted">{merchant.toUpperCase()}</p>
        )}

        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {rows.map((row) => (
            <li key={row.key} className="flex items-center gap-2 rounded-[14px] border border-border bg-card p-3">
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
          <FormField label="Currency" flex>
            <Select value={currency} onChange={(event) => setCurrency(normalizeCurrency(event.target.value))}>
              {SUPPORTED_CURRENCIES.map((code) => (
                <option key={code} value={code}>{currencyLabel(code)}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Purchase date" flex>
            <Input name="purchaseDate" type="date" value={purchaseDate} onChange={(event) => setPurchaseDate(event.target.value)} />
          </FormField>
          <FormField label="Location" flex>
            <Select name="locationId" defaultValue="">
              <option value="">No location</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>{location.name}</option>
              ))}
            </Select>
          </FormField>
        </div>

        {labels.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {labels.map((label) => (
              <label
                key={label.id}
                className="flex items-center gap-2 rounded-[10px] border border-border bg-card px-[10px] py-[7px] text-[13px] font-medium text-ink"
              >
                <input type="checkbox" name="labelIds" value={label.id} className="accent-accent" />
                {label.name}
              </label>
            ))}
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-xl bg-[#ecdccd] px-3 py-2.5 text-sm text-[#5a2e18]">
            {error}
          </p>
        )}
      </div>

      <div className="flex flex-col items-center gap-[10px] border-t border-border bg-surface px-4 pb-[30px] pt-[14px]">
        <SubmitButton disabled={includedCount === 0} className="w-full">
          Import {includedCount} item{includedCount === 1 ? "" : "s"}
        </SubmitButton>
        <button
          type="button"
          onClick={reset}
          className="flex cursor-pointer items-center gap-1 border-none bg-transparent text-sm font-semibold text-accent"
        >
          <span className="material-symbols-rounded text-base">restart_alt</span>
          Start over
        </button>
      </div>
    </form>
  );
}
