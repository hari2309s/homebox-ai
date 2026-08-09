import { itemQueries, labelQueries, locationQueries } from "@homebox-ai/db";
import { Button, Input, Select } from "@homebox-ai/ui";

import { getSessionUser } from "@homebox-ai/supabase/server";

import { createItemAction } from "./actions";
import { ItemList } from "./item-list";

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
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight text-ink">Items</h1>

      <form
        action={createItemAction}
        className="flex flex-col gap-3 rounded-lg bg-surface-soft p-4 sm:flex-row sm:flex-wrap sm:items-center"
      >
        <Input name="name" placeholder="New item name" required className="sm:flex-1" />
        <Select name="locationId" defaultValue="">
          <option value="">No location</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </Select>
        {labels.length > 0 && (
          <fieldset className="flex flex-wrap gap-3 border-none p-0">
            {labels.map((label) => (
              <label key={label.id} className="flex items-center gap-1.5 text-sm text-body">
                <input type="checkbox" name="labelIds" value={label.id} className="accent-accent" />
                {label.name}
              </label>
            ))}
          </fieldset>
        )}
        <Button type="submit">Add</Button>
      </form>

      <ItemList items={items} locationNameById={locationNameById} />
    </div>
  );
}
