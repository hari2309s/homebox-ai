import { itemQueries, maintenanceQueries, reminderQueries } from "@homebox-ai/db";
import { AnimatedHomeboxIcon } from "@homebox-ai/ui";
import Link from "next/link";

import { getSessionUser } from "@homebox-ai/supabase/server";

import { formatDate } from "../../lib/date";
import { listLocationsCached } from "../../lib/cached-queries";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
}

type Location = { id: string; name: string; parentId: string | null };
type LocationCount = { locationId: string | null; count: number };

function buildZones(locations: Location[], counts: LocationCount[]) {
  const countMap = new Map(counts.map((c) => [c.locationId, c.count]));

  const topLevel = locations.filter((l) => !l.parentId);
  const children = (parentId: string) => locations.filter((l) => l.parentId === parentId);

  function totalCount(loc: Location): number {
    const direct = countMap.get(loc.id) ?? 0;
    return direct + children(loc.id).reduce((sum, child) => sum + totalCount(child), 0);
  }

  return topLevel.map((loc) => ({
    id: loc.id,
    name: loc.name,
    count: totalCount(loc),
    children: children(loc.id).map((child) => ({
      id: child.id,
      name: child.name,
      count: totalCount(child),
    })),
  }));
}

const ZONE_COLORS = [
  { bg: "#f3f1ea", border: "#c5c9bf", text: "#3a423d", label: "HOUSE" },
  { bg: "#dfe8d6", border: "#9fb894", text: "#2c4d31", label: "GARDEN" },
  { bg: "#ecdccd", border: "#b0643f", text: "#7a3f22", label: "GARAGE" },
  { bg: "#e7e1d0", border: "#c9bfa3", text: "#5a4f33", label: "SHED" },
  { bg: "#e2e2dc", border: "#b8b8b0", text: "#5f6a62", label: "DRIVE" },
];

