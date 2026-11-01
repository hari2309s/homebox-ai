"use client";

import type { RoomScanItem } from "@homebox-ai/ai";
import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { currencyLabel, normalizeCurrency, SUPPORTED_CURRENCIES } from "../../../lib/currency";
import { labelChip } from "../../../lib/label-colors";
import { BAR_BUTTON, BAR_PRIMARY, DropZone, FIELD, HoppingSquares, StepPills } from "../capture/workspace-parts";
import { analyzeRoomAction, importRoomScanItemsAction } from "./actions";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PlaceOption {
  id: string;
  name: string;
  path: string;
  color: string;
}

interface Row {
  key: string;
  index: number;
  included: boolean;
  name: string;
  description: string;
  quantity: number;
  suggestedLabel: string;
  suggestedLocation: string;
  confidence: "high" | "medium" | "unsure";
  boundingBox: { x: number; y: number; w: number; h: number };
  locationId: string;
}

type Step = "photo" | "scanning" | "select" | "done";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CELL =
  "min-w-0 rounded-[8px] border border-transparent bg-transparent px-[6px] py-[5px] text-ink outline-none hover:border-border focus:border-accent focus:bg-card";
const COLUMNS = "36px minmax(0,1.5fr) minmax(0,1fr) 52px 120px";

/* ------------------------------------------------------------------ */
/*  Bounding-box photo panel                                           */
/* ------------------------------------------------------------------ */

