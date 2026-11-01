"use client";

import type { RoomScanItem } from "@homebox-ai/ai";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import type { ChangeEvent } from "react";
import { useCallback, useRef, useState } from "react";

import { normalizeCurrency, SUPPORTED_CURRENCIES } from "../../../lib/currency";
import { HoppingSquares } from "../capture/workspace-parts";
import { analyzeRoomAction, importRoomScanItemsAction } from "./actions";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface RoomScanFormProps {
  locations: { id: string; name: string }[];
  labels: { id: string; name: string }[];
}

interface DraftRow {
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
  expanded: boolean;
  locationId: string;
}

type Step = "photo" | "scanning" | "select" | "done";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const SPRING = { type: "spring" as const, stiffness: 400, damping: 17 };

const STEP_NAMES: Step[] = ["photo", "scanning", "select", "done"];
const STEP_LABELS: Record<Step, string> = { photo: "PHOTO", scanning: "SCANNING", select: "SELECT", done: "DONE" };

function StepBar({ step }: { step: Step }) {
  const idx = STEP_NAMES.indexOf(step);
  return (
    <div className="flex flex-col gap-[10px] px-5 pb-3 pt-1">
      <div className="flex items-center gap-[6px]">
        <span className="flex h-11 w-11 -ml-[10px] items-center justify-center">
          <span aria-hidden className="material-symbols-rounded text-[24px] text-ink">close</span>
        </span>
        <span className="flex-1 font-serif text-[22px] text-ink">Scan a room</span>
      </div>
      <span className="font-mono text-[11px] font-semibold text-muted">
        STEP {idx + 1} OF 4 · {STEP_LABELS[step]}
      </span>
      <div className="grid grid-cols-4 gap-1">
        {STEP_NAMES.map((s, i) => (
          <span
            key={s}
            className="h-1 rounded-full"
            style={{ background: i <= idx ? "var(--color-accent)" : "var(--color-border)" }}
          />
        ))}
      </div>
    </div>
  );
}

function Pin({ num, unsure, className }: { num: number; unsure?: boolean; className?: string }) {
  return (
    <span
      className={`flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full font-mono text-[10px] text-on-accent ${className ?? ""}`}
      style={{ background: unsure ? "var(--color-warn)" : "var(--color-accent)" }}
    >
      {num}
    </span>
  );
}