export default async function DashboardPage() {
  const user = await getSessionUser();

  const [locations, itemCounts, totalItems, expiringWarranties, recentMaintenance, recentReminders] = user
    ? await Promise.all([
        listLocationsCached(user.id),
        itemQueries.countItemsByLocation(user.id),
        itemQueries.countItems(user.id),
        itemQueries.listUpcomingWarrantyExpirations(user.id),
        maintenanceQueries.listRecentMaintenance(user.id, 3).catch(() => []),
        reminderQueries.listRecentReminders(user.id, 3).catch(() => []),
      ])
    : [[], [], 0, [], [], []];

  const zones = buildZones(locations, itemCounts);
  const displayName = typeof user?.user_metadata?.full_name === "string"
    ? user.user_metadata.full_name.split(" ")[0]
    : undefined;

  const unassignedCount = itemCounts.find((c) => c.locationId === null)?.count ?? 0;

  return (
    <div className="flex flex-col gap-[14px] p-4 pb-2">
      {/* Header */}
      <div className="flex items-center gap-3 px-1">
        <AnimatedHomeboxIcon size={44} />
        <div className="flex-1">
          <div className="font-mono text-[10px] tracking-[0.06em] text-muted">
            {totalItems} ITEMS · {locations.length} LOCATIONS
          </div>
          <div className="font-serif text-2xl leading-tight text-ink">
            {getGreeting()}{displayName ? `, ${displayName}` : ""}
          </div>
        </div>
      </div>

      {/* Site plan */}
      <div className="relative overflow-hidden rounded-[18px] bg-[#dfe8d6] dark:bg-[#1e2e20]" style={{ backgroundImage: "radial-gradient(rgba(63,107,69,.18) 1px, transparent 1.2px)", backgroundSize: "10px 10px" }}>
        <div className="p-3">
          <span className="font-mono text-[10px] tracking-wide text-[#2c4d31] dark:text-[#9cc68f]">
            YOUR PROPERTY · {zones.length} ZONES
          </span>
        </div>

        {zones.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 pb-8 pt-4 text-center">
            <span className="font-serif text-lg text-ink">No locations yet</span>
            <p className="text-sm text-muted">
              Add your first location — a room, garage, or garden — and the site plan will map it here.
            </p>
            <Link
              href="/locations"
              className="mt-1 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white no-underline"
            >
              Add a location
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-[6px] p-3 pt-0">
            {zones.map((zone, i) => {
              const palette = ZONE_COLORS[i % ZONE_COLORS.length]!;
              return (
                <Link
                  key={zone.id}
                  href={`/items?location=${zone.id}`}
                  className="flex flex-col gap-1 rounded-md border-[1.5px] p-2 no-underline transition-shadow hover:shadow-card"
                  style={{ background: palette.bg, borderColor: palette.border }}
                >
                  <span className="font-mono text-[9px] tracking-wide" style={{ color: palette.text }}>
                    {zone.name.toUpperCase()}
                  </span>
                  <span className="font-sans text-lg font-bold" style={{ color: palette.text }}>
                    {zone.count}
                  </span>
                  {zone.children.length > 0 && (
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {zone.children.slice(0, 3).map((child) => (
                        <span
                          key={child.id}
                          className="rounded-[3px] px-1.5 py-0.5 font-mono text-[8px]"
                          style={{ background: `${palette.border}33`, color: palette.text }}
                        >
                          {child.name.toUpperCase()} · {child.count}
                        </span>
                      ))}
                      {zone.children.length > 3 && (
                        <span className="font-mono text-[8px]" style={{ color: palette.text }}>
                          +{zone.children.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              );
            })}
            {unassignedCount > 0 && (
              <Link
                href="/items"
                className="flex flex-col gap-1 rounded-md border-[1.5px] border-dashed border-[#b8b8b0] bg-[#ecebe4] p-2 no-underline dark:border-[#3a4a3c] dark:bg-[#232a25]"
              >
                <span className="font-mono text-[9px] tracking-wide text-muted">UNASSIGNED</span>
                <span className="text-lg font-bold text-muted">{unassignedCount}</span>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* AI suggestion / alerts */}
      {(expiringWarranties.length > 0 || recentMaintenance.length > 0 || recentReminders.length > 0) && (
        <div className="flex flex-col gap-2">
          {expiringWarranties.slice(0, 2).map((item) => (
            <Link
              key={item.id}
              href={`/items/${item.id}`}
              className="flex items-start gap-3 rounded-[14px] border border-border bg-card p-[14px] no-underline shadow-card"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ecdccd]">
                <span className="material-symbols-rounded text-[18px] text-[#b0643f]">shield</span>
              </span>
              <div className="flex-1 text-sm leading-relaxed text-body">
                <b className="text-ink">{item.name}</b> warranty expires{" "}
                {item.warrantyExpires && formatDate(item.warrantyExpires)}
              </div>
            </Link>
          ))}
          {recentMaintenance.slice(0, 1).map((entry) => (
            <Link
              key={entry.id}
              href={`/items/${entry.itemId}`}
              className="flex items-start gap-3 rounded-[14px] border border-border bg-card p-[14px] no-underline shadow-card"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#dfe8d6]">
                <span className="material-symbols-rounded text-[18px] text-[#3f6b45]">build</span>
              </span>
              <div className="flex-1 text-sm leading-relaxed text-body">
                <b className="text-ink">{entry.name}</b>
                {entry.itemName ? ` · ${entry.itemName}` : ""}
              </div>
            </Link>
          ))}
        </div>
      )}

      {totalItems === 0 && (
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <p className="text-sm text-muted">
            Nothing logged on the property yet. Walk out and snap something?
          </p>
        </div>
      )}

      {/* Search + capture bar */}
      <Link
        href="/chat"
        className="flex items-center gap-[10px] rounded-[14px] border border-border bg-card py-[6px] pl-4 pr-[6px] no-underline shadow-card"
      >
        <span className="flex-1 text-[15px] text-muted">Find anything on your property…</span>
        <Link
          href="/capture"
          className="flex h-[42px] w-[42px] items-center justify-center rounded-[10px] bg-accent no-underline"
        >
          <span className="material-symbols-rounded text-white">photo_camera</span>
        </Link>
      </Link>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Link href="/capture" className="flex items-center gap-1.5 rounded-full bg-[#dfe8d6] px-3 py-[7px] text-[13px] font-semibold text-[#2c4d31] no-underline dark:bg-[#2c3e2e] dark:text-[#9cc68f]">
          <span className="material-symbols-rounded text-[16px]">photo_camera</span>
          Capture
        </Link>
        <Link href="/receipts" className="flex items-center gap-1.5 rounded-full bg-[#ecdccd] px-3 py-[7px] text-[13px] font-semibold text-[#7a3f22] no-underline dark:bg-[#3a2e22] dark:text-[#d4a47e]">
          <span className="material-symbols-rounded text-[16px]">receipt_long</span>
          Receipt
        </Link>
        <Link href="/scan" className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-[6px] text-[13px] font-semibold text-ink no-underline">
          <span className="material-symbols-rounded text-[16px]">qr_code_scanner</span>
          Scan
        </Link>
      </div>
    </div>
  );
}