function PhotoPanel({
  previewUrl,
  rows,
  spaceName,
  fileName,
  hoveredIndex,
  focusedIndex,
  onHover,
}: {
  previewUrl: string;
  rows: Row[];
  spaceName: string;
  fileName: string;
  hoveredIndex: number | null;
  focusedIndex: string | null;
  onHover: (index: number | null) => void;
}) {
  const focusIdx = focusedIndex ? rows.find((r) => r.key === focusedIndex)?.index ?? null : null;
  const activeIdx = hoveredIndex ?? focusIdx;

  return (
    <div className="flex w-[400px] flex-none flex-col gap-3 border-r border-border px-5 py-6 box-border">
      <div>
        <div className="font-serif text-[30px] leading-none text-ink">{spaceName || "Room scan"}</div>
        <div className="mt-1 truncate font-mono text-[10px] font-semibold text-muted">
          {fileName.toUpperCase()} · ROOM PHOTO
        </div>
      </div>

      <div className="relative h-[270px] flex-none overflow-hidden rounded-[20px] bg-surface-soft">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previewUrl} alt="Room being scanned" className="absolute inset-0 h-full w-full object-cover" />
        {rows.map((row) => {
          const isActive = activeIdx === row.index;
          const isDimmed = activeIdx !== null && activeIdx !== row.index;
          return (
            <span
              key={row.key}
              className="absolute box-border rounded-[6px]"
              style={{
                left: `${row.boundingBox.x}%`,
                top: `${row.boundingBox.y}%`,
                width: `${row.boundingBox.w}%`,
                height: `${row.boundingBox.h}%`,
                border: isActive
                  ? "2.5px solid var(--color-accent)"
                  : row.confidence === "unsure"
                    ? "2px dashed var(--color-warn)"
                    : "2px solid var(--color-accent)",
                background: isActive ? "rgba(63,107,69,.2)" : "rgba(63,107,69,.06)",
                opacity: isDimmed ? 0.3 : row.included ? 1 : 0.6,
                animation: isActive ? "rsPulse 1.6s ease-in-out infinite" : undefined,
              }}
              onMouseEnter={() => onHover(row.index)}
              onMouseLeave={() => onHover(null)}
            >
              <span
                className="absolute -left-[11px] -top-[11px] flex h-[22px] w-[22px] items-center justify-center rounded-full font-mono text-[10px] text-on-accent shadow-[0_0_0_2px_var(--color-card)]"
                style={{
                  background: row.confidence === "unsure" ? "var(--color-warn)" : row.included ? "var(--color-accent)" : "var(--color-muted)",
                }}
              >
                {row.index + 1}
              </span>
              {isActive && (
                <span className="absolute -left-[2px] top-[calc(100%+6px)] whitespace-nowrap rounded-[6px] bg-ink px-2 py-1 font-mono text-[10px] font-semibold text-surface">
                  {row.name.toUpperCase()} · {(row.suggestedLocation || "ROOM").toUpperCase()}
                </span>
              )}
            </span>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 font-mono text-[10px] text-muted">
        <span className="flex items-center gap-1">
          <span className="h-[9px] w-3 rounded-[3px] border-2 border-accent" />FOUND
        </span>
        <span className="flex items-center gap-1">
          <span className="h-[9px] w-3 rounded-[3px] border-2 border-dashed" style={{ borderColor: "var(--color-warn)" }} />UNSURE
        </span>
        <span className="flex-1" />
        <span>HOVER A ROW OR BOX</span>
      </div>

      <div className="flex items-start gap-[10px] rounded-[14px] border border-border bg-card p-[11px_12px]">
        <span aria-hidden className="material-symbols-rounded text-accent">stacks</span>
        <span className="flex-1 text-[13px] leading-[1.45] text-body">
          Boxes that overlap are stacked with a 4px offset. Click a stack to fan it out.
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main desktop component                                             */
/* ------------------------------------------------------------------ */

export function RoomScanDesktop({
  locations,
  labels,
}: {
  locations: PlaceOption[];
  labels: { id: string; name: string; color: string | null }[];
}) {
  const router = useRouter();
  const reduced = useReducedMotion() ?? false;
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("photo");
  const [rows, setRows] = useState<Row[]>([]);
  const [spaceName, setSpaceName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [everything, setEverything] = useState("");
  const [currency, setCurrency] = useState(normalizeCurrency(undefined));
  const [labelIds, setLabelIds] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  const selectedRows = rows.filter((r) => r.included);

  function rowFromScan(item: RoomScanItem, i: number): Row {
    return {
      key: crypto.randomUUID(),
      index: i,
      included: item.confidence !== "unsure",
      name: item.name,
      description: item.description ?? "",
      quantity: item.quantity,
      suggestedLabel: item.suggestedLabel ?? "",
      suggestedLocation: item.suggestedLocation ?? "",
      confidence: item.confidence,
      boundingBox: item.boundingBox,
      locationId: "",
    };
  }

  const analyze = useCallback(async (selected: File) => {
    setFile(selected);
    setPreviewUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(selected);
    });
    setStep("scanning");
    setRows([]);
    setError(null);

    const formData = new FormData();
    formData.set("photo", selected);
    const result = await analyzeRoomAction(formData);

    if ("error" in result) {
      setError(result.error);
      setStep("photo");
      return;
    }

    const draft = result.data;
    if (draft.items.length === 0) {
      setStep("photo");
      setError("No items found in this photo. Try a wider shot with better lighting.");
      return;
    }

    setSpaceName(draft.spaceName ?? "");
    setRows(draft.items.map((item, i) => rowFromScan(item, i)));
    setStep("select");
  }, []);

  function update(key: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function setAllLocations(id: string) {
    setEverything(id);
    setRows((prev) => prev.map((r) => ({ ...r, locationId: id })));
  }

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setStep("photo");
    setRows([]);
    setError(null);
    setEverything("");
    setLabelIds(new Set());
    setImporting(false);
  }

  async function importRows() {
    const included = rows.filter((r) => r.included);
    if (included.length === 0) return setError("Select at least one item to add");

    setImporting(true);
    setError(null);
    const formData = new FormData();
    if (file) formData.set("photo", file);
    formData.set("currency", currency);
    formData.set("locationId", everything);
    for (const id of labelIds) formData.append("labelIds", id);
    formData.set(
      "items",
      JSON.stringify(
        included.map((r) => ({
          name: r.name.trim() || "Untitled",
          description: r.description.trim() || undefined,
          quantity: r.quantity,
          suggestedLabel: r.suggestedLabel || undefined,
          suggestedLocation: r.suggestedLocation || undefined,
          locationId: r.locationId || null,
        })),
      ),
    );

    const result = await importRoomScanItemsAction(formData);
    setImporting(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setImportedCount(included.length);
    setStep("done");
  }

  const placeColor = (id: string) => locations.find((l) => l.id === id)?.color ?? "#9aa49c";

  /* ------ Step: Photo (drop zone) ------ */
  if (step === "photo") {
    return (
      <div className="flex h-full min-h-[640px] flex-col gap-4 px-7 py-6">
        <div className="flex items-end gap-[10px]">
          <div className="min-w-0 flex-1">
            <h1 className="m-0 font-serif text-[30px] font-normal leading-none text-ink">Scan a room</h1>
            <div className="mt-1 font-mono text-[10px] text-muted">STEP 1 OF 4 · ONE PHOTO, MANY THINGS</div>
          </div>
          <StepPills steps={["Photo", "Scanning", "Select", "Done"]} current={0} />
        </div>
        {error && (
          <p role="alert" className="m-0 rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger-ink">
            {error}
          </p>
        )}
        <div className="flex flex-1 gap-[18px]">
          <DropZone
            title="Drop a room photo here"
            hint="A wide shot works best. Get the whole space in frame."
            onFile={analyze}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-[18px] rounded-[20px] border border-border bg-card p-7">
            <div className="max-w-[420px] font-serif text-[22px] leading-[1.25] text-ink">
              We&apos;ll find every item we can see, and you pick which ones to add.
            </div>
            <div className="max-w-[460px] text-[14px] leading-[1.55] text-muted">
              Each find gets a numbered pin on your photo and a row here. Untick what you don&apos;t want, fix any names, choose where they live, and add them all at once.
            </div>
            <div className="mt-2 flex flex-col gap-[14px]">
              {[1, 0.8, 0.6, 0.4, 0.25].map((op, i) => (
                <div key={i} className="flex items-center gap-3" style={{ opacity: op }}>
                  <span className="h-5 w-5 rounded-[6px] border-[1.5px] border-border box-border" />
                  <span className="h-[22px] w-[22px] rounded-full bg-surface-soft" />
                  <span className="h-[10px] w-[180px] rounded-[5px] bg-surface-soft" />
                  <span className="h-[10px] flex-1 rounded-[5px] bg-border/30" />
                  <span className="h-[10px] w-[90px] rounded-[5px] bg-surface-soft" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ------ Step: Scanning ------ */
  if (step === "scanning") {
    return (
      <div className="flex h-full min-h-[640px] flex-col gap-4 px-7 py-6">
        <div className="flex items-end gap-[10px]">
          <div className="min-w-0 flex-1">
            <h1 className="m-0 font-serif text-[30px] font-normal leading-none text-ink">Scan a room</h1>
            <div className="mt-1 truncate font-mono text-[10px] text-muted">
              STEP 2 OF 4 · SCANNING {(file?.name ?? "ROOM").toUpperCase()}
            </div>
          </div>
          <StepPills steps={["Photo", "Scanning", "Select", "Done"]} current={1} />
        </div>
        <div className="flex flex-1 gap-[18px]">
          <div className="relative h-[315px] w-[420px] flex-none overflow-hidden rounded-[20px] bg-surface-soft">
            {previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-surface/70">
              <HoppingSquares label="Scanning your space…" />
              <span className="text-[13px] text-muted">Finding things in the photo</span>
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-3">
            <div className="grid grid-cols-[120px_1fr_1fr] gap-[10px]">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-[38px] rounded-[14px] bg-surface-soft" />
              ))}
            </div>
            <div className="rounded-[14px] border border-border bg-card px-[14px] py-[6px]">
              {[1, 0.85, 0.7, 0.55, 0.4, 0.25].map((op, i) => (
                <div
                  key={i}
                  className="grid h-10 items-center gap-[10px] border-b border-border/40"
                  style={{ gridTemplateColumns: "36px minmax(0,1fr) minmax(0,1fr) 64px 170px", opacity: op }}
                >
                  <span className="h-5 w-5 rounded-[6px] bg-surface-soft" />
                  <span className="h-3 w-[70%] rounded-[6px] bg-surface-soft" />
                  <span className="h-3 w-[85%] rounded-[6px] bg-border/30" />
                  <span className="h-3 w-6 rounded-[6px] bg-surface-soft" />
                  <span className="h-3 w-[100px] rounded-[6px] bg-surface-soft" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ------ Step: Done ------ */
  if (step === "done") {
    return (
      <div className="flex h-full min-h-[640px] flex-col gap-4 px-7 py-6">
        <div className="flex items-end gap-[10px]">
          <div className="min-w-0 flex-1">
            <h1 className="m-0 font-serif text-[30px] font-normal leading-none text-ink">Scan a room</h1>
            <div className="mt-1 font-mono text-[10px] text-muted">STEP 4 OF 4 · DONE</div>
          </div>
          <StepPills steps={["Photo", "Scanning", "Select", "Done"]} current={3} />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="relative grid w-[620px] grid-cols-[200px_minmax(0,1fr)] gap-7 rounded-[20px] border border-border bg-card p-8 shadow-[8px_12px_24px_-12px_rgba(31,38,34,.25)]">
            <div className="relative h-[150px] overflow-hidden rounded-[14px] bg-surface-soft">
              {previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
              )}
              <motion.span
                className="absolute -right-[18px] -bottom-[18px] flex h-16 w-16 items-center justify-center rounded-full bg-accent shadow-[0_0_0_6px_var(--color-selected)]"
                initial={reduced ? false : { scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <svg width={32} height={32} viewBox="0 0 24 24">
                  <motion.path
                    d="M4 12.5l5 5L20 6.5"
                    fill="none"
                    stroke="white"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={reduced ? { pathLength: 1 } : { pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, delay: 0.35, ease: "easeOut" }}
                  />
                </svg>
              </motion.span>
            </div>
            <div className="flex flex-col gap-3">
              <div className="font-serif text-[30px] leading-[1.15] text-ink">
                Added {importedCount} item{importedCount === 1 ? "" : "s"} to your things
              </div>
              <div className="font-mono text-[10px] text-muted">
                {rows.filter((r) => !r.included && r.confidence === "unsure").length > 0 && (
                  <>
                    {rows.filter((r) => !r.included && r.confidence === "unsure").length} UNSURE ITEMS SKIPPED ·{" "}
                    <span className="text-accent">REVIEW THEM</span>
                  </>
                )}
              </div>
              <div className="mt-[6px] flex gap-2">
                <button
                  type="button"
                  onClick={reset}
                  className={`${BAR_PRIMARY} gap-[6px]`}
                >
                  <span className="material-symbols-rounded text-[18px]">view_in_ar</span>
                  Scan another room
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/items")}
                  className={BAR_BUTTON}
                >
                  View items
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ------ Step: Select (table) ------ */
  return (
    <div className="flex h-full min-h-[640px]">
      <PhotoPanel
        previewUrl={previewUrl ?? ""}
        rows={rows}
        spaceName={spaceName}
        fileName={file?.name ?? "room"}
        hoveredIndex={hoveredIndex}
        focusedIndex={focused}
        onHover={setHoveredIndex}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-[14px] overflow-y-auto px-6 py-6">
        {/* Top bar */}
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 font-mono text-[10px] font-semibold text-accent">
            {rows.length} ITEMS FOUND · {selectedRows.length} SELECTED
          </span>
          <button type="button" onClick={reset} className={BAR_BUTTON}>
            <span className="material-symbols-rounded text-[16px]">restart_alt</span>
            Start over
          </button>
          <button
            type="button"
            onClick={importRows}
            disabled={selectedRows.length === 0 || importing}
            className={BAR_PRIMARY}
          >
            <span className="material-symbols-rounded text-[16px]">add</span>
            {importing ? "Adding…" : `Add ${selectedRows.length} item${selectedRows.length === 1 ? "" : "s"}`}
          </button>
        </div>

        {error && (
          <p role="alert" className="m-0 rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger-ink">
            {error}
          </p>
        )}

        {/* Controls row */}
        <div className="grid grid-cols-[110px_minmax(0,1fr)_minmax(0,1fr)] gap-[10px]">
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-semibold text-body">Currency</span>
            <select
              value={currency}
              onChange={(e) => setCurrency(normalizeCurrency(e.target.value))}
              className={`${FIELD} font-mono`}
            >
              {SUPPORTED_CURRENCIES.map((code) => (
                <option key={code} value={code}>{currencyLabel(code)}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-semibold text-body">Put everything in</span>
            <select value={everything} onChange={(e) => setAllLocations(e.target.value)} className={FIELD}>
              <option value="">No location</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.path}</option>
              ))}
            </select>
          </label>
          <div className="flex flex-col gap-1">
            <span className="text-[12px] font-semibold text-body">Labels for all</span>
            <div className="flex min-h-[36px] flex-wrap items-center gap-[6px] rounded-[14px] border border-border bg-card px-[6px]">
              {labels.filter((l) => labelIds.has(l.id)).map((label) => {
                const chip = labelChip(label.color);
                return (
                  <span
                    key={label.id}
                    className="rounded-full px-[10px] py-[3px] text-[12px] font-semibold"
                    style={{ background: chip.bg, color: chip.ink }}
                  >
                    {label.name}
                  </span>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  /* label picker would go here — for now cycle through */
                  const unused = labels.find((l) => !labelIds.has(l.id));
                  if (unused) setLabelIds((prev) => new Set([...prev, unused.id]));
                }}
                className="ml-auto flex items-center border-none bg-transparent cursor-pointer p-0"
              >
                <span className="material-symbols-rounded text-[18px] text-faint">add</span>
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div role="table" aria-label="Scanned items" className="overflow-hidden rounded-[14px] border border-border bg-card">
          <div
            role="row"
            className="grid gap-[10px] border-b border-border/60 px-[14px] py-[9px] font-mono text-[10px] font-semibold text-muted"
            style={{ gridTemplateColumns: COLUMNS }}
          >
            <span role="columnheader" aria-label="Include" />
            <span role="columnheader">ITEM NAME</span>
            <span role="columnheader">DESCRIPTION</span>
            <span role="columnheader">QTY</span>
            <span role="columnheader">LOCATION</span>
          </div>
          {rows.map((row) => {
            const isFocused = focused === row.key;
            const isHovered = hoveredIndex === row.index;
            const active = isFocused || isHovered;
            const unsure = row.confidence === "unsure";
            return (
              <div
                key={row.key}
                role="row"
                tabIndex={0}
                onFocus={() => setFocused(row.key)}
                onMouseEnter={() => setHoveredIndex(row.index)}
                onMouseLeave={() => setHoveredIndex(null)}
                onKeyDown={(event) => {
                  if (event.key === " " && event.target === event.currentTarget) {
                    event.preventDefault();
                    update(row.key, { included: !row.included });
                  }
                }}
                className={`grid h-[38px] items-center gap-[10px] border-b border-border/40 px-[14px] outline-none last:border-b-0 ${
                  active ? "bg-selected-soft shadow-[inset_3px_0_0_var(--color-accent)]" : ""
                }`}
                style={{ gridTemplateColumns: COLUMNS }}
              >
                <span role="cell">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={row.included}
                    aria-label={`Include ${row.name}`}
                    onClick={() => update(row.key, { included: !row.included })}
                    className={`flex h-5 w-5 cursor-pointer items-center justify-center rounded-[6px] p-0 ${
                      row.included
                        ? "border-none bg-accent text-on-accent"
                        : "border-[1.5px] border-solid border-border-strong bg-card"
                    }`}
                    style={{ opacity: row.included ? 1 : unsure ? 0.7 : 0.45 }}
                  >
                    {row.included && (
                      <span className="material-symbols-rounded text-[15px]">check</span>
                    )}
                  </button>
                </span>
                <span role="cell" className="flex min-w-0 items-center gap-2" style={{ opacity: row.included ? 1 : unsure ? 0.7 : 0.45 }}>
                  <span
                    className="flex h-5 w-5 flex-none items-center justify-center rounded-full font-mono text-[9px] text-on-accent"
                    style={{ background: unsure ? "var(--color-warn)" : row.included ? "var(--color-accent)" : "var(--color-muted)" }}
                  >
                    {row.index + 1}
                  </span>
                  <input
                    aria-label="Name"
                    value={row.name}
                    onChange={(e) => update(row.key, { name: e.target.value })}
                    className={`${CELL} min-w-0 flex-1 text-[14px] font-medium`}
                    style={{ textDecoration: !row.included && !unsure ? "line-through" : "none" }}
                  />
                  {unsure && (
                    <span className="rounded-full px-[7px] py-[2px] font-mono text-[9px] font-semibold" style={{ background: "var(--color-warn-soft)", color: "var(--color-warn)" }}>
                      UNSURE
                    </span>
                  )}
                </span>
                <span role="cell" className="min-w-0" style={{ opacity: row.included ? 1 : unsure ? 0.7 : 0.45 }}>
                  <input
                    aria-label="Description"
                    value={row.description}
                    onChange={(e) => update(row.key, { description: e.target.value })}
                    className={`${CELL} w-full text-[13px] text-muted`}
                  />
                </span>
                <span role="cell" className="min-w-0" style={{ opacity: row.included ? 1 : unsure ? 0.7 : 0.45 }}>
                  <input
                    aria-label="Quantity"
                    type="number"
                    min={1}
                    value={row.quantity}
                    onChange={(e) => update(row.key, { quantity: Number(e.target.value) || 1 })}
                    className={`${CELL} w-full font-mono text-[12px] ${
                      isFocused ? "border-2 border-accent bg-card" : ""
                    }`}
                  />
                </span>
                <span role="cell" className="relative flex min-w-0 items-center gap-[6px] text-[13px] text-body" style={{ opacity: row.included ? 1 : unsure ? 0.7 : 0.45 }}>
                  <span
                    className="h-[7px] w-[7px] flex-none rounded-[2px]"
                    style={{ background: row.locationId ? placeColor(row.locationId) : "#c5c9bf" }}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {row.locationId
                      ? locations.find((l) => l.id === row.locationId)?.name ?? "Location"
                      : row.suggestedLocation || "No location"}
                  </span>
                  <span className="material-symbols-rounded text-[16px] text-faint">expand_more</span>
                  <select
                    aria-label={`Location for ${row.name}`}
                    value={row.locationId}
                    onChange={(e) => update(row.key, { locationId: e.target.value })}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  >
                    <option value="">No location</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>{l.path}</option>
                    ))}
                  </select>
                </span>
              </div>
            );
          })}
        </div>

        {/* Labels */}
        {labels.length > 0 && (
          <div className="flex flex-wrap items-center gap-[6px]">
            <span className="mr-1 text-[12px] font-semibold text-body">Labels for all</span>
            {labels.map((label) => {
              const on = labelIds.has(label.id);
              const chip = labelChip(label.color);
              return (
                <button
                  key={label.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setLabelIds((prev) => {
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
                      : { background: "var(--color-rail)", color: "var(--color-ink)", borderColor: "var(--color-border)" }
                  }
                >
                  <span className="material-symbols-rounded text-[14px]">{on ? "check" : "add"}</span>
                  {label.name}
                </button>
              );
            })}
          </div>
        )}

        <p className="m-0 font-mono text-[10px] text-muted">SPACE TOGGLE · TAB NEXT CELL</p>
      </div>
    </div>
  );
}
