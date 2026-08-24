import { listLocationsCached } from "../../../lib/cached-queries";
import { Input, Select, SubmitButton } from "@homebox-ai/ui";

import { getSessionUser } from "@homebox-ai/supabase/server";

import { createLocationAction } from "./actions";
import { CrudShell } from "../crud-shell";
import { LocationList } from "./location-list";

export default async function LocationsPage() {
  const user = await getSessionUser();
  const locations = user ? await listLocationsCached(user.id) : [];
  const byId = new Map(locations.map((location) => [location.id, location]));

  // `seen` guards against a circular parentId chain — shouldn't exist given
  // locationQueries.updateLocation's cycle check, but recursing on bad data
  // (e.g. from before that check existed) would otherwise stack-overflow and
  // crash this page on every load rather than just rendering a truncated path.
  function pathFor(locationId: string, seen = new Set<string>()): string {
    const location = byId.get(locationId);
    if (!location || seen.has(locationId)) return location?.name ?? "";
    seen.add(locationId);
    return location.parentId ? `${pathFor(location.parentId, seen)} / ${location.name}` : location.name;
  }

  const pathById = new Map(locations.map((location) => [location.id, pathFor(location.id)]));

  return (
    <CrudShell
      toggleLabel="Add location"
      form={
        <form action={createLocationAction} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input name="name" placeholder="New location name" required className="sm:flex-1" />
          <Select name="parentId" defaultValue="">
            <option value="">No parent (top-level)</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {pathFor(location.id)}
              </option>
            ))}
          </Select>
          <SubmitButton>Add</SubmitButton>
        </form>
      }
    >
      <LocationList locations={locations} pathById={pathById} />
    </CrudShell>
  );
}
