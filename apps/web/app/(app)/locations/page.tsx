import { locationQueries } from "@homebox-ai/db";

import { getSessionUser } from "@homebox-ai/supabase/server";

import { createLocationAction } from "./actions";

export default async function LocationsPage() {
  const user = await getSessionUser();
  const locations = user ? await locationQueries.listLocations(user.id) : [];
  const byId = new Map(locations.map((location) => [location.id, location]));

  function pathFor(locationId: string): string {
    const location = byId.get(locationId);
    if (!location) return "";
    return location.parentId ? `${pathFor(location.parentId)} / ${location.name}` : location.name;
  }

  return (
    <div>
      <h1>Locations</h1>
      <form action={createLocationAction} style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        <input name="name" placeholder="New location name" required />
        <select name="parentId" defaultValue="">
          <option value="">No parent (top-level)</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {pathFor(location.id)}
            </option>
          ))}
        </select>
        <button type="submit">Add</button>
      </form>
      <ul>
        {locations.map((location) => (
          <li key={location.id}>{pathFor(location.id)}</li>
        ))}
      </ul>
    </div>
  );
}
