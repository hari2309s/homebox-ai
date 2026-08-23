"use client";

import { useEffect, useRef, useState } from "react";

import { createSupabaseBrowserClient } from "@homebox-ai/supabase/client";

import { ItemGrid } from "./item-grid";
import { ItemList } from "./item-list";

type View = "list" | "grid";
const STORAGE_KEY = "items-view";

interface Item {
  id: string;
  name: string;
  locationId: string | null;
  assetId: number | null;
  archived: boolean;
  currency: string;
  purchasePrice: string | null;
  primaryPhotoPath: string | null;
}

interface ItemViewClientProps {
  items: Item[];
  locationNameById: Map<string, string>;
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

export function ItemViewClient({ items, locationNameById }: ItemViewClientProps) {
  const [view, setView] = useState<View>("list");
  const [photoUrls, setPhotoUrls] = useState<Map<string, string>>(new Map());
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  // Track which set of items we last fetched URLs for to avoid redundant fetches.
  const fetchedForRef = useRef<Item[]>([]);

  // Restore preference from localStorage after hydration.
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "grid" || saved === "list") setView(saved);
  }, []);

  // Fetch signed URLs from the Supabase browser client whenever we enter grid
  // view or items change. Runs entirely client-side — no server round-trip.
  useEffect(() => {
    if (view !== "grid") return;
    if (fetchedForRef.current === items) return; // Same reference, already fetched.

    const paths = items.flatMap((item) => (item.primaryPhotoPath ? [item.primaryPhotoPath] : []));
    fetchedForRef.current = items;

    if (!paths.length) return;

    let cancelled = false;
    setLoadingPhotos(true);

    const supabase = createSupabaseBrowserClient();
    supabase.storage
      .from("attachments")
      .createSignedUrls(paths, 3600)
      .then(({ data }) => {
        if (cancelled || !data) return;
        const map = new Map<string, string>();
        for (const entry of data) {
          if (entry.signedUrl && entry.path) map.set(entry.path, entry.signedUrl);
        }
        setPhotoUrls(map);
      })
      .catch(() => {
        // Photos fail gracefully — grid shows the placeholder icon instead.
      })
      .finally(() => {
        if (!cancelled) setLoadingPhotos(false);
      });

    return () => {
      cancelled = true;
    };
  }, [view, items]);

  function switchView(next: View) {
    setView(next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  const activeClass = "border-accent bg-accent/10 text-accent";
  const inactiveClass = "border-border bg-card text-muted hover:border-accent hover:text-accent";

  const gridItems = items.map((item) => ({
    id: item.id,
    name: item.name,
    locationId: item.locationId,
    archived: item.archived,
    photoUrl: item.primaryPhotoPath ? (photoUrls.get(item.primaryPhotoPath) ?? null) : null,
    isLoadingPhoto: loadingPhotos && !!item.primaryPhotoPath,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex shrink-0 justify-end gap-1">
        <button
          type="button"
          onClick={() => switchView("list")}
          aria-label="List view"
          aria-pressed={view === "list"}
          className={`flex cursor-pointer items-center rounded-md border p-2 transition-colors duration-150 ${view === "list" ? activeClass : inactiveClass}`}
        >
          <ListViewIcon />
        </button>
        <button
          type="button"
          onClick={() => switchView("grid")}
          aria-label="Grid view"
          aria-pressed={view === "grid"}
          className={`flex cursor-pointer items-center rounded-md border p-2 transition-colors duration-150 ${view === "grid" ? activeClass : inactiveClass}`}
        >
          <GridViewIcon />
        </button>
      </div>

      {view === "list" ? (
        <ItemList items={items} locationNameById={locationNameById} />
      ) : (
        <ItemGrid items={gridItems} locationNameById={locationNameById} />
      )}
    </div>
  );
}
