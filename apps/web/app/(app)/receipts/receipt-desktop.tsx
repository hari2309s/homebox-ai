"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

import { currencyLabel, formatCurrency, normalizeCurrency, SUPPORTED_CURRENCIES } from "../../../lib/currency";
import { labelChip } from "../../../lib/label-colors";
import { BAR_BUTTON, BAR_PRIMARY, DropZone, FIELD, HoppingSquares, StepPills } from "../capture/workspace-parts";
import { analyzeReceiptAction, importReceiptItemsAction } from "./actions";

interface PlaceOption {
  id: string;
  name: string;
  path: string;
  color: string;
}

interface Row {
  key: string;
  included: boolean;
  name: string;
  quantity: number;
  price: string;
  locationId: string;
}

const CELL =
  "min-w-0 rounded-[8px] border border-transparent bg-transparent px-[6px] py-[5px] text-ink outline-none hover:border-border focus:border-accent focus:bg-card";
const COLUMNS = "36px minmax(0,1fr) 64px 96px 170px";

function shortDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return dateKey;
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }).format(new Date(y, m - 1, d));
}

export function ReceiptDesktop({
  locations,
  labels,
}: {
  locations: PlaceOption[];
  labels: { id: string; name: string; color: string | null }[];
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [merchant, setMerchant] = useState<string | undefined>();
  const [purchaseDate, setPurchaseDate] = useState("");
  const [currency, setCurrency] = useState(normalizeCurrency(undefined));
  const [everything, setEverything] = useState("");
  const [focused, setFocused] = useState<string | null>(null);
  const [showPhoto, setShowPhoto] = useState(false);
  const [labelIds, setLabelIds] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const replaceRef = useRef<HTMLInputElement>(null);

  const analyze = useCallback(async (selected: File) => {
    setFile(selected);
    setPreviewUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(selected);
    });
    setRows(null);
    setError(null);
    setShowPhoto(false);
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
          price: item.purchasePrice ?? "",
          locationId: "",
        })),
      );
      if (draft.items.length === 0) setError("Couldn't find any line items on that receipt");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't read that receipt");
    } finally {
      setAnalyzing(false);
    }
  }, []);

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setRows(null);
    setError(null);
    setEverything("");
    setLabelIds(new Set());
  }

  function update(key: string, patch: Partial<Row>) {
    setRows((prev) => prev?.map((row) => (row.key === key ? { ...row, ...patch } : row)) ?? null);
  }

  function setAllLocations(id: string) {
    setEverything(id);
    setRows((prev) => prev?.map((row) => ({ ...row, locationId: id })) ?? null);
  }

  async function importRows() {
    const included = rows?.filter((r) => r.included) ?? [];
    if (included.length === 0) return setError("Tick at least one line to import");
    setImporting(true);
    setError(null);
    const formData = new FormData();
    if (file) formData.set("photo", file);
    formData.set("currency", currency);
    formData.set("purchaseDate", purchaseDate);
    formData.set("locationId", everything);
    for (const id of labelIds) formData.append("labelIds", id);
    formData.set(
      "items",
      JSON.stringify(
        included.map((r) => ({
          name: r.name.trim() || "Untitled",
          quantity: r.quantity,
          purchasePrice: r.price.trim() || undefined,
          locationId: r.locationId || null,
        })),
      ),
    );
    try {
      await importReceiptItemsAction(formData);
      router.push("/items");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't import these lines");
      setImporting(false);
    }
  }

  const price = (r: Row) => (Number(r.price) || 0) * (r.quantity || 1);
  const total = rows?.reduce((sum, r) => sum + price(r), 0) ?? 0;
  const selectedRows = rows?.filter((r) => r.included) ?? [];
  const selectedTotal = selectedRows.reduce((sum, r) => sum + price(r), 0);
  const money = (n: number) => formatCurrency(n, currency) ?? n.toFixed(2);
  const placeColor = (id: string) => locations.find((l) => l.id === id)?.color ?? "#9aa49c";

  if (!previewUrl) {
    return (
      <div className="flex h-full min-h-[640px] flex-col gap-4 px-7 py-6">
        <div className="flex items-end gap-[10px]">
          <div className="min-w-0 flex-1">
            <h1 className="m-0 font-serif text-[30px] font-normal leading-none text-ink">Receipt</h1>
            <div className="mt-1 font-mono text-[10px] text-muted">STEP 1 OF 3 · ADD THE RECEIPT</div>
          </div>
          <StepPills steps={["Receipt", "Read", "Choose"]} current={0} />
        </div>
        {error && (
          <p role="alert" className="m-0 rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger-ink">
            {error}
          </p>
        )}
        <DropZone
          title="Drop a receipt here, or paste with ⌘V"
          hint="I'll pull out each line, the shop and the date, and you choose which lines become things."
          onFile={analyze}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[640px]">
      <div className="flex w-[340px] flex-none flex-col gap-3 border-r border-border px-5 py-6">
        <div>
          <h1 className="m-0 font-serif text-[30px] font-normal leading-none text-ink">Receipt</h1>
          <div className="mt-1 truncate font-mono text-[10px] text-muted">
            {(file?.name ?? "RECEIPT").toUpperCase()} · 1 PAGE
          </div>
        </div>
        <div className="relative flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-[4px] border border-border bg-rail px-[18px] py-5 font-mono text-[11px] text-body shadow-[8px_12px_24px_-12px_rgba(31,38,34,.25)]">
          {showPhoto || !rows ? (
            // eslint-disable-next-line @next/next/no-img-element -- locally-selected blob URL
            <img src={previewUrl} alt="The receipt you added" className="w-full rounded-[3px] object-contain" />
          ) : (
            <>
              <div className="text-center font-medium text-ink">{(merchant ?? "RECEIPT").toUpperCase()}</div>
              {purchaseDate && <div className="text-center text-[10px] text-muted">{purchaseDate}</div>}
              <div className="my-1 border-t border-dashed border-border-strong" />
              {rows.map((row) => (
                <div
                  key={row.key}
                  className={`-mx-[6px] flex justify-between gap-3 rounded-[3px] px-[6px] py-[2px] ${focused === row.key ? "bg-warn-soft" : ""}`}
                >
                  <span className="truncate">{row.name.toUpperCase()}</span>
                  <span>{row.price || "—"}</span>
                </div>
              ))}
              <div className="my-1 border-t border-dashed border-border-strong" />
              <div className="flex justify-between font-medium text-ink">
                <span>TOTAL</span>
                <span>{total.toFixed(2)}</span>
              </div>
            </>
          )}
          {analyzing && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface/75">
              <HoppingSquares label="Reading the receipt…" />
            </div>
          )}
        </div>
        <div className="flex gap-[6px]">
          <button
            type="button"
            onClick={() => setShowPhoto((v) => !v)}
            disabled={!rows}
            className={`${BAR_BUTTON} flex-1 justify-center disabled:opacity-50`}
          >
            <span aria-hidden className="material-symbols-rounded text-[16px]">
              {showPhoto ? "receipt_long" : "zoom_in"}
            </span>
            {showPhoto ? "Lines" : "Photo"}
          </button>
          <button
            type="button"
            onClick={() => replaceRef.current?.click()}
            className={`${BAR_BUTTON} flex-1 justify-center`}
          >
            <span aria-hidden className="material-symbols-rounded text-[16px]">
              swap_horiz
            </span>
            Replace
          </button>
          <input
            ref={replaceRef}
            type="file"
            accept="image/*"
            className="hidden"
            aria-label="Replace the receipt"
            onChange={(event) => {
              const next = event.target.files?.[0];
              if (next) void analyze(next);
              event.target.value = "";
            }}
          />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto px-7 py-6">
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-accent">
            {rows
              ? `${rows.length} ${rows.length === 1 ? "LINE" : "LINES"} FOUND · ${selectedRows.length} SELECTED · ${money(selectedTotal)} OF ${money(total)}`
              : "READING THE RECEIPT"}
          </span>
          <button type="button" onClick={reset} className={BAR_BUTTON}>
            <span aria-hidden className="material-symbols-rounded text-[16px]">
              restart_alt
            </span>
            Start over
          </button>
          <button
            type="button"
            onClick={importRows}
            disabled={!rows || selectedRows.length === 0 || importing}
            className={BAR_PRIMARY}
          >
            <span aria-hidden className="material-symbols-rounded text-[16px]">
              download
            </span>
            {importing ? "Importing…" : `Import ${selectedRows.length} ${selectedRows.length === 1 ? "item" : "items"}`}
          </button>
        </div>

        {error && (
          <p role="alert" className="m-0 rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger-ink">
            {error}
          </p>
        )}

        {rows ? (
          <>
            <h2 className="m-0 font-serif text-[30px] font-normal leading-[1.1] text-ink">
              {merchant ?? "Receipt"}
              {purchaseDate ? `, ${shortDate(purchaseDate)}` : ""}
            </h2>
            <div className="grid grid-cols-[130px_160px_minmax(0,1fr)] gap-[10px]">
              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-semibold text-body">Currency</span>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(normalizeCurrency(e.target.value))}
                  className={`${FIELD} font-mono`}
                >
                  {SUPPORTED_CURRENCIES.map((code) => (
                    <option key={code} value={code}>
                      {currencyLabel(code)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-semibold text-body">Date</span>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className={`${FIELD} font-mono`}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-semibold text-body">Put everything in</span>
                <select value={everything} onChange={(e) => setAllLocations(e.target.value)} className={FIELD}>
                  <option value="">No location</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.path}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div
              role="table"
              aria-label="Receipt lines"
              className="overflow-hidden rounded-[14px] border border-border bg-card"
            >
              <div
                role="row"
                className="grid gap-[10px] border-b border-border/60 px-[14px] py-[10px] font-mono text-[10px] text-muted"
                style={{ gridTemplateColumns: COLUMNS }}
              >
                <span role="columnheader" aria-label="Import" />
                <span role="columnheader">NAME</span>
                <span role="columnheader">QTY</span>
                <span role="columnheader">PRICE</span>
                <span role="columnheader">PUT IT IN</span>
              </div>
              {rows.map((row) => {
                const isFocused = focused === row.key;
                return (
                  <div
                    key={row.key}
                    role="row"
                    tabIndex={0}
                    onFocus={() => setFocused(row.key)}
                    onKeyDown={(event) => {
                      if (event.key === " " && event.target === event.currentTarget) {
                        event.preventDefault();
                        update(row.key, { included: !row.included });
                      }
                    }}
                    className={`grid items-center gap-[10px] border-b border-border/40 px-[14px] py-[6px] outline-none last:border-b-0 ${
                      isFocused ? "bg-selected-soft shadow-[inset_3px_0_0_var(--color-accent)]" : ""
                    } ${row.included ? "" : "opacity-45"}`}
                    style={{ gridTemplateColumns: COLUMNS }}
                  >
                    <span role="cell">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={row.included}
                        aria-label={`Import ${row.name}`}
                        onClick={() => update(row.key, { included: !row.included })}
                        className={`flex h-5 w-5 cursor-pointer items-center justify-center rounded-[6px] p-0 ${
                          row.included
                            ? "border-none bg-accent text-on-accent"
                            : "border-[1.5px] border-solid border-border-strong bg-card"
                        }`}
                      >
                        {row.included && (
                          <span aria-hidden className="material-symbols-rounded text-[15px]">
                            check
                          </span>
                        )}
                      </button>
                    </span>
                    <span role="cell" className="min-w-0">
                      <input
                        aria-label="Name"
                        value={row.name}
                        onChange={(e) => update(row.key, { name: e.target.value })}
                        className={`${CELL} w-full text-[14px] font-medium`}
                      />
                    </span>
                    <span role="cell" className="min-w-0">
                      <input
                        aria-label="Quantity"
                        type="number"
                        min={1}
                        value={row.quantity}
                        onChange={(e) => update(row.key, { quantity: Number(e.target.value) || 1 })}
                        className={`${CELL} w-full font-mono text-[12px]`}
                      />
                    </span>
                    <span role="cell" className="min-w-0">
                      <input
                        aria-label="Price"
                        inputMode="decimal"
                        value={row.price}
                        placeholder="0.00"
                        onChange={(e) => update(row.key, { price: e.target.value })}
                        className={`${CELL} w-full font-mono text-[12px]`}
                      />
                    </span>
                    <span role="cell" className="relative flex min-w-0 items-center gap-[6px] text-[13px] text-body">
                      <span
                        className="h-[7px] w-[7px] flex-none rounded-[2px]"
                        style={{ background: row.locationId ? placeColor(row.locationId) : "#c5c9bf" }}
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {locations.find((l) => l.id === row.locationId)?.name ?? "No location"}
                      </span>
                      <span aria-hidden className="material-symbols-rounded text-[16px] text-faint">
                        expand_more
                      </span>
                      <select
                        aria-label={`Location for ${row.name}`}
                        value={row.locationId}
                        onChange={(e) => update(row.key, { locationId: e.target.value })}
                        className="absolute inset-0 cursor-pointer opacity-0"
                      >
                        <option value="">No location</option>
                        {locations.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.path}
                          </option>
                        ))}
                      </select>
                    </span>
                  </div>
                );
              })}
            </div>

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
            )}
            <p className="m-0 font-mono text-[10px] text-muted">TAB MOVES BETWEEN CELLS · SPACE TICKS A FOCUSED ROW</p>
          </>
        ) : (
          <div className="flex flex-col gap-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className="h-10 rounded-[10px] bg-surface-soft" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
