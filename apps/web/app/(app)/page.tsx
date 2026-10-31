import { itemQueries, maintenanceQueries, reminderQueries } from "@homebox-ai/db";
import Link from "next/link";

import { getSessionUser } from "@homebox-ai/supabase/server";

import { formatDate } from "../../lib/date";
import { listLocationsCached } from "../../lib/cached-queries";
import { PlanWorkspace } from "./plan-canvas";

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

const DUE_DOT_COLORS = ["#3f6b45", "#b0643f", "#8a7a4f"];

function dueLabel(dueDate: string, todayKey: string): string {
  if (dueDate < todayKey) return "OVERDUE";
  if (dueDate === todayKey) return "TODAY";
  return new Date(`${dueDate}T00:00:00`)
    .toLocaleDateString(undefined, { weekday: "short", day: "numeric" })
    .toUpperCase();
}

function formatCompactMoney(total: string, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(total));
}

export default async function DashboardPage() {
  const user = await getSessionUser();

  const [
    locations,
    itemCounts,
    totalItems,
    expiringWarranties,
    recentMaintenance,
    reminders,
    valueByCurrency,
    allItems,
  ] = user
    ? await Promise.all([
        listLocationsCached(user.id),
        itemQueries.countItemsByLocation(user.id),
        itemQueries.countItems(user.id),
        itemQueries.listUpcomingWarrantyExpirations(user.id),
        maintenanceQueries.listRecentMaintenance(user.id, 3).catch(() => []),
        reminderQueries.listReminders(user.id).catch(() => []),
        itemQueries.getInventoryValueByCurrency(user.id).catch(() => []),
        itemQueries.searchItems(user.id),
      ])
    : [[], [], 0, [], [], [], [], []];

  const planLocations = locations.map((l) => ({
    id: l.id,
    name: l.name,
    parentId: l.parentId,
    planKind: l.planKind,
    planShape: l.planShape,
    planX: l.planX,
    planY: l.planY,
    planW: l.planW,
    planH: l.planH,
  }));
  const planThings = allItems.map((item) => ({
    id: item.id,
    name: item.name,
    locationId: item.locationId,
    planX: item.planX,
    planY: item.planY,
  }));

  const zones = buildZones(locations, itemCounts);
  const displayName =
    typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name.split(" ")[0] : undefined;

  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const dateLine = now
    .toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })
    .replace(",", "")
    .toUpperCase();
  const dueSoon = reminders.filter((r) => r.status === "pending").slice(0, 3);
  const topValue = [...valueByCurrency].sort((a, b) => Number(b.total) - Number(a.total))[0];

  const alertPlaceIds = [
    ...new Set(expiringWarranties.map((w) => w.locationId).filter((id): id is string => id !== null)),
  ];

  const firstWarranty = expiringWarranties[0];
  const firstDue = dueSoon[0];

  return (
    <div
      data-full-bleed
      className="flex flex-col gap-[14px] p-4 pb-2 lg:h-full lg:min-h-[640px] lg:gap-5 lg:px-8 lg:py-7"
    >
      {/* Desktop header */}
      <div className="hidden items-end gap-4 lg:flex">
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[11px] text-muted">
            {dateLine} · {totalItems} {totalItems === 1 ? "THING" : "THINGS"} · {zones.length}{" "}
            {zones.length === 1 ? "ZONE" : "ZONES"}
          </div>
          <div className="font-serif text-[36px] leading-[1.1] text-ink">
            {getGreeting()}
            {displayName ? `, ${displayName}` : ""}
          </div>
        </div>
        <form
          action="/items"
          method="GET"
          role="search"
          className="flex w-[380px] items-center gap-[10px] rounded-xl border border-border bg-card py-[6px] pl-[14px] pr-[6px] focus-within:border-accent"
        >
          <span className="material-symbols-rounded text-muted">search</span>
          <input
            name="q"
            type="search"
            placeholder="Find anything on your property…"
            aria-label="Find anything on your property"
            className="min-w-0 flex-1 border-none bg-transparent text-[14px] text-ink outline-none placeholder:text-muted"
          />
          <Link
            href="/capture"
            className="flex h-9 items-center gap-[6px] rounded-[9px] bg-accent px-3 text-[13px] font-semibold text-on-accent no-underline"
          >
            <span className="material-symbols-rounded text-[18px]">photo_camera</span>
            Snap
          </Link>
        </form>
      </div>

      {/* Mobile stats (title/greeting handled by the persistent MobileHeader) */}
      <div className="px-1 lg:hidden">
        <div className="font-mono text-[10px] tracking-[0.06em] text-muted">
          {totalItems} ITEMS · {locations.length} LOCATIONS
        </div>
      </div>

      <PlanWorkspace
        locations={planLocations}
        things={planThings}
        alertPlaceIds={alertPlaceIds}
        defaultAside={
          <>
            <div className="flex flex-col gap-[10px] rounded-[14px] border border-border bg-card p-4 shadow-[8px_12px_24px_-14px_rgba(31,38,34,.25)]">
              <div className="flex items-center gap-[10px]">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-selected">
                  <span className="material-symbols-rounded text-[18px] text-accent">psychiatry</span>
                </span>
                <span className="font-mono text-[10px] text-accent">FROM THE HOUSE</span>
              </div>
              <p className="m-0 text-[15px] leading-normal text-body">
                {firstWarranty || firstDue ? (
                  <>
                    {firstWarranty && (
                      <>
                        The <b className="text-ink">{firstWarranty.name}</b> warranty ends
                        {firstWarranty.warrantyExpires ? ` ${formatDate(firstWarranty.warrantyExpires)}` : " soon"}
                        .{" "}
                      </>
                    )}
                    {firstDue && (
                      <>
                        <b className="text-ink">{firstDue.title}</b> is due {formatDate(firstDue.dueDate)}.
                      </>
                    )}
                  </>
                ) : totalItems === 0 ? (
                  "Nothing logged on the property yet. Walk out and snap something?"
                ) : (
                  "All quiet on the property. Nothing due and no warranties running out."
                )}
              </p>
              <div className="flex gap-[6px]">
                <Link
                  href="/calendar"
                  className="rounded-full bg-selected px-3 py-[6px] text-[13px] font-semibold text-(--plan-ink) no-underline"
                >
                  Open seasons
                </Link>
                <Link
                  href="/chat"
                  className="rounded-full border border-border bg-card px-3 py-[5px] text-[13px] font-semibold text-ink no-underline"
                >
                  Ask the house
                </Link>
              </div>
            </div>

            <div className="rounded-[14px] border border-border bg-card">
              <div className="flex justify-between border-b border-border/60 px-[14px] py-3 font-mono text-[10px] text-muted">
                <span>DUE SOON</span>
                <span>{dueSoon.length}</span>
              </div>
              {dueSoon.length === 0 ? (
                <p className="m-0 px-[14px] py-3 text-[13px] text-muted">Nothing due. Enjoy the garden.</p>
              ) : (
                dueSoon.map((reminder, i) => (
                  <Link
                    key={reminder.id}
                    href="/calendar"
                    className="flex items-center gap-[10px] border-b border-border/40 px-[14px] py-[11px] no-underline last:border-b-0 hover:bg-selected-soft"
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-[2px]"
                      style={{ background: DUE_DOT_COLORS[i % DUE_DOT_COLORS.length] }}
                    />
                    <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink">{reminder.title}</span>
                    <span
                      className={`font-mono text-[10px] ${reminder.dueDate < todayKey ? "text-clay" : "text-muted"}`}
                    >
                      {dueLabel(reminder.dueDate, todayKey)}
                    </span>
                  </Link>
                ))
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { href: "/capture", icon: "photo_camera", label: "Capture", color: "#3f6b45" },
                { href: "/receipts", icon: "receipt_long", label: "Receipt", color: "#b0643f" },
                { href: "/scan", icon: "barcode_scanner", label: "Scan", color: "#8a7a4f" },
              ].map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex flex-col items-center gap-[6px] rounded-xl border border-border bg-card px-[6px] py-3 no-underline transition-shadow hover:shadow-card"
                >
                  <span className="material-symbols-rounded" style={{ color: action.color }}>
                    {action.icon}
                  </span>
                  <span className="text-[12px] font-semibold text-ink">{action.label}</span>
                </Link>
              ))}
            </div>

            <div className="grid grid-cols-3 rounded-[14px] border border-border bg-card px-1 py-3 text-center">
              <div>
                <div className="font-mono text-[18px] text-ink">{totalItems}</div>
                <div className="text-[11px] text-muted">things</div>
              </div>
              <div className="border-l border-border/60">
                <div className="font-mono text-[18px] text-ink">
                  {topValue ? formatCompactMoney(topValue.total, topValue.currency) : "—"}
                </div>
                <div className="text-[11px] text-muted">worth</div>
              </div>
              <div className="border-l border-border/60">
                <div className="font-mono text-[18px] text-warn">
                  {expiringWarranties.length}
                </div>
                <div className="text-[11px] text-muted">warranties</div>
              </div>
            </div>
          </>
        }
      />

      {/* AI suggestion / alerts */}
      {(expiringWarranties.length > 0 || recentMaintenance.length > 0) && (
        <div className="flex flex-col gap-2 lg:hidden">
          {expiringWarranties.slice(0, 2).map((item) => (
            <Link
              key={item.id}
              href={`/items/${item.id}`}
              className="flex items-start gap-3 rounded-[14px] border border-border bg-card p-[14px] no-underline shadow-card"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-danger-soft">
                <span className="material-symbols-rounded text-[18px] text-clay">shield</span>
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
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-selected">
                <span className="material-symbols-rounded text-[18px] text-accent">build</span>
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
        <div className="flex flex-col items-center gap-2 py-4 text-center lg:hidden">
          <p className="text-sm text-muted">Nothing logged on the property yet. Walk out and snap something?</p>
        </div>
      )}

      {/* Search + capture bar */}
      <div className="relative flex items-center gap-[10px] rounded-[14px] border border-border bg-card py-[6px] pl-4 pr-[6px] shadow-card lg:hidden">
        <Link
          href="/chat"
          className="flex-1 text-[15px] text-muted no-underline after:absolute after:inset-0 after:content-['']"
        >
          Find anything on your property…
        </Link>
        <Link
          href="/capture"
          aria-label="Capture a new thing"
          className="relative z-10 flex h-[42px] w-[42px] items-center justify-center rounded-[10px] bg-accent no-underline"
        >
          <span className="material-symbols-rounded text-on-accent">photo_camera</span>
        </Link>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2 lg:hidden">
        <Link
          href="/capture"
          className="flex items-center gap-1.5 rounded-full bg-selected px-3 py-[7px] text-[13px] font-semibold text-moss-ink no-underline"
        >
          <span className="material-symbols-rounded text-[16px]">photo_camera</span>
          Capture
        </Link>
        <Link
          href="/receipts"
          className="flex items-center gap-1.5 rounded-full bg-danger-soft px-3 py-[7px] text-[13px] font-semibold text-danger no-underline"
        >
          <span className="material-symbols-rounded text-[16px]">receipt_long</span>
          Receipt
        </Link>
        <Link
          href="/scan"
          className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-[6px] text-[13px] font-semibold text-ink no-underline"
        >
          <span className="material-symbols-rounded text-[16px]">qr_code_scanner</span>
          Scan
        </Link>
      </div>
    </div>
  );
}
