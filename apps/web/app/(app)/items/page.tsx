import { itemQueries, labelQueries, locationQueries } from "@homebox-ai/db";

import { getSessionUser } from "@homebox-ai/supabase/server";

import { createItemAction } from "./actions";

export default async function ItemsPage() {
  const user = await getSessionUser();
  const [items, locations, labels] = user
    ? await Promise.all([
        itemQueries.searchItems(user.id),
        locationQueries.listLocations(user.id),
        labelQueries.listLabels(user.id),
      ])
    : [[], [], []];

  const locationNameById = new Map(locations.map((location) => [location.id, location.name]));

  return (
    <div>
      <h1>Items</h1>
      <form
        action={createItemAction}
        style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.5rem", alignItems: "center" }}
      >
        <input name="name" placeholder="New item name" required />
        <select name="locationId" defaultValue="">
          <option value="">No location</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
        <fieldset style={{ display: "flex", gap: "0.5rem", border: "none", padding: 0 }}>
          {labels.map((label) => (
            <label key={label.id} style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
              <input type="checkbox" name="labelIds" value={label.id} />
              {label.name}
            </label>
          ))}
        </fieldset>
        <button type="submit">Add</button>
      </form>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            {item.name}
            {item.locationId ? ` — ${locationNameById.get(item.locationId) ?? ""}` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
