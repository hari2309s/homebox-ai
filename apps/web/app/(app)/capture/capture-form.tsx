"use client";

import type { ItemDraft } from "@homebox-ai/ai";
import { CapturePhotoPicker, FormField, Input, Select, SubmitButton, TapButton } from "@homebox-ai/ui";
import { useRouter } from "next/navigation";
import type { ChangeEvent } from "react";
import { useRef, useState } from "react";

import { currencyLabel, normalizeCurrency, SUPPORTED_CURRENCIES } from "../../../lib/currency";
import { analyzePhotoAction, createItemFromCaptureAction } from "./actions";

interface CaptureFormProps {
  locations: { id: string; name: string }[];
  labels: { id: string; name: string }[];
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

  if (!draft) {
    return (
      <CapturePhotoPicker
        previewUrl={previewUrl}
        analyzing={analyzing}
        analyzingLabel="Looking at your photo…"
        error={error}
        placeholder="Take or upload a photo to get started."
        pickerLabel="Take or upload a photo"
        retakeLabel="Retake photo"
        fileInputRef={fileInputRef}
        onFileChange={handleFileChange}
      />
    );
  }

  return (
    <form action={handleSubmit} className="flex h-full flex-col">
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6 md:mx-auto md:w-full md:max-w-2xl">
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- locally-selected blob URL, not a network image
          <img src={previewUrl} alt="" className="max-h-48 w-auto self-center rounded-md object-contain" />
        )}

        <div className="flex flex-col gap-3">
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
                  <option key={code} value={code}>
                    {currencyLabel(code)}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Purchase price" flex>
              <Input name="purchasePrice" defaultValue={draft.purchasePrice ?? ""} placeholder="0.00" />
            </FormField>
            <FormField label="Purchase date" flex>
              <Input name="purchaseDate" type="date" defaultValue={draft.purchaseDate ?? ""} />
            </FormField>
          </div>
          <FormField label="Location">
            <Select name="locationId" defaultValue={matchedLocationId ?? ""}>
              <option value="">No location</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </Select>
          </FormField>
          {labels.length > 0 && (
            <fieldset className="flex flex-wrap gap-3 border-none p-0">
              {labels.map((label) => (
                <label key={label.id} className="flex items-center gap-1.5 text-sm text-body">
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
            </fieldset>
          )}
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-accent/10 px-3 py-2 text-sm text-accent-hover">
            {error}
          </p>
        )}
      </div>

      <div className="shrink-0 border-t border-border bg-card p-4 md:p-6">
        <div className="flex items-center justify-center gap-3 md:mx-auto md:w-full md:max-w-2xl">
          <SubmitButton>Save item</SubmitButton>
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