function ConfidenceBadge({ confidence }: { confidence: "high" | "medium" | "unsure" }) {
  const config = {
    high: { bg: "var(--color-selected)", ink: "var(--color-moss-ink)", icon: "auto_awesome", label: "HIGH" },
    medium: { bg: "var(--color-surface-soft)", ink: "var(--color-body)", icon: "auto_awesome", label: "MEDIUM" },
    unsure: { bg: "var(--color-warn-soft)", ink: "var(--color-warn)", icon: "help", label: "UNSURE" },
  }[confidence];
  return (
    <span
      className="mt-[2px] inline-flex items-center gap-1 self-start rounded-full px-2 py-[2px] font-mono text-[10px] font-semibold"
      style={{ background: config.bg, color: config.ink }}
    >
      <span aria-hidden className="material-symbols-rounded text-[12px]">{config.icon}</span>
      {config.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Photo overlay with bounding boxes                                  */
/* ------------------------------------------------------------------ */

function PhotoOverlay({
  previewUrl,
  rows,
  hoveredIndex,
  onHover,
  height,
}: {
  previewUrl: string;
  rows: DraftRow[];
  hoveredIndex: number | null;
  onHover: (index: number | null) => void;
  height?: number;
}) {
  return (
    <div
      className="relative flex-none overflow-hidden rounded-[14px] bg-surface-soft"
      style={{ height: height ?? 150 }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={previewUrl} alt="Room being scanned" className="absolute inset-0 h-full w-full object-cover" />
      {rows.map((row) => {
        const isHovered = hoveredIndex === row.index;
        const isDimmed = hoveredIndex !== null && hoveredIndex !== row.index;
        return (
          <span
            key={row.key}
            className="absolute box-border rounded-[5px]"
            style={{
              left: `${row.boundingBox.x}%`,
              top: `${row.boundingBox.y}%`,
              width: `${row.boundingBox.w}%`,
              height: `${row.boundingBox.h}%`,
              border: isHovered
                ? "2.5px solid var(--color-accent)"
                : row.confidence === "unsure"
                  ? "2px dashed var(--color-warn-soft)"
                  : "2px solid var(--color-accent)",
              background: isHovered ? "rgba(63,107,69,.2)" : "rgba(63,107,69,.06)",
              opacity: isDimmed ? 0.3 : row.included ? 1 : 0.6,
              animation: isHovered ? "rsPulse 1.6s ease-in-out infinite" : undefined,
            }}
            onMouseEnter={() => onHover(row.index)}
            onMouseLeave={() => onHover(null)}
          >
            <span
              className="absolute -left-[7px] -top-[7px] flex h-4 w-4 items-center justify-center rounded-full font-mono text-[8px] text-on-accent shadow-[0_0_0_2px_var(--color-card)]"
              style={{ background: row.confidence === "unsure" ? "var(--color-warn)" : row.included ? "var(--color-accent)" : "var(--color-muted)" }}
            >
              {row.index + 1}
            </span>
          </span>
        );
      })}
      <span className="absolute right-2 bottom-2 flex h-8 w-8 items-center justify-center rounded-[9px] bg-card/90">
        <span aria-hidden className="material-symbols-rounded text-[18px] text-ink">open_in_full</span>
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Item card (mobile)                                                 */
/* ------------------------------------------------------------------ */

function ItemCard({
  row,
  onHover,
  onToggle,
  onExpand,
  onUpdate,
  locations,
  reduced,
}: {
  row: DraftRow;
  onHover: (index: number | null) => void;
  onToggle: () => void;
  onExpand: () => void;
  onUpdate: (patch: Partial<DraftRow>) => void;
  locations: { id: string; name: string }[];
  reduced: boolean;
}) {
  const unsure = row.confidence === "unsure";
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: reduced ? 0 : row.index * 0.03 }}
      className="flex flex-col rounded-[14px] bg-card p-[10px_12px]"
      style={{
        border: unsure
          ? "1.5px dashed var(--color-warn)"
          : row.expanded
            ? "2px solid var(--color-accent)"
            : "1px solid var(--color-border)",
        boxShadow: row.expanded ? "8px 12px 24px -12px rgba(31,38,34,.25)" : "none",
      }}
      onMouseEnter={() => onHover(row.index)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="flex items-start gap-[10px]" style={{ opacity: row.included ? 1 : unsure ? 0.7 : 0.45 }}>
        {/* Checkbox */}
        <button
          type="button"
          role="checkbox"
          aria-checked={row.included}
          aria-label={`Include ${row.name}`}
          onClick={onToggle}
          className="flex h-11 w-11 -ml-3 -mt-[10px] -mb-[10px] flex-none items-center justify-center bg-transparent border-none cursor-pointer"
        >
          <motion.span
            className={`flex h-[22px] w-[22px] items-center justify-center rounded-[7px] ${
              row.included ? "border-none bg-accent text-on-accent" : "border-[1.5px] border-solid border-border-strong bg-card"
            }`}
            whileTap={reduced ? undefined : { scale: 0.8 }}
            animate={reduced ? undefined : { scale: [0.8, 1.1, 1] }}
            transition={SPRING}
          >
            {row.included && (
              <span className="material-symbols-rounded text-[16px]">check</span>
            )}
          </motion.span>
        </button>

        <Pin num={row.index + 1} unsure={unsure} />

        <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <span
            className="text-[15px] font-semibold text-ink"
            style={{ textDecoration: !row.included && !unsure ? "line-through" : "none" }}
          >
            {row.name}
          </span>
          <span className="text-[13px] text-muted">{row.description} · ×{row.quantity}</span>
          <ConfidenceBadge confidence={row.confidence} />
        </div>

        <button
          type="button"
          onClick={onExpand}
          className="flex items-center bg-transparent border-none cursor-pointer p-0"
          aria-label={row.expanded ? "Collapse" : "Expand"}
        >
          <span className="material-symbols-rounded text-[20px] text-faint">
            {row.expanded ? "expand_less" : "expand_more"}
          </span>
        </button>
      </div>

      {/* Expanded inline edit */}
      <AnimatePresence>
        {row.expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={SPRING}
            className="overflow-hidden"
          >
            <div className="mt-[10px] flex flex-col gap-[10px] border-t border-border/40 pt-3">
              <label className="flex flex-col gap-[6px]">
                <span className="flex items-center gap-1 text-[12px] font-semibold text-body">
                  Name
                  <span className="material-symbols-rounded text-[13px] text-accent">auto_awesome</span>
                </span>
                <input
                  value={row.name}
                  onChange={(e) => onUpdate({ name: e.target.value })}
                  className="rounded-[14px] border-2 border-accent bg-card px-[11px] py-[10px] text-[15px] text-ink outline-none shadow-[0_0_0_3px_var(--color-selected)]"
                />
              </label>
              <label className="flex flex-col gap-[6px]">
                <span className="flex items-center gap-1 text-[12px] font-semibold text-body">
                  Description
                  <span className="material-symbols-rounded text-[13px] text-accent">auto_awesome</span>
                </span>
                <input
                  value={row.description}
                  onChange={(e) => onUpdate({ description: e.target.value })}
                  className="rounded-[14px] border border-border bg-card px-3 py-[11px] text-[14px] leading-[1.4] text-ink outline-none focus:border-accent"
                />
              </label>
              <div className="grid grid-cols-[132px_minmax(0,1fr)] gap-[10px]">
                <label className="flex flex-col gap-[6px]">
                  <span className="text-[12px] font-semibold text-body">Quantity</span>
                  <div className="flex items-center rounded-[14px] border border-border bg-card">
                    <button
                      type="button"
                      onClick={() => onUpdate({ quantity: Math.max(1, row.quantity - 1) })}
                      className="flex h-11 w-11 items-center justify-center bg-transparent border-none cursor-pointer"
                    >
                      <span className="material-symbols-rounded text-body">remove</span>
                    </button>
                    <span className="flex-1 text-center font-mono text-[15px] text-ink">{row.quantity}</span>
                    <button
                      type="button"
                      onClick={() => onUpdate({ quantity: row.quantity + 1 })}
                      className="flex h-11 w-11 items-center justify-center bg-transparent border-none cursor-pointer"
                    >
                      <span className="material-symbols-rounded text-body">add</span>
                    </button>
                  </div>
                </label>
                <label className="flex flex-col gap-[6px]">
                  <span className="text-[12px] font-semibold text-body">Category</span>
                  <input
                    value={row.suggestedLabel}
                    onChange={(e) => onUpdate({ suggestedLabel: e.target.value })}
                    className="h-11 box-border rounded-[14px] border border-border bg-card px-3 text-[14px] text-ink outline-none focus:border-accent"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-[6px]">
                <span className="text-[12px] font-semibold text-body">
                  Location <span className="font-normal text-muted">· overrides &quot;Put everything in&quot;</span>
                </span>
                <select
                  value={row.locationId}
                  onChange={(e) => onUpdate({ locationId: e.target.value })}
                  className="h-11 rounded-[14px] border border-border bg-card px-3 text-[14px] text-ink outline-none focus:border-accent"
                >
                  <option value="">Use default</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </label>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onExpand}
                  className="h-10 cursor-pointer rounded-[10px] border border-border bg-card px-4 text-[14px] font-semibold text-ink"
                >
                  Done
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Done screen                                                        */
/* ------------------------------------------------------------------ */

function DoneScreen({
  count,
  spaceName,
  locationName,
  onScanAnother,
  onViewItems,
}: {
  count: number;
  spaceName: string;
  locationName: string;
  onScanAnother: () => void;
  onViewItems: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-4 px-5 pt-10 text-center">
      {/* Animated check */}
      <motion.span
        className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-accent shadow-[0_0_0_6px_var(--color-selected)]"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <svg width={44} height={44} viewBox="0 0 24 24">
          <motion.path
            d="M4 12.5l5 5L20 6.5"
            fill="none"
            stroke="white"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.35, ease: "easeOut" }}
          />
        </svg>
      </motion.span>
      <div className="font-serif text-[28px] leading-[1.15] text-ink">
        Added {count} item{count === 1 ? "" : "s"}
        <br />
        to your things
      </div>
      <div className="text-[14px] leading-[1.5] text-body">
        {locationName ? `All in ${locationName}.` : `Found in ${spaceName || "your space"}.`}
      </div>
      <div className="mt-4 flex w-full flex-col gap-[10px]">
        <button
          type="button"
          onClick={onScanAnother}
          className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-accent text-[15px] font-semibold text-on-accent"
        >
          <span className="material-symbols-rounded text-[20px]">view_in_ar</span>
          Scan another room
        </button>
        <button
          type="button"
          onClick={onViewItems}
          className="flex h-12 w-full cursor-pointer items-center justify-center rounded-xl border border-border bg-card text-[15px] font-semibold text-ink"
        >
          View items
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main form                                                          */
/* ------------------------------------------------------------------ */

export function RoomScanForm({ locations, labels: _labels }: RoomScanFormProps) {
  const router = useRouter();
  const reduced = useReducedMotion() ?? false;
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("photo");
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [spaceName, setSpaceName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [locationId, setLocationId] = useState("");
  const [currency, setCurrency] = useState(normalizeCurrency(undefined));
  const [labelIds, setLabelIds] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [slowScan, setSlowScan] = useState(false);

  const selectedCount = rows.filter((r) => r.included).length;

  function draftFromScan(item: RoomScanItem, i: number): DraftRow {
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
      expanded: false,
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
    setError(null);
    setRows([]);
    setSlowScan(false);

    const timer = setTimeout(() => setSlowScan(true), 10000);

    const formData = new FormData();
    formData.set("photo", selected);
    const result = await analyzeRoomAction(formData);
    clearTimeout(timer);

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
    setRows(draft.items.map((item, i) => draftFromScan(item, i)));
    setStep("select");
  }, []);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (selected) void analyze(selected);
  }

  function updateRow(key: string, patch: Partial<DraftRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function toggleAll() {
    const allSelected = rows.every((r) => r.included);
    setRows((prev) => prev.map((r) => ({ ...r, included: !allSelected })));
  }

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setStep("photo");
    setRows([]);
    setError(null);
    setLocationId("");
    setLabelIds(new Set());
    setImporting(false);
  }

  async function handleImport() {
    const included = rows.filter((r) => r.included);
    if (included.length === 0) return;

    setImporting(true);
    setError(null);
    const formData = new FormData();
    if (file) formData.set("photo", file);
    formData.set("currency", currency);
    formData.set("locationId", locationId);
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

  /* ------ Step: Done ------ */
  if (step === "done") {
    return (
      <div className="flex h-full flex-col">
        <StepBar step="done" />
        <DoneScreen
          count={importedCount}
          spaceName={spaceName}
          locationName={locations.find((l) => l.id === locationId)?.name ?? ""}
          onScanAnother={reset}
          onViewItems={() => router.push("/items")}
        />
      </div>
    );
  }

  /* ------ Step: Scanning ------ */
  if (step === "scanning") {
    return (
      <div className="flex h-full flex-col">
        <StepBar step="scanning" />
        <div className="flex flex-1 flex-col items-center gap-7 px-5 pt-2">
          {previewUrl && (
            <div className="relative h-[250px] w-full overflow-hidden rounded-[20px] bg-surface-soft">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="" className="h-full w-full object-cover" />
              <motion.div
                className="absolute left-[4%] right-[4%] h-[2px] bg-accent shadow-[0_0_12px_var(--color-accent)]"
                animate={{ top: ["6%", "90%", "6%"] }}
                transition={{ duration: 2.4, ease: "easeInOut", repeat: Infinity }}
              />
            </div>
          )}
          <div className="flex flex-col items-center gap-[14px] mt-5">
            <HoppingSquares />
            <div className="font-serif text-[22px] text-ink">Scanning your space…</div>
            <div className="text-[14px] text-muted">
              {slowScan ? "Still looking. Big rooms take a moment." : "Finding things in the photo"}
            </div>
          </div>
        </div>
        <div className="px-5 pb-[34px] pt-[14px]">
          <button
            type="button"
            onClick={reset}
            className="h-12 w-full cursor-pointer rounded-xl border-none bg-transparent text-[15px] font-semibold text-body"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  /* ------ Step: Select ------ */
  if (step === "select" && previewUrl) {
    return (
      <div className="flex h-full flex-col">
        <StepBar step="select" />
        <div className="flex flex-1 flex-col gap-[10px] overflow-y-auto px-5 pb-4 pt-[2px]">
          <PhotoOverlay
            previewUrl={previewUrl}
            rows={rows}
            hoveredIndex={hoveredIndex}
            onHover={setHoveredIndex}
          />
          <div className="flex items-center gap-2">
            <span className="flex-1 font-mono text-[11px] font-semibold text-muted">
              FOUND {rows.length} ITEMS · {selectedCount} SELECTED
            </span>
            <button
              type="button"
              onClick={toggleAll}
              className="cursor-pointer border-none bg-transparent px-1 py-2 text-[13px] font-semibold text-accent"
            >
              {selectedCount === rows.length ? "Deselect all" : "Select all"}
            </button>
          </div>

          {rows.map((row) => (
            <ItemCard
              key={row.key}
              row={row}
              onHover={setHoveredIndex}
              onToggle={() => updateRow(row.key, { included: !row.included })}
              onExpand={() => updateRow(row.key, { expanded: !row.expanded })}
              onUpdate={(patch) => updateRow(row.key, patch)}
              locations={locations}
              reduced={reduced}
            />
          ))}

          {rows.length >= 20 && (
            <div className="flex items-start gap-[10px] rounded-[14px] bg-surface-soft p-3">
              <span aria-hidden className="material-symbols-rounded text-body">filter_list</span>
              <span className="flex-1 text-[13px] leading-[1.45] text-body">
                Showing the 20 most prominent items. Scan again to catch anything we missed.
              </span>
            </div>
          )}
        </div>

        {/* Footer bar */}
        <div className="flex flex-col gap-[10px] border-t border-border bg-surface px-5 pb-[34px] pt-[10px]">
          {selectedCount === 0 && (
            <div className="flex items-center gap-[6px] text-[13px]" style={{ color: "var(--color-warn)" }}>
              <span aria-hidden className="material-symbols-rounded text-[18px]">info</span>
              Select at least one item to continue.
            </div>
          )}
          <div className="flex gap-2">
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="h-11 min-w-0 flex-[1.4] rounded-xl border border-border bg-card px-[10px] text-[13px] text-ink outline-none"
            >
              <option value="">Put all in…</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
            <select
              value={currency}
              onChange={(e) => setCurrency(normalizeCurrency(e.target.value))}
              className="h-11 w-[60px] rounded-xl border border-border bg-card px-2 text-center font-mono text-[13px] text-ink outline-none"
            >
              {SUPPORTED_CURRENCIES.map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-[10px]">
            <button
              type="button"
              onClick={reset}
              className="h-12 flex-1 cursor-pointer rounded-xl border border-border bg-card text-[15px] font-semibold text-ink"
            >
              Start over
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={selectedCount === 0 || importing}
              className="h-12 flex-[1.8] cursor-pointer rounded-xl border-none text-[15px] font-semibold disabled:opacity-60"
              style={{
                background: selectedCount === 0 ? "var(--color-surface-soft)" : "var(--color-accent)",
                color: selectedCount === 0 ? "var(--color-muted)" : "var(--color-on-accent)",
              }}
            >
              {importing ? "Adding…" : `Add ${selectedCount} item${selectedCount === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ------ Step: Photo (default) ------ */
  return (
    <div className="flex h-full flex-col">
      <StepBar step="photo" />
      <div className="flex flex-1 flex-col gap-[14px] px-5 pt-1">
        <div className="flex flex-1 flex-col items-center justify-center gap-[14px] rounded-[20px] border-[1.5px] border-dashed border-border-strong bg-rail p-6 text-center">
          <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-selected">
            <span className="material-symbols-rounded text-[34px] text-accent">view_in_ar</span>
          </span>
          <div className="font-serif text-[22px] leading-[1.2] text-ink">Snap the whole space</div>
          <div className="max-w-[260px] text-[14px] leading-[1.5] text-body">
            Take a photo of a room, shelf, drawer or any space and we&apos;ll find the things in it.
          </div>
          <div className="flex flex-wrap justify-center gap-[6px]">
            {["Garage wall", "Shed", "Pantry", "Drawer"].map((t) => (
              <span key={t} className="rounded-full bg-surface-soft px-[11px] py-[5px] text-[12px] font-semibold text-body">
                {t}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-start gap-[10px] rounded-[14px] border border-border bg-card p-3">
          <span aria-hidden className="material-symbols-rounded text-accent">wb_sunny</span>
          <span className="flex-1 text-[13px] leading-[1.45] text-body">
            Wide shots work best. Stand in a doorway and switch the light on.
          </span>
        </div>
        {error && (
          <p role="alert" className="m-0 rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger-ink">
            {error}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-[10px] px-5 pb-[34px] pt-[14px]">
        <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-accent text-[15px] font-semibold text-on-accent">
          <span className="material-symbols-rounded text-[20px]">photo_camera</span>
          Take a photo
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
        <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-card text-[15px] font-semibold text-ink">
          <span className="material-symbols-rounded text-[20px]">photo_library</span>
          Choose from library
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
      </div>
    </div>
  );
}
