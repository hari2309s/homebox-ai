import { itemQueries, labelQueries, locationQueries } from "@homebox-ai/db";
import { Button, Input, Select, SubmitButton } from "@homebox-ai/ui";

import { getSessionUser } from "@homebox-ai/supabase/server";

import { createItemAction } from "./actions";
import { CrudShell } from "../crud-shell";
import { ItemList } from "./item-list";

interface ItemsPageProps {
  searchParams: Promise<{ q?: string; locationId?: string }>;
}

export default async function ItemsPage({ searchParams }: ItemsPageProps) {
  const { q, locationId: filterLocationId } = await searchParams;
  const user = await getSessionUser();
  const [items, locations, labels] = user
    ? await Promise.all([
        itemQueries.searchItems(user.id, { query: q, locationId: filterLocationId }),
        locationQueries.listLocations(user.id),
        labelQueries.listLabels(user.id),
      ])
    : [[], [], []];

  const locationNameById = new Map(locations.map((location) => [location.id, location.name]));

  return (
    <CrudShell
      form={
        <form
          action={createItemAction}
          className="flex flex-col gap-3"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input name="name" placeholder="New item name" required className="sm:flex-1" />
            <Select name="locationId" defaultValue="">
              <option value="">No location</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </Select>
            <SubmitButton>Add</SubmitButton>
          </div>
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
        </form>
      }
    >
      <form method="GET" className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input name="q" defaultValue={q ?? ""} placeholder="Search items…" className="sm:flex-1" />
        <Select name="locationId" defaultValue={filterLocationId ?? ""}>
          <option value="">All locations</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </Select>
        <Button type="submit">Search</Button>
      </form>
      <ItemList items={items} locationNameById={locationNameById} />
    </CrudShell>
  );
}
