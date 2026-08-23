import { itemQueries, maintenanceQueries, sharingQueries } from "@homebox-ai/db";
import { FadeIn, StaggerItem, StaggerList } from "@homebox-ai/ui";
import Link from "next/link";

import { getSessionUser } from "@homebox-ai/supabase/server";

import { formatCurrency } from "../../lib/currency";
import { listLabelsCached, listLocationsCached } from "../../lib/cached-queries";

function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

const QUICK_ACTIONS = [
  { href: "/capture", label: "Capture an item" },
  { href: "/receipts", label: "Import a receipt" },
  { href: "/scan", label: "Scan a barcode" },
  { href: "/chat", label: "Ask the assistant" },
];

export default async function DashboardPage() {
  const user = await getSessionUser();

  const [itemCount, locations, labels, valueByCurrency, expiringWarranties, recentItems, recentMaintenance] = user
    ? await Promise.all([
        itemQueries.countItems(user.id),
        listLocationsCached(user.id),
        listLabelsCached(user.id),
        itemQueries.getInventoryValueByCurrency(user.id),
        itemQueries.listUpcomingWarrantyExpirations(user.id),
        itemQueries.listRecentItems(user.id, 5),
        maintenanceQueries.listRecentMaintenance(user.id, 5),
      ])
    : [0, [], [], [], [], [], []];

  // Resolve display names for all actors that appear in the activity feed.
  const actorIds = [...new Set([
    ...recentItems.flatMap((i) => (i.createdBy ? [i.createdBy] : [])),
    ...recentMaintenance.flatMap((e) => (e.createdBy ? [e.createdBy] : [])),
  ])];
  const profileById = actorIds.length > 0 ? await sharingQueries.getUserProfiles(actorIds) : new Map<string, sharingQueries.UserProfile>();

  // Merge items and maintenance into one chronological feed, newest first.
  type ActivityEntry = {
    type: "item" | "maintenance";
    id: string;
    label: string;
    subtext?: string;
    actor: string | null;
    actorAvatar: string | null;
    href: string;
    at: Date;
  };

  const activity: ActivityEntry[] = [
    ...recentItems.map((item) => {
      const profile = item.createdBy ? profileById.get(item.createdBy) : null;
      return {
        type: "item" as const,
        id: item.id,
        label: item.name,
        actor: profile?.name ?? null,
        actorAvatar: profile?.avatarUrl ?? null,
        href: `/items/${item.id}`,
        at: new Date(item.createdAt),
      };
    }),
    ...recentMaintenance.map((entry) => {
      const profile = entry.createdBy ? profileById.get(entry.createdBy) : null;
      return {
        type: "maintenance" as const,
        id: entry.id,
        label: entry.name,
        subtext: entry.itemName,
        actor: profile?.name ?? null,
        actorAvatar: profile?.avatarUrl ?? null,
        href: `/items/${entry.itemId}`,
        at: new Date(entry.createdAt),
      };
    }),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 8);

  const displayName = typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name : undefined;

  const stats = [
    { label: "Items", value: itemCount, href: "/items" },
    { label: "Locations", value: locations.length, href: "/locations" },
    { label: "Labels", value: labels.length, href: "/labels" },
  ];

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4 sm:p-6 md:mx-auto md:w-full md:max-w-2xl">
      <FadeIn className="flex flex-col gap-1">
        <h1 className="text-lg font-bold text-ink">{displayName ? `Welcome back, ${displayName}` : "Welcome back"}</h1>
        <p className="text-sm text-muted">Here&apos;s what&apos;s in your inventory.</p>
      </FadeIn>

      <StaggerList className="m-0 grid grid-cols-3 list-none gap-3 p-0">
        {stats.map((stat) => (
          <StaggerItem key={stat.label} hover>
            <Link
              href={stat.href}
              className="flex flex-col items-center gap-1 rounded-md border border-border bg-surface-soft px-3 py-4 transition-colors duration-150 hover:border-accent"
            >
              <span className="text-2xl font-bold text-ink">{stat.value}</span>
              <span className="text-xs font-semibold text-muted">{stat.label}</span>
            </Link>
          </StaggerItem>
        ))}
      </StaggerList>

      {valueByCurrency.length > 0 && (
        <section className="flex flex-col gap-2 rounded-md border border-border bg-surface-soft p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Total value</h2>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {valueByCurrency.map((entry) => (
              <span key={entry.currency} className="text-lg font-bold text-ink">
                {formatCurrency(entry.total, entry.currency)}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2 rounded-md border border-border bg-surface-soft p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Warranties expiring soon</h2>
        {expiringWarranties.length === 0 ? (
          <p className="text-sm text-body">Nothing expiring in the next 60 days.</p>
        ) : (
          <StaggerList className="m-0 flex list-none flex-col gap-2 p-0">
            {expiringWarranties.map((item) => (
              <StaggerItem key={item.id} hover>
                <Link
                  href={`/items/${item.id}`}
                  className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm"
                >
                  <span className="font-medium text-ink">{item.name}</span>
                  <span className="text-muted">{item.warrantyExpires}</span>
                </Link>
              </StaggerItem>
            ))}
          </StaggerList>
        )}
      </section>

      {itemCount === 0 && (
        <p className="text-center text-sm text-muted">
          Nothing in your inventory yet — capture a photo or import a receipt to get started.
        </p>
      )}

      {activity.length > 0 && (
        <section className="flex flex-col gap-2 rounded-md border border-border bg-surface-soft p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Recent activity</h2>
          <StaggerList className="m-0 flex list-none flex-col gap-1.5 p-0">
            {activity.map((entry) => (
              <StaggerItem key={`${entry.type}-${entry.id}`} hover>
                <Link
                  href={entry.href}
                  className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2 text-sm"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    {/* Actor avatar or type icon */}
                    {entry.actorAvatar ? (
                      // eslint-disable-next-line @next/next/no-img-element -- signed Storage URL
                      <img src={entry.actorAvatar} alt={entry.actor ?? ""} className="h-7 w-7 shrink-0 rounded-lg border border-border object-cover" />
                    ) : (
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-muted">
                        {entry.type === "item" ? (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                            <path d="M3 8l9-5 9 5-9 5-9-5Z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                            <circle cx="6" cy="18" r="2.75" /><circle cx="18" cy="6" r="2.75" /><path d="m8 16 8-8" />
                          </svg>
                        )}
                      </span>
                    )}
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-medium text-ink">
                        {entry.type === "item" ? `Added ${entry.label}` : entry.label}
                      </span>
                      <span className="truncate text-xs text-muted">
                        {entry.actor && `${entry.actor} · `}
                        {entry.type === "maintenance" && entry.subtext ? `${entry.subtext} · ` : ""}
                        {formatRelativeTime(entry.at)}
                      </span>
                    </div>
                  </div>
                </Link>
              </StaggerItem>
            ))}
          </StaggerList>
        </section>
      )}

      <section className="flex flex-col gap-2 rounded-md border border-border bg-surface-soft p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Quick actions</h2>
        <StaggerList className="m-0 flex list-none flex-wrap gap-2 p-0">
          {QUICK_ACTIONS.map((action) => (
            <StaggerItem key={action.href} hover>
              <Link
                href={action.href}
                className="block rounded-md bg-accent px-3.5 py-2 text-sm font-bold text-white transition-colors duration-150 hover:bg-accent-hover"
              >
                {action.label}
              </Link>
            </StaggerItem>
          ))}
        </StaggerList>
      </section>
    </div>
  );
}
