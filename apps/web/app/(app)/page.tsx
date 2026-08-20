import { itemQueries, labelQueries, locationQueries } from "@homebox-ai/db";
import { FadeIn, StaggerItem, StaggerList } from "@homebox-ai/ui";
import Link from "next/link";

import { getSessionUser } from "@homebox-ai/supabase/server";

import { formatCurrency } from "../../lib/currency";

const QUICK_ACTIONS = [
  { href: "/capture", label: "Capture an item" },
  { href: "/receipts", label: "Import a receipt" },
  { href: "/scan", label: "Scan a barcode" },
  { href: "/chat", label: "Ask the assistant" },
];

export default async function DashboardPage() {
  const user = await getSessionUser();

  const [items, locations, labels, valueByCurrency, expiringWarranties] = user
    ? await Promise.all([
        itemQueries.searchItems(user.id),
        locationQueries.listLocations(user.id),
        labelQueries.listLabels(user.id),
        itemQueries.getInventoryValueByCurrency(user.id),
        itemQueries.listUpcomingWarrantyExpirations(user.id),
      ])
    : [[], [], [], [], []];

  const displayName = typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name : undefined;

  const stats = [
    { label: "Items", value: items.length, href: "/items" },
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
                  className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm transition-colors duration-150 hover:border-accent"
                >
                  <span className="font-medium text-ink">{item.name}</span>
                  <span className="text-muted">{item.warrantyExpires}</span>
                </Link>
              </StaggerItem>
            ))}
          </StaggerList>
        )}
      </section>

      {items.length === 0 && (
        <p className="text-center text-sm text-muted">
          Nothing in your inventory yet — capture a photo or import a receipt to get started.
        </p>
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
