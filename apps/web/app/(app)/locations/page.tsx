import { listLocationsCached } from "../../../lib/cached-queries";
import { Input, Select, SubmitButton } from "@homebox-ai/ui";
import { itemQueries } from "@homebox-ai/db";

import { getSessionUser } from "@homebox-ai/supabase/server";

import { createLocationAction } from "./actions";
import { CrudShell } from "../crud-shell";
import { LocationList } from "./location-list";

export default async function LocationsPage() {
  const user = await getSessionUser();
  const [locations, itemCounts] = user
    ? await Promise.all([listLocationsCached(user.id), itemQueries.countItemsByLocation(user.id)])
    : [[], []];

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

  return (
    <div data-scroll-container className="flex h-full flex-col overflow-y-auto">
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
  );
}
