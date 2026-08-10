import { locationQueries } from "@homebox-ai/db";
import { Input, Select, SubmitButton } from "@homebox-ai/ui";

import { getSessionUser } from "@homebox-ai/supabase/server";

import { createLocationAction } from "./actions";
import { CrudShell } from "../crud-shell";
import { LocationList } from "./location-list";

export default async function LocationsPage() {
  const user = await getSessionUser();
  const locations = user ? await locationQueries.listLocations(user.id) : [];
  const byId = new Map(locations.map((location) => [location.id, location]));

  function pathFor(locationId: string): string {
    const location = byId.get(locationId);
    if (!location) return "";
    return location.parentId ? `${pathFor(location.parentId)} / ${location.name}` : location.name;
  }

  const paths = locations.map((location) => ({ id: location.id, path: pathFor(location.id) }));

  return (
    <CrudShell
      form={
        <form
          action={createLocationAction}
          className="flex flex-col gap-3 sm:flex-row sm:items-center"
        >
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
      <LocationList paths={paths} />
    </CrudShell>
  );
}
