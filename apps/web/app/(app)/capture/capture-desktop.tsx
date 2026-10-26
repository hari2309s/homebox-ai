"use client";

import type { ItemDraft } from "@homebox-ai/ai";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { currencyLabel, normalizeCurrency, SUPPORTED_CURRENCIES } from "../../../lib/currency";
import { labelChip } from "../../../lib/label-colors";
import { analyzePhotoAction, createItemFromCaptureAction } from "./actions";
import { BAR_BUTTON, BAR_PRIMARY, DropZone, FIELD, FieldLabel, HoppingSquares, StepPills } from "./workspace-parts";

interface CaptureDesktopProps {
  locations: { id: string; name: string; path: string }[];
  labels: { id: string; name: string; color: string | null }[];
}

const STEP_LABELS = ["PHOTO", "LOOKING", "CHECK WHAT I FOUND"];

export function CaptureDesktop({ locations, labels }: CaptureDesktopProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [draft, setDraft] = useState<ItemDraft | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLabels, setSelectedLabels] = useState<Set<string>>(new Set());

  const analyze = useCallback(
    async (selected: File) => {
      setFile(selected);
      setPreviewUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(selected);
      });
      setDraft(null);
      setError(null);
      setAnalyzing(true);
      try {
        const formData = new FormData();
        formData.set("photo", selected);
        const result = await analyzePhotoAction(formData);
        const label = result.suggestedLabel?.toLowerCase();
        setSelectedLabels(new Set(labels.filter((l) => l.name.toLowerCase() === label).map((l) => l.id)));
        setDraft(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't look at that photo");
      } finally {
        setAnalyzing(false);
      }
    },
    [labels],
  );

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setDraft(null);
    setError(null);
  }

  async function save(formData: FormData) {
    if (file) formData.set("photo", file);
    for (const id of selectedLabels) formData.append("labelIds", id);
    setSaving(true);
    setError(null);
    try {
      await createItemFromCaptureAction(formData);
      router.push("/items");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save this thing");
      setSaving(false);
    }
  }

  const step = draft ? 2 : analyzing ? 1 : 0;
  const suggestedLocation = draft?.suggestedLocation?.toLowerCase();
  const matchedLocationId = suggestedLocation
    ? locations.find((l) => l.name.toLowerCase() === suggestedLocation)?.id
    : undefined;

  return (
    <div className="flex h-full min-h-[640px] flex-col gap-4 px-7 py-6">
      <div className="flex items-end gap-[10px]">
        <div className="min-w-0 flex-1">
          <h1 className="m-0 font-serif text-[30px] font-normal leading-none text-ink">Add a thing</h1>
          <div className="mt-1 font-mono text-[10px] text-muted">
            STEP {step + 1} OF 3 · {STEP_LABELS[step]}
          </div>
        </div>
        <StepPills steps={["Photo", "Looked", "Check"]} current={step} />
        <span className="w-3" />
        {(previewUrl || draft) && (
          <button type="button" onClick={reset} className={BAR_BUTTON}>
            <span aria-hidden className="material-symbols-rounded text-[16px]">
              restart_alt
            </span>
            Start over
          </button>
        )}
        {draft && (
          <button type="submit" form="capture-desktop-form" disabled={saving} className={BAR_PRIMARY}>
            <span aria-hidden className="material-symbols-rounded text-[16px]">
              check
            </span>
            {saving ? "Saving…" : "Save item"}
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="m-0 rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger-ink">
          {error}
        </p>
      )}

      {!previewUrl ? (
        <DropZone
          title="Drop a photo here, or paste with ⌘V"
          hint="Get the whole thing in frame. A brand plate or tag helps me fill in the make and model."
          onFile={analyze}
        />
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-[420px_minmax(0,1fr)] gap-[18px]">
          <div className="flex flex-col gap-3">
            <div className="relative flex h-[360px] items-center justify-center overflow-hidden rounded-[14px] bg-(--plan-ground)">
              {/* eslint-disable-next-line @next/next/no-img-element -- locally-selected blob URL */}
              <img src={previewUrl} alt="The photo you added" className="h-full w-full object-cover" />
              {analyzing && (
                <div className="absolute inset-0 flex items-center justify-center bg-surface/70">
                  <HoppingSquares label="Looking at your photo…" />
                </div>
              )}
              {draft && (
                <span className="absolute left-3 top-3 max-w-[85%] truncate rounded-[5px] bg-accent px-[7px] py-[3px] font-mono text-[10px] text-on-accent">
                  {draft.name.toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <span className="h-16 w-16 overflow-hidden rounded-[9px] border-2 border-accent">
                {/* eslint-disable-next-line @next/next/no-img-element -- locally-selected blob URL */}
                <img src={previewUrl} alt="" className="h-full w-full object-cover" />
              </span>
              <label
                className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-[9px] border-[1.5px] border-dashed border-border-strong text-accent"
                title="Use a different photo"
              >
                <span aria-hidden className="material-symbols-rounded">
                  add_a_photo
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  aria-label="Use a different photo"
                  onChange={(event) => {
                    const next = event.target.files?.[0];
                    if (next) void analyze(next);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
            {draft && (
              <div className="flex items-start gap-[10px] rounded-xl bg-warn-soft px-3 py-[11px]">
                <span aria-hidden className="material-symbols-rounded text-warn">
                  help
                </span>
                <span className="flex-1 text-[13px] leading-[1.45] text-warn-ink">
                  <b>Check before saving.</b> Fields marked AI are my guesses from the photo, especially the price and
                  date.
                </span>
              </div>
            )}
          </div>

          {draft ? (
            <form
              id="capture-desktop-form"
              action={save}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  event.currentTarget.requestSubmit();
                }
              }}
              className="flex min-h-0 flex-col gap-[10px] overflow-y-auto rounded-[14px] border border-border bg-card px-4 pb-4 pt-1"
            >
              <h2 className="m-0 pt-[10px] font-serif text-[18px] font-normal text-ink">Details</h2>
              <div className="grid grid-cols-2 gap-x-3 gap-y-[10px]">
                <FieldLabel label="Name" ai span>
                  <input name="name" defaultValue={draft.name} required className={FIELD} />
                </FieldLabel>
                <FieldLabel label="Description" ai={!!draft.description} span>
                  <input name="description" defaultValue={draft.description ?? ""} className={FIELD} />
                </FieldLabel>
                <FieldLabel label="Quantity">
                  <input
                    name="quantity"
                    type="number"
                    min={1}
                    defaultValue={draft.quantity}
                    className={`${FIELD} font-mono`}
                  />
                </FieldLabel>
                <FieldLabel label="Currency" ai={!!draft.currency}>
                  <select
                    name="currency"
                    defaultValue={normalizeCurrency(draft.currency)}
                    className={`${FIELD} font-mono`}
                  >
                    {SUPPORTED_CURRENCIES.map((code) => (
                      <option key={code} value={code}>
                        {currencyLabel(code)}
                      </option>
                    ))}
                  </select>
                </FieldLabel>
                <FieldLabel label="Price" ai={!!draft.purchasePrice}>
                  <input
                    name="purchasePrice"
                    defaultValue={draft.purchasePrice ?? ""}
                    placeholder="0.00"
                    inputMode="decimal"
                    className={`${FIELD} font-mono`}
                  />
                </FieldLabel>
                <FieldLabel label="Purchase date" ai={!!draft.purchaseDate}>
                  <input
                    name="purchaseDate"
                    type="date"
                    defaultValue={draft.purchaseDate ?? ""}
                    className={`${FIELD} font-mono`}
                  />
                </FieldLabel>
                <FieldLabel label="Location" ai={!!matchedLocationId} span>
                  <select name="locationId" defaultValue={matchedLocationId ?? ""} className={FIELD}>
                    <option value="">No location</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.path}
                      </option>
                    ))}
                  </select>
                </FieldLabel>
              </div>
              {labels.length > 0 && (
                <fieldset className="m-0 flex flex-col gap-[6px] border-none p-0">
                  <legend className="mb-[6px] p-0 text-[12px] font-semibold text-body">Labels</legend>
                  <div className="flex flex-wrap gap-[6px]">
                    {labels.map((label) => {
                      const on = selectedLabels.has(label.id);
                      const chip = labelChip(label.color);
                      return (
                        <button
                          key={label.id}
                          type="button"
                          aria-pressed={on}
                          onClick={() =>
                            setSelectedLabels((prev) => {
                              const next = new Set(prev);
                              if (next.has(label.id)) next.delete(label.id);
                              else next.add(label.id);
                              return next;
                            })
                          }
                          className="flex cursor-pointer items-center gap-1 rounded-full border px-[11px] py-[5px] text-[12px] font-semibold"
                          style={
                            on
                              ? { background: chip.bg, color: chip.ink, borderColor: "transparent" }
                              : {
                                  background: "var(--color-rail)",
                                  color: "var(--color-ink)",
                                  borderColor: "var(--color-border)",
                                }
                          }
                        >
                          <span aria-hidden className="material-symbols-rounded text-[14px]">
                            {on ? "check" : "add"}
                          </span>
                          {label.name}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              )}
              <span className="mt-auto pt-2 font-mono text-[10px] text-muted">⌘↵ SAVES</span>
            </form>
          ) : (
            <div className="flex flex-col gap-3 rounded-[14px] border border-border bg-card p-4">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className="h-10 rounded-[10px] bg-surface-soft" />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
