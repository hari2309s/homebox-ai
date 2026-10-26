import { itemQueries } from "@homebox-ai/db";
import { Input, Select, SubmitButton } from "@homebox-ai/ui";
import { Suspense } from "react";

import { getSessionUser } from "@homebox-ai/supabase/server";

import { listLabelsCached, listLocationsCached } from "../../../lib/cached-queries";
import { createItemAction } from "./actions";
import { EmptyPane, ItemPane } from "./item-pane";
import { ItemViewClient } from "./item-view-client";

interface ItemsPageProps {
  searchParams: Promise<{ q?: string; locationId?: string; location?: string; archived?: string; selected?: string }>;
}

export default async function ItemsPage({ searchParams }: ItemsPageProps) {
  const { q, locationId: filterLocationId, location: locationFromDashboard, archived, selected } = await searchParams;
  const effectiveLocationId = filterLocationId ?? locationFromDashboard;
  const includeArchived = archived === "1";
  const user = await getSessionUser();

  const [items, locations, labels, itemCounts] = user
    ? await Promise.all([
        itemQueries.searchItemsWithPrimaryPhoto(user.id, {
          query: q,
          locationId: effectiveLocationId,
          includeArchived,
        }),
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
    <div data-full-bleed className="flex h-full flex-col lg:flex-row">
      <div
        data-scroll-container
        className="flex h-full flex-col overflow-y-auto lg:w-[clamp(440px,34vw,560px)] lg:flex-none lg:border-r lg:border-border"
      >
        <ItemViewClient
          items={items}
          locations={locations}
          locationNameById={locationNameById}
          activeLocationId={effectiveLocationId ?? null}
          topLocations={topLocations}
          locationTotal={Object.fromEntries(topLocations.map((l) => [l.id, locationTotal(l.id)]))}
          selectedId={selected ?? null}
          header={
            <>
              <div className="flex items-end justify-between px-1 lg:px-0">
                <div>
                  <h1 className="m-0 font-serif text-[32px] font-normal leading-none text-ink lg:text-[30px]">
                    Things
                  </h1>
                  <div className="mt-1 font-mono text-[11px] tracking-wide text-muted lg:text-[10px]">
                    {totalItems} ACROSS {topLocations.length} {topLocations.length === 1 ? "ZONE" : "ZONES"}
                  </div>
                </div>
              </div>

              <form method="GET" role="search" className="flex gap-2">
                <label className="flex min-w-0 flex-1 items-center gap-2 rounded-[10px] border border-border bg-card px-3 focus-within:border-accent">
                  <span className="material-symbols-rounded text-[20px] text-muted">search</span>
                  <input
                    name="q"
                    type="search"
                    defaultValue={q ?? ""}
                    placeholder="Filter things"
                    aria-label="Filter things"
                    className="h-[40px] min-w-0 flex-1 border-none bg-transparent text-[14px] text-ink outline-none placeholder:text-muted"
                  />
                  <span className="flex shrink-0 items-center gap-1 text-[12px] font-semibold text-body">
                    <input
                      type="checkbox"
                      name="archived"
                      value="1"
                      defaultChecked={includeArchived}
                      aria-label="Show archived"
                      className="accent-accent"
                    />
                    <span aria-hidden>Show archived</span>
                  </span>
                </label>
                {effectiveLocationId && <input type="hidden" name="locationId" value={effectiveLocationId} />}
                <button
                  type="submit"
                  aria-label="Search"
                  className="flex h-[42px] w-[42px] shrink-0 cursor-pointer items-center justify-center rounded-[10px] border border-border bg-card text-ink"
                >
                  <span className="material-symbols-rounded text-[20px]">arrow_forward</span>
                </button>
              </form>
            </>
          }
        />

        <div className="sticky bottom-0 mt-auto border-t border-border/70 bg-surface/80 p-4 backdrop-blur-lg lg:px-5">
          <form action={createItemAction} className="flex gap-2">
            <Input name="name" placeholder="Quick add…" aria-label="New thing name" required className="flex-1" />
            <Select
              name="locationId"
              defaultValue={effectiveLocationId ?? ""}
              aria-label="Location"
              className="max-w-[140px]"
            >
              <option value="">No location</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </Select>
            <SubmitButton className="!px-4" aria-label="Add thing">
              <span className="material-symbols-rounded text-[18px]">add</span>
            </SubmitButton>
          </form>
        </div>
      </div>

      <div className="hidden min-w-0 flex-1 overflow-y-auto lg:block">
        {user && selected ? (
          <Suspense key={selected} fallback={<div className="p-7 font-mono text-[10px] text-muted">LOADING…</div>}>
            <ItemPane userId={user.id} itemId={selected} locations={locations} labels={labels} />
          </Suspense>
        ) : (
          <EmptyPane locations={locations} />
        )}
      </div>
    </div>
  );
}
