import { listLocationsCached } from "../../../lib/cached-queries";
import { Input, Select, SubmitButton } from "@homebox-ai/ui";
import { itemQueries } from "@homebox-ai/db";

import { getSessionUser } from "@homebox-ai/supabase/server";

import { createLocationAction } from "./actions";
import { CrudShell } from "../crud-shell";
import { LocationList } from "./location-list";
import { PlaceHeader } from "./place-header";
import { PlaceTree } from "./place-tree";
import { layoutPlan } from "../../../lib/plan-layout";
import { ZONE_DOTS } from "../items/item-summary";
import { PlanPreview } from "../plan-preview";
import Link from "next/link";

export default async function LocationsPage({ searchParams }: { searchParams: Promise<{ selected?: string }> }) {
  const [{ selected }, user] = await Promise.all([searchParams, getSessionUser()]);
  const [locations, itemCounts, items] = user
    ? await Promise.all([
        listLocationsCached(user.id),
        itemQueries.countItemsByLocation(user.id),
        itemQueries.searchItems(user.id),
      ])
    : [[], [], []];

  const byId = new Map(locations.map((location) => [location.id, location]));

  function pathFor(locationId: string, seen = new Set<string>()): string {
    const location = byId.get(locationId);
    if (!location || seen.has(locationId)) return location?.name ?? "";
    seen.add(locationId);
    return location.parentId ? `${pathFor(location.parentId, seen)} / ${location.name}` : location.name;
  }

  const pathById = new Map(locations.map((location) => [location.id, pathFor(location.id)]));

  const countByLocation = new Map(itemCounts.map((c) => [c.locationId, c.count]));
  function locationTotal(locId: string): number {
    const direct = countByLocation.get(locId) ?? 0;
    const childSum = locations
      .filter((l) => l.parentId === locId)
      .reduce((sum, child) => sum + locationTotal(child.id), 0);
    return direct + childSum;
  }

  const topLocations = locations.filter((l) => !l.parentId);
  const totalSpots = locations.length;

  const countsById = Object.fromEntries(locations.map((l) => [l.id, locationTotal(l.id)]));

  const topIndex = new Map(topLocations.map((l, i) => [l.id, i]));
  function zoneColor(locationId: string): string {
    let current = byId.get(locationId);
    for (let guard = 0; current?.parentId && byId.has(current.parentId) && guard < 20; guard++)
      current = byId.get(current.parentId);
    const index = current ? topIndex.get(current.id) : undefined;
    return index === undefined ? "#9aa49c" : ZONE_DOTS[index % ZONE_DOTS.length]!;
  }

  const treePlaces = locations.map((l) => ({
    id: l.id,
    name: l.name,
    parentId: l.parentId,
    count: countsById[l.id] ?? 0,
    color: zoneColor(l.id),
    path: pathFor(l.id).replaceAll(" / ", " › "),
  }));

  const selectedPlace = byId.get(selected ?? "") ?? topLocations[0];
  const placed = layoutPlan(locations);
  const children = selectedPlace ? locations.filter((l) => l.parentId === selectedPlace.id) : [];
  const directThings = selectedPlace ? items.filter((i) => i.locationId === selectedPlace.id) : [];

  return (
    <>
      <div data-full-bleed className="hidden h-full lg:flex">
        <div className="flex w-[440px] flex-none flex-col gap-3 border-r border-border px-5 py-6">
          <div>
            <h1 className="m-0 font-serif text-[30px] font-normal leading-none text-ink">Places</h1>
            <div className="mt-1 font-mono text-[10px] text-muted">
              {topLocations.length} {topLocations.length === 1 ? "ZONE" : "ZONES"} · {totalSpots}{" "}
              {totalSpots === 1 ? "SPOT" : "SPOTS"}
            </div>
          </div>
          <PlaceTree places={treePlaces} selectedId={selectedPlace?.id ?? null} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto px-7 py-6">
          {selectedPlace ? (
            <>
              <PlaceHeader
                id={selectedPlace.id}
                name={selectedPlace.name}
                parentId={selectedPlace.parentId}
                breadcrumb={pathFor(selectedPlace.id).replaceAll(" / ", " › ").toUpperCase()}
                childCount={children.length}
                thingCount={directThings.length}
              />
              <PlanPreview places={placed} things={items} focusId={selectedPlace.id} className="h-[clamp(300px,42vh,520px)] shrink-0" />
              {children.length > 0 ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-[10px]">
                  {children.map((child) => {
                    const inside = items.filter((i) => i.locationId === child.id).map((i) => i.name);
                    return (
                      <Link
                        key={child.id}
                        href={`/locations?selected=${child.id}`}
                        scroll={false}
                        className="flex flex-col gap-1 rounded-[14px] border border-border bg-card px-[14px] py-3 no-underline hover:border-accent"
                      >
                        <span className="flex justify-between gap-2">
                          <span className="truncate text-[14px] font-semibold text-ink">{child.name}</span>
                          <span className="font-mono text-[11px] text-muted">{countsById[child.id] ?? 0}</span>
                        </span>
                        <span className="truncate text-[12px] text-muted">
                          {inside.length ? inside.slice(0, 3).join(", ") : "Nothing here yet"}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ) : null}
              <div className="rounded-[14px] border border-border bg-card">
                <div className="flex justify-between border-b border-border/60 px-[14px] py-3 font-mono text-[10px] text-muted">
                  <span>THINGS IN {selectedPlace.name.toUpperCase()}</span>
                  <span>{directThings.length}</span>
                </div>
                {directThings.length === 0 ? (
                  <p className="m-0 px-[14px] py-3 text-[13px] text-muted">Nothing logged directly here.</p>
                ) : (
                  directThings.map((thing) => (
                    <Link
                      key={thing.id}
                      href={`/items?selected=${thing.id}`}
                      className="flex items-center gap-[10px] border-b border-border/40 px-[14px] py-[10px] no-underline last:border-b-0 hover:bg-selected-soft"
                    >
                      <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink">{thing.name}</span>
                      <span aria-hidden className="material-symbols-rounded text-[18px] text-muted">
                        chevron_right
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <div className="font-serif text-[24px] text-ink">No places yet</div>
              <p className="m-0 max-w-sm text-[13px] text-muted">
                Add your house, garden or garage on the left, or draw them on the plan.
              </p>
            </div>
          )}
        </div>
      </div>

      <div data-scroll-container className="flex h-full flex-col overflow-y-auto lg:hidden">
        <div className="flex flex-col gap-3 p-4 pb-0">
          <div className="flex items-end justify-between px-1">
            <div>
              <div className="font-serif text-[30px] leading-none text-ink">Places</div>
              <div className="mt-1 font-mono text-[11px] tracking-wide text-muted">
                {topLocations.length} ZONES · {totalSpots} SPOTS
              </div>
            </div>
          </div>
        </div>

        <CrudShell
          toggleLabel="Add place"
          formAction={createLocationAction}
          formClassName="flex flex-col gap-2"
          formFields={
            <>
              <div className="font-mono text-[10px] text-muted">NEW PLACE</div>
              <div className="grid grid-cols-[1fr_1fr_44px] gap-[6px]">
                <Input name="name" placeholder="e.g. Greenhouse" required />
                <Select name="parentId" defaultValue="">
                  <option value="">No parent (top-level)</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {pathFor(location.id)}
                    </option>
                  ))}
                </Select>
                <SubmitButton className="!rounded-[10px] !px-0">
                  <span className="material-symbols-rounded text-[18px]">add</span>
                </SubmitButton>
              </div>
            </>
          }
        >
          <LocationList locations={locations} pathById={pathById} countsById={countsById} />
        </CrudShell>
      </div>
    </>
  );
}
