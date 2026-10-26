import { itemLabelQueries, itemQueries, maintenanceQueries } from "@homebox-ai/db";
import Link from "next/link";

import { createSupabaseServerClient } from "@homebox-ai/supabase/server";
import { getAttachmentSignedUrls } from "@homebox-ai/supabase/storage";

import { formatCurrency } from "../../../lib/currency";
import {
  breadcrumb,
  DetailGrid,
  detailRows,
  locationPath,
  MiniPlan,
  StatStrip,
  stripeFor,
  summaryStats,
  warrantyStat,
  zoneIndexOf,
  type LocationRow,
} from "./item-summary";

const LABEL_FALLBACK = "#7c867f";

function hexToTint(hex: string | null): { bg: string; fg: string } {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return { bg: "var(--color-surface-soft)", fg: "var(--color-ink)" };
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { bg: `rgba(${r},${g},${b},0.2)`, fg: "var(--color-ink)" };
}

function shortDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }).format(new Date(y!, m! - 1, d!)).toUpperCase();
}

export function EmptyPane({ locations }: { locations: LocationRow[] }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-10 text-center">
      <MiniPlan zoneIndex={locations.length ? 0 : -1} label="YOUR PROPERTY" className="h-[150px] w-[260px]" />
      <div className="font-serif text-[22px] text-ink">Pick a thing to see it here</div>
      <p className="m-0 max-w-xs text-[13px] text-muted">Use ↑ and ↓ to move through the list. Enter opens the full page.</p>
    </div>
  );
}

export async function ItemPane({
  userId,
  itemId,
  locations,
  labels,
}: {
  userId: string;
  itemId: string;
  locations: LocationRow[];
  labels: { id: string; name: string; color: string | null }[];
}) {
  const [item, withPhoto, itemLabelRows, care] = await Promise.all([
    itemQueries.getItem(userId, itemId),
    itemQueries.getItemWithPrimaryPhoto(userId, itemId),
    itemLabelQueries.listLabelsForItem(userId, itemId),
    maintenanceQueries.listMaintenanceForItem(userId, itemId),
  ]);
  if (!item) return <EmptyPane locations={locations} />;

  let photoUrl: string | null = null;
  if (withPhoto?.primaryPhotoPath) {
    const supabase = await createSupabaseServerClient();
    photoUrl = (await getAttachmentSignedUrls(supabase, [withPhoto.primaryPhotoPath])).get(withPhoto.primaryPhotoPath) ?? null;
  }

  const labelIds = new Set(itemLabelRows.map((row) => row.labelId));
  const itemLabels = labels.filter((l) => labelIds.has(l.id));
  const path = locationPath(locations, item.locationId);
  const zoneIndex = zoneIndexOf(locations, item.locationId);
  const recentCare = [...care].sort((a, b) => b.date.localeCompare(a.date));
  const warranty = warrantyStat(item);
  const rows = detailRows(item, path.map((l) => l.name).join(" › ") || "Unassigned", []).slice(0, 7);

  return (
    <div className="flex flex-col gap-4 px-7 py-6">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-accent">{breadcrumb(path)}</span>
        <Link
          href={`/items/${item.id}?edit=1#details`}
          className="flex h-[34px] items-center gap-[6px] rounded-[9px] border border-border bg-card px-3 text-[13px] font-semibold text-ink no-underline"
        >
          <span className="material-symbols-rounded text-[16px]">edit</span>
          Edit
        </Link>
        <Link
          href={`/items/${item.id}#care`}
          className="flex h-[34px] items-center gap-[6px] rounded-[9px] bg-accent px-3 text-[13px] font-semibold text-white no-underline"
        >
          <span className="material-symbols-rounded text-[16px]">build</span>
          Log care
        </Link>
        <Link
          href={`/items/${item.id}`}
          aria-label="Open full page"
          className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] border border-border bg-card text-ink no-underline"
        >
          <span className="material-symbols-rounded">open_in_full</span>
        </Link>
      </div>

      <div className="grid grid-cols-[240px_minmax(0,1fr)] gap-[18px]">
        <div
          className="flex h-[200px] items-center justify-center overflow-hidden rounded-[14px]"
          style={photoUrl ? undefined : { backgroundImage: stripeFor(zoneIndex, 10) }}
        >
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed Storage URL
            <img src={photoUrl} alt={item.name} className="h-full w-full object-cover" />
          ) : (
            <span className="font-mono text-[10px] text-muted">no photo yet</span>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-[10px]">
          <h2 className="m-0 font-serif text-[30px] font-normal leading-[1.1] text-ink">{item.name}</h2>
          {itemLabels.length > 0 && (
            <div className="flex flex-wrap gap-[6px]">
              {itemLabels.map((label) => {
                const tint = hexToTint(label.color ?? LABEL_FALLBACK);
                return (
                  <span
                    key={label.id}
                    className="rounded-full px-[10px] py-1 text-[12px] font-semibold"
                    style={{ background: tint.bg, color: tint.fg }}
                  >
                    {label.name}
                  </span>
                );
              })}
            </div>
          )}
          <div className="mt-auto">
            <StatStrip stats={summaryStats(item, recentCare[0]?.date ?? null, true)} size="sm" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <section className="rounded-[14px] border border-border bg-card px-[14px] pt-1">
          <h3 className="m-0 pb-1 pt-[10px] font-serif text-[18px] font-normal text-ink">Details</h3>
          <DetailGrid rows={rows} />
        </section>
        <div className="flex min-w-0 flex-col gap-3">
          <section className="rounded-[14px] border border-border bg-card px-[14px] pb-2 pt-1">
            <h3 className="m-0 pb-1 pt-[10px] font-serif text-[18px] font-normal text-ink">Care history</h3>
            {recentCare.length === 0 ? (
              <p className="m-0 py-2 text-[13px] text-muted">No care logged yet.</p>
            ) : (
              recentCare.slice(0, 4).map((entry) => (
                <div
                  key={entry.id}
                  className="grid grid-cols-[70px_minmax(0,1fr)_auto] items-center gap-[10px] border-b border-border/40 py-2 text-[13px] last:border-b-0"
                >
                  <span className="font-mono text-[10px] text-muted">{shortDate(entry.date)}</span>
                  <span className="truncate text-ink">{entry.name}</span>
                  <span className="font-mono text-[12px] text-body">{formatCurrency(entry.cost, item.currency) ?? ""}</span>
                </div>
              ))
            )}
          </section>
          {(warranty.tone === "warn" || warranty.tone === "bad") && (
            <div className="flex items-start gap-[10px] rounded-xl bg-[#ecdccd] px-3 py-[11px]">
              <span className="material-symbols-rounded text-[#7a3f22]">gpp_maybe</span>
              <span className="flex-1 text-[13px] leading-[1.45] text-[#5a2e18]">
                {warranty.tone === "bad" ? (
                  <b>Warranty has ended.</b>
                ) : (
                  <>
                    <b>Warranty ends in {warranty.value}.</b> Check the receipt is attached if you need to claim.
                  </>
                )}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
