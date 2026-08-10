"use client";

import type { ItemDraft } from "@homebox-ai/ai";
import { Input, Select, Spinner, SubmitButton } from "@homebox-ai/ui";
import { useRouter } from "next/navigation";
import type { ChangeEvent } from "react";
import { useRef, useState } from "react";

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

  const photoPicker = (
    <label className="cursor-pointer rounded-md bg-accent px-4 py-2.5 font-bold text-white transition-colors duration-150 hover:bg-accent-hover">
      {previewUrl ? "Retake photo" : "Take or upload a photo"}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
    </label>
  );

  if (!draft) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 overflow-y-auto p-4 text-center sm:p-6">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- locally-selected blob URL, not a network image
            <img src={previewUrl} alt="" className="max-h-64 w-auto rounded-md object-contain" />
          ) : (
            <p className="text-sm text-muted">Take or upload a photo to get started.</p>
          )}
          {analyzing && (
            <div className="flex items-center gap-2 text-muted">
              <Spinner size={16} />
              <span className="text-sm">Looking at your photo…</span>
            </div>
          )}
          {error && (
            <p role="alert" className="rounded-md bg-accent/10 px-3 py-2 text-sm text-accent-hover">
              {error}
            </p>
          )}
        </div>
        <div className="shrink-0 border-t border-border bg-white p-4 md:p-6">
          <div className="flex md:mx-auto md:w-full md:max-w-2xl">{photoPicker}</div>
        </div>
      </div>
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
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
            Name
            <Input name="name" defaultValue={draft.name} required />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
            Description
            <Input name="description" defaultValue={draft.description ?? ""} />
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="flex flex-1 flex-col gap-1.5 text-sm font-semibold text-ink">
              Quantity
              <Input name="quantity" type="number" min={1} defaultValue={draft.quantity} />
            </label>
            <label className="flex flex-1 flex-col gap-1.5 text-sm font-semibold text-ink">
              Purchase price
              <Input name="purchasePrice" defaultValue={draft.purchasePrice ?? ""} placeholder="0.00" />
            </label>
            <label className="flex flex-1 flex-col gap-1.5 text-sm font-semibold text-ink">
              Purchase date
              <Input name="purchaseDate" type="date" defaultValue={draft.purchaseDate ?? ""} />
            </label>
          </div>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
            Location
            <Select name="locationId" defaultValue={matchedLocationId ?? ""}>
              <option value="">No location</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </Select>
          </label>
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

      <div className="shrink-0 border-t border-border bg-white p-4 md:p-6">
        <div className="flex items-center gap-3 md:mx-auto md:w-full md:max-w-2xl">
          <SubmitButton>Save item</SubmitButton>
          <button
            type="button"
            onClick={reset}
            className="cursor-pointer border-none bg-transparent text-sm font-semibold text-ink"
          >
            Start over
          </button>
        </div>
      </div>
    </form>
  );
}
