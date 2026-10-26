import { formatCurrency } from "../../../lib/currency";
import { formatDate } from "../../../lib/date";

export interface LocationRow {
  id: string;
  name: string;
  parentId: string | null;
}

/** Zone palette by top-level location order — same order the dashboard plan and zone chips use. */
export const ZONE_DOTS = ["#c5c9bf", "#3f6b45", "#b0643f", "#8a7a4f", "#7c867f"];
export const ZONE_STRIPES = ["#f3f1ea", "#dfe8d6", "#ecdccd", "#e7e1d0", "#e2e2dc"];

export function locationPath(locations: LocationRow[], locationId: string | null): LocationRow[] {
  const byId = new Map(locations.map((l) => [l.id, l]));
  const path: LocationRow[] = [];
  let current = locationId ? byId.get(locationId) : undefined;
  while (current && path.length < 20 && !path.includes(current)) {
    path.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return path;
}

export function zoneIndexOf(locations: LocationRow[], locationId: string | null): number {
  const root = locationPath(locations, locationId)[0];
  if (!root) return -1;
  return locations.filter((l) => !l.parentId).findIndex((l) => l.id === root.id);
}

export function stripeFor(zoneIndex: number, size = 5): string {
  const tint = zoneIndex < 0 ? "#e9e8e1" : ZONE_STRIPES[zoneIndex % ZONE_STRIPES.length];
  const stripe = `color-mix(in srgb, ${tint} var(--stripe-mix), var(--color-rail))`;
  return `repeating-linear-gradient(135deg, ${stripe} 0 ${size}px, var(--color-rail) ${size}px ${size * 2}px)`;
}

export function breadcrumb(path: LocationRow[]): string {
  return path.length ? path.map((l) => l.name.toUpperCase()).join(" › ") : "UNASSIGNED";
}

function daysUntil(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  const target = new Date(y!, m! - 1, d!);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function monthYear(dateKey: string): string {
  const [y, m] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" }).format(new Date(y!, m! - 1, 1));
}

function dayMonth(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }).format(new Date(y!, m! - 1, d!));
}

export interface SummaryItem {
  currency: string;
  purchasePrice: string | null;
  purchaseDate: string | null;
  warrantyExpires: string | null;
  lifetimeWarranty: boolean;
}

export interface Stat {
  label: string;
  value: string;
  tone: "ink" | "good" | "warn" | "bad";
}

export const STAT_TONE: Record<Stat["tone"], string> = {
  ink: "text-ink",
  good: "text-(--plan-ink)",
  warn: "text-[#8a6a1a] dark:text-[#d9a43a]",
  bad: "text-[#b0643f]",
};

export function warrantyStat(item: SummaryItem): Stat {
  if (item.lifetimeWarranty) return { label: "warranty", value: "lifetime", tone: "good" };
  if (!item.warrantyExpires) return { label: "warranty", value: "—", tone: "ink" };
  const days = daysUntil(item.warrantyExpires);
  if (days < 0) return { label: "warranty", value: "expired", tone: "bad" };
  if (days <= 60) return { label: "warranty", value: `${days} day${days === 1 ? "" : "s"}`, tone: "warn" };
  return { label: "warranty", value: `to ${item.warrantyExpires.slice(0, 4)}`, tone: "good" };
}

export function summaryStats(item: SummaryItem, lastCareDate: string | null, compact = false): Stat[] {
  const stats: Stat[] = [
    { label: "paid", value: formatCurrency(item.purchasePrice, item.currency) ?? "—", tone: "ink" },
  ];
  if (!compact) {
    stats.push({ label: "bought", value: item.purchaseDate ? monthYear(item.purchaseDate) : "—", tone: "ink" });
  }
  stats.push(warrantyStat(item));
  stats.push({ label: "last care", value: lastCareDate ? dayMonth(lastCareDate) : "none", tone: "ink" });
  return stats;
}

