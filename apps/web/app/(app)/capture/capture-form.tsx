"use client";

import type { ItemDraft } from "@homebox-ai/ai";
import { CapturePhotoPicker, FormField, Input, Select, SubmitButton } from "@homebox-ai/ui";
import { useRouter } from "next/navigation";
import type { ChangeEvent } from "react";
import { useRef, useState } from "react";

import { currencyLabel, normalizeCurrency, SUPPORTED_CURRENCIES } from "../../../lib/currency";
import { analyzePhotoAction, createItemFromCaptureAction } from "./actions";

interface CaptureFormProps {
  locations: { id: string; name: string }[];
  labels: { id: string; name: string }[];
}

function StepHeader({ step, total, label }: { step: number; total: number; label: string }) {
  return (
    <div className="flex flex-col gap-3 px-4 pb-3 pt-1">
      <div className="flex items-center gap-3">
        <div className="flex-1 text-center">
          <div className="font-serif text-[19px] text-ink">Add a thing</div>
          <div className="font-mono text-[10px] text-muted">
            STEP {step} OF {total} · {label.toUpperCase()}
          </div>
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

export function CaptureForm({ locations, labels }: CaptureFormProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [draft, setDraft] = useState<ItemDraft | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setDraft(null);
    setError(null);
    setAnalyzing(true);

    try {
      const formData = new FormData();
      formData.set("photo", selected);
      setDraft(await analyzePhotoAction(formData));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't analyze that photo");
    } finally {
      setAnalyzing(false);
    }
  }

  function reset() {
    setFile(null);
    setPreviewUrl(null);
    setDraft(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(formData: FormData) {
    if (file) formData.set("photo", file);
    try {
      await createItemFromCaptureAction(formData);
      router.push("/items");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save this item");
    }
  }

  const suggestedLocation = draft?.suggestedLocation;
  const matchedLocationId = suggestedLocation
    ? locations.find((location) => location.name.toLowerCase() === suggestedLocation.toLowerCase())?.id
    : undefined;
  const suggestedLabel = draft?.suggestedLabel;
  const matchedLabelId = suggestedLabel
    ? labels.find((label) => label.name.toLowerCase() === suggestedLabel.toLowerCase())?.id
    : undefined;

  const step = !draft ? (analyzing ? 2 : 1) : 3;

  if (!draft) {
    return (
      <div className="flex h-full flex-col">
        <StepHeader step={step} total={3} label={analyzing ? "Reading" : "Photo"} />
        <CapturePhotoPicker
          previewUrl={previewUrl}
          analyzing={analyzing}
          analyzingLabel="Looking at your photo…"
          error={error}
          placeholder="Get the whole thing in frame. A brand plate or tag helps me fill in the details."
          pickerLabel="Take or upload a photo"
          retakeLabel="Retake photo"
          fileInputRef={fileInputRef}
          onFileChange={handleFileChange}
        />
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="flex h-full flex-col">
      <StepHeader step={3} total={3} label="Check" />

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4">
        {previewUrl && (
          <div className="flex items-center gap-3 rounded-[14px] border border-border bg-card p-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- locally-selected blob URL */}
            <img src={previewUrl} alt="Preview" className="h-16 w-16 rounded-[10px] object-cover" />
            <div className="flex-1 text-[13px] leading-relaxed text-body">
              Here&apos;s what I found. Fields marked{" "}
              <span className="material-symbols-rounded align-middle text-sm text-accent">auto_awesome</span>{" "}
              are my guesses.
            </div>
          </div>
        )}

        <FormField label="Name">
          <Input name="name" defaultValue={draft.name} required />
        </FormField>
        <FormField label="Description">
          <Input name="description" defaultValue={draft.description ?? ""} />
        </FormField>
        <div className="flex flex-col gap-3 sm:flex-row">
          <FormField label="Quantity" flex>
            <Input name="quantity" type="number" min={1} defaultValue={draft.quantity} />
          </FormField>
          <FormField label="Currency" flex>
            <Select name="currency" defaultValue={normalizeCurrency(draft.currency)}>
              {SUPPORTED_CURRENCIES.map((code) => (
                <option key={code} value={code}>{currencyLabel(code)}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Price" flex>
            <Input name="purchasePrice" defaultValue={draft.purchasePrice ?? ""} placeholder="0.00" />
          </FormField>
          <FormField label="Bought" flex>
            <Input name="purchaseDate" type="date" defaultValue={draft.purchaseDate ?? ""} />
          </FormField>
        </div>
        <FormField label="Location">
          <Select name="locationId" defaultValue={matchedLocationId ?? ""}>
            <option value="">No location</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>{location.name}</option>
            ))}
          </Select>
        </FormField>
        {labels.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-body">Labels</span>
            <div className="flex flex-wrap gap-2">
              {labels.map((label) => (
                <label
                  key={label.id}
                  className="flex items-center gap-2 rounded-[10px] border border-border bg-card px-[10px] py-[7px] text-[13px] font-medium text-ink"
                >
                  <input
                    type="checkbox"
                    name="labelIds"
                    value={label.id}
                    defaultChecked={label.id === matchedLabelId}
                    className="accent-accent"
                  />
                  {label.name}
                </label>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger-ink">
            {error}
          </p>
        )}
      </div>

      <div className="flex flex-col items-center gap-[10px] border-t border-border bg-surface px-4 pb-[30px] pt-[14px]">
        <SubmitButton className="w-full">Save item</SubmitButton>
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
