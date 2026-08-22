import { itemQueries, labelQueries, locationQueries } from "@homebox-ai/db";
import { Button, Input, Select, SubmitButton } from "@homebox-ai/ui";
import Link from "next/link";

import { getSessionUser } from "@homebox-ai/supabase/server";
import { createSupabaseServerClient } from "@homebox-ai/supabase/server";
import { getAttachmentSignedUrls } from "@homebox-ai/supabase/storage";

import { createItemAction } from "./actions";
import { CrudShell } from "../crud-shell";
import { ItemGrid } from "./item-grid";
import { ItemList } from "./item-list";

interface ItemsPageProps {
  searchParams: Promise<{ q?: string; locationId?: string; archived?: string; view?: string }>;
}

function ListViewIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function GridViewIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

export default async function ItemsPage({ searchParams }: ItemsPageProps) {
  const { q, locationId: filterLocationId, archived, view } = await searchParams;
  const includeArchived = archived === "1";
  const isGridView = view === "grid";

  const user = await getSessionUser();

  const [locations, labels] = user
    ? await Promise.all([locationQueries.listLocations(user.id), labelQueries.listLabels(user.id)])
    : [[], []];

  const locationNameById = new Map(locations.map((location) => [location.id, location.name]));

  // Build the toggle link URLs, preserving current search params.
  const baseParams = new URLSearchParams();
  if (q) baseParams.set("q", q);
  if (filterLocationId) baseParams.set("locationId", filterLocationId);
  if (includeArchived) baseParams.set("archived", "1");

  const listParams = new URLSearchParams(baseParams);
  const gridParams = new URLSearchParams(baseParams);
  gridParams.set("view", "grid");

  let listItems: { id: string; name: string; locationId: string | null; assetId: number | null; archived: boolean; currency: string; purchasePrice: string | null }[] = [];
  let gridItems: { id: string; name: string; locationId: string | null; archived: boolean; photoUrl: string | null }[] = [];

  if (user) {
    if (isGridView) {
      const itemsWithPhotos = await itemQueries.searchItemsWithPrimaryPhoto(user.id, {
        query: q,
        locationId: filterLocationId,
        includeArchived,
      });
      const photoPaths = itemsWithPhotos.flatMap((item) => (item.primaryPhotoPath ? [item.primaryPhotoPath] : []));
      let photoUrlMap = new Map<string, string>();
      if (photoPaths.length > 0) {
        const supabase = await createSupabaseServerClient();
        photoUrlMap = await getAttachmentSignedUrls(supabase, photoPaths);
      }
      gridItems = itemsWithPhotos.map((item) => ({
        id: item.id,
        name: item.name,
        locationId: item.locationId,
        archived: item.archived,
        photoUrl: item.primaryPhotoPath ? (photoUrlMap.get(item.primaryPhotoPath) ?? null) : null,
      }));
    } else {
      listItems = await itemQueries.searchItems(user.id, { query: q, locationId: filterLocationId, includeArchived });
    }
  }

  return (
    <CrudShell
      form={
        <form action={createItemAction} className="flex flex-col gap-3">
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
                  {label.color && (
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: label.color }} />
                  )}
                  {label.name}
                </label>
              ))}
            </fieldset>
          )}
        </form>
      }
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <form method="GET" className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          {isGridView && <input type="hidden" name="view" value="grid" />}
          <Input name="q" defaultValue={q ?? ""} placeholder="Search items…" className="sm:flex-1" />
          <Select name="locationId" defaultValue={filterLocationId ?? ""}>
            <option value="">All locations</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </Select>
          <label className="flex shrink-0 items-center gap-1.5 text-sm text-body">
            <input type="checkbox" name="archived" value="1" defaultChecked={includeArchived} className="accent-accent" />
            Show archived
          </label>
          <Button type="submit">Search</Button>
        </form>

        <div className="flex shrink-0 gap-1 self-end sm:self-auto">
          <Link
            href={`?${listParams.toString()}`}
            aria-label="List view"
            className={`flex items-center rounded-md border p-2 transition-colors duration-150 ${
              !isGridView
                ? "border-accent bg-accent/10 text-accent"
                : "border-border bg-card text-muted hover:border-accent hover:text-accent"
            }`}
          >
            <ListViewIcon />
          </Link>
          <Link
            href={`?${gridParams.toString()}`}
            aria-label="Grid view"
            className={`flex items-center rounded-md border p-2 transition-colors duration-150 ${
              isGridView
                ? "border-accent bg-accent/10 text-accent"
                : "border-border bg-card text-muted hover:border-accent hover:text-accent"
            }`}
          >
            <GridViewIcon />
          </Link>
        </div>
      </div>

      {isGridView ? (
        <ItemGrid items={gridItems} locationNameById={locationNameById} />
      ) : (
        <ItemList items={listItems} locationNameById={locationNameById} />
      )}
    </CrudShell>
  );
}