export function StatStrip({ stats, size = "md" }: { stats: Stat[]; size?: "sm" | "md" }) {
  return (
    <div
      className={`grid rounded-xl border border-border bg-card px-1 text-center ${size === "sm" ? "py-[10px]" : "py-3"}`}
      style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}
    >
      {stats.map((stat, i) => (
        <div key={stat.label} className={i > 0 ? "border-l border-border/60" : ""}>
          <div className={`truncate px-1 font-mono ${size === "sm" ? "text-[15px]" : "text-[16px]"} ${STAT_TONE[stat.tone]}`}>
            {stat.value}
          </div>
          <div className="text-[11px] text-muted">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

export interface DetailItem {
  quantity: number;
  manufacturer: string | null;
  modelNumber: string | null;
  serialNumber: string | null;
  purchaseFrom: string | null;
  purchaseDate: string | null;
  warrantyExpires: string | null;
  assetId: number | null;
  insured: boolean;
  description: string | null;
  notes: string | null;
}

export function detailRows(item: DetailItem, locationLabel: string, labelNames: string[]): { k: string; v: string }[] {
  const rows: { k: string; v: string | null }[] = [
    { k: "Location", v: locationLabel },
    { k: "Brand", v: item.manufacturer },
    { k: "Model", v: item.modelNumber },
    { k: "Serial", v: item.serialNumber },
    { k: "Bought from", v: item.purchaseFrom },
    { k: "Bought on", v: item.purchaseDate ? formatDate(item.purchaseDate) : null },
    { k: "Warranty to", v: item.warrantyExpires ? formatDate(item.warrantyExpires) : null },
    { k: "Quantity", v: item.quantity > 1 ? String(item.quantity) : null },
    { k: "Asset ID", v: item.assetId != null ? `#${String(item.assetId).padStart(4, "0")}` : null },
    { k: "Labels", v: labelNames.length ? labelNames.join(", ") : null },
    { k: "Insured", v: item.insured ? "Yes" : null },
    { k: "Description", v: item.description },
    { k: "Notes", v: item.notes },
  ];
  return rows.filter((row): row is { k: string; v: string } => !!row.v);
}

export function DetailGrid({ rows, columns = 1 }: { rows: { k: string; v: string }[]; columns?: 1 | 2 }) {
  if (rows.length === 0) return <p className="m-0 py-3 text-[13px] text-muted">No details yet.</p>;
  return (
    <dl className={`m-0 grid ${columns === 2 ? "lg:grid-cols-2 lg:gap-x-6" : ""}`}>
      {rows.map((row) => (
        <div key={row.k} className="grid grid-cols-[110px_minmax(0,1fr)] gap-[10px] border-b border-border/40 py-2 text-[13px]">
          <dt className="text-muted">{row.k}</dt>
          <dd className="m-0 truncate text-ink" title={row.v}>
            {row.v}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** A small drawing of the item's zone with a pin — the "where is it" card beside photos. */
export function MiniPlan({ zoneIndex, label, className = "" }: { zoneIndex: number; label: string; className?: string }) {
  const building =
    zoneIndex === 2
      ? "bg-(--plan-garage) border-(--plan-garage-line)"
      : zoneIndex === 3 || zoneIndex >= 4
        ? "bg-(--plan-shed) border-(--plan-shed-line)"
        : zoneIndex === 1
          ? "bg-(--plan-bed) border-(--plan-bed-line)"
          : "bg-(--plan-house) border-(--plan-house-line)";
  return (
    <div
      className={`relative overflow-hidden rounded-[14px] bg-(--plan-ground) ${className}`}
      style={{ backgroundImage: "radial-gradient(var(--plan-dots) 1px, transparent 1.2px)", backgroundSize: "9px 9px" }}
    >
      <div className={`absolute left-6 top-6 h-24 w-40 rounded-[3px] border-[1.5px] ${building}`} />
      <div className="absolute left-[30px] top-9 h-[70px] w-[5px] bg-(--plan-shed-line)" />
      <span className="absolute left-6 top-10 h-5 w-5 rounded-full bg-accent shadow-[0_0_0_3px_var(--color-card)]" />
      <span className="absolute bottom-[10px] left-[14px] right-[14px] truncate font-mono text-[10px] text-(--plan-ink)">{label}</span>
    </div>
  );
}
