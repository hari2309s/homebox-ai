import { itemQueries } from "@homebox-ai/db";
import { Input, Select, SubmitButton } from "@homebox-ai/ui";

import { getSessionUser } from "@homebox-ai/supabase/server";

import { listLabelsCached, listLocationsCached } from "../../../lib/cached-queries";
import { createItemAction } from "./actions";
import { ItemViewClient } from "./item-view-client";

interface ItemsPageProps {
  searchParams: Promise<{ q?: string; locationId?: string; location?: string; archived?: string }>;
}

export default async function ItemsPage({ searchParams }: ItemsPageProps) {
  const { q, locationId: filterLocationId, location: locationFromDashboard, archived } = await searchParams;
  const effectiveLocationId = filterLocationId ?? locationFromDashboard;
  const includeArchived = archived === "1";
  const user = await getSessionUser();

  const [items, locations, _labels, itemCounts] = user
    ? await Promise.all([
        itemQueries.searchItemsWithPrimaryPhoto(user.id, { query: q, locationId: effectiveLocationId, includeArchived }),
        listLocationsCached(user.id),
        listLabelsCached(user.id),
        itemQueries.countItemsByLocation(user.id),
      ])
    : [[], [], [], []];

  const locationNameById = new Map(locations.map((l) => [l.id, l.name]));
  const totalItems = itemCounts.reduce((sum, c) => sum + c.count, 0);
  const topLocations = locations.filter((l) => !l.parentId);

  const countByLocation = new Map(itemCounts.map((c) => [c.locationId, c.count]));
  function locationTotal(locId: string): number {
    const direct = countByLocation.get(locId) ?? 0;
    const childSum = locations
      .filter((l) => l.parentId === locId)
      .reduce((sum, child) => sum + locationTotal(child.id), 0);
    return direct + childSum;
  }

  return (
    <div data-scroll-container className="flex h-full flex-col overflow-y-auto">
      <div className="flex flex-col gap-[14px] p-4 pb-2">
        {/* Header */}
        <div className="flex items-end justify-between px-1">
          <div>
            <div className="font-serif text-[32px] leading-none text-ink">Things</div>
            <div className="mt-1 font-mono text-[11px] tracking-wide text-muted">
              {totalItems} ACROSS {topLocations.length} ZONES
            </div>
          </div>
        </div>

        {/* Search */}
        <form method="GET" className="flex gap-2">
          <Input name="q" defaultValue={q ?? ""} placeholder="Search items…" className="flex-1" />
          <input type="hidden" name="locationId" value={effectiveLocationId ?? ""} />
          <button
            type="submit"
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-border bg-card text-ink"
          >
            <span className="material-symbols-rounded text-[20px]">search</span>
          </button>
        </form>
      </div>

      <ItemViewClient
        items={items}
        locations={locations}
        locationNameById={locationNameById}
        activeLocationId={effectiveLocationId ?? null}
        topLocations={topLocations}
        locationTotal={Object.fromEntries(topLocations.map((l) => [l.id, locationTotal(l.id)]))}
      />

      {/* Inline add form */}
      <div className="sticky bottom-0 border-t border-border/70 bg-surface/80 p-4 backdrop-blur-lg">
        <form action={createItemAction} className="flex gap-2">
          <Input name="name" placeholder="Quick add…" required className="flex-1" />
          <Select name="locationId" defaultValue={effectiveLocationId ?? ""} className="max-w-[140px]">
            <option value="">No location</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>{location.name}</option>
            ))}
          </Select>
          <SubmitButton className="!px-4">
            <span className="material-symbols-rounded text-[18px]">add</span>
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
