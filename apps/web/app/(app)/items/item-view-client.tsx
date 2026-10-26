"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { createSupabaseBrowserClient } from "@homebox-ai/supabase/client";

import { ItemGrid } from "./item-grid";
import { ItemList, type ZoneGroup } from "./item-list";

type View = "list" | "grid";
const STORAGE_KEY = "items-view";

function isDesktop() {
  return typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;
}

const ZONE_CHIP_COLORS: Record<number, { bg: string; dot: string; text: string }> = {
  0: { bg: "#f3f1ea", dot: "#c5c9bf", text: "#1f2622" },
  1: { bg: "#dfe8d6", dot: "#3f6b45", text: "#2c4d31" },
  2: { bg: "#ecdccd", dot: "#b0643f", text: "#7a3f22" },
  3: { bg: "#e7e1d0", dot: "#8a7a4f", text: "#5a4f33" },
  4: { bg: "#e2e2dc", dot: "#7c867f", text: "#3a423d" },
};

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

interface Location {
  id: string;
  name: string;
  parentId: string | null;
}

interface ItemViewClientProps {
  items: Item[];
  locations: Location[];
  locationNameById: Map<string, string>;
  activeLocationId: string | null;
  topLocations: Location[];
  locationTotal: Record<string, number>;
  selectedId: string | null;
  /** Title and search, pinned together with the zone chips while the list scrolls. */
  header?: ReactNode;
}

export function ItemViewClient({
  items,
  locations,
  locationNameById,
  activeLocationId,
  topLocations,
  locationTotal: _locationTotal,
  selectedId,
  header,
}: ItemViewClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState<View>("list");
  const [photoUrls, setPhotoUrls] = useState<Map<string, string>>(new Map());
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const fetchedForRef = useRef<Item[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "grid" || saved === "list") setView(saved);
  }, []);

  useEffect(() => {
    if (view !== "grid") return;
    if (fetchedForRef.current === items) return;

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
      .catch(() => {})
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

  function filterByLocation(locId: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (locId) {
      params.set("locationId", locId);
    } else {
      params.delete("locationId");
      params.delete("location");
    }
    router.push(`/items?${params.toString()}`);
  }

  const selectItem = useCallback(
    (itemId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("selected", itemId);
      router.replace(`/items?${params.toString()}`, { scroll: false });
      document.querySelector(`[data-item-id="${itemId}"]`)?.scrollIntoView({ block: "nearest" });
    },
    [router, searchParams],
  );

  function handleSelect(itemId: string, event: MouseEvent<HTMLAnchorElement>) {
    if (!isDesktop() || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    selectItem(itemId);
  }

  const gridItems = items.map((item) => ({
    id: item.id,
    name: item.name,
    locationId: item.locationId,
    archived: item.archived,
    photoUrl: item.primaryPhotoPath ? (photoUrls.get(item.primaryPhotoPath) ?? null) : null,
    isLoadingPhoto: loadingPhotos && !!item.primaryPhotoPath,
  }));

  const groupedByZone = view === "list" ? groupItemsByZone(items, locations, topLocations) : [];
  const orderedIds = view === "list" ? groupedByZone.flatMap((g) => g.items.map((i) => i.id)) : items.map((i) => i.id);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!isDesktop() || event.altKey || event.metaKey || event.ctrlKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        if (orderedIds.length === 0) return;
        event.preventDefault();
        const current = selectedId ? orderedIds.indexOf(selectedId) : -1;
        const next =
          event.key === "ArrowDown"
            ? Math.min(orderedIds.length - 1, current + 1)
            : Math.max(0, current === -1 ? 0 : current - 1);
        selectItem(orderedIds[next]!);
      } else if (event.key === "Enter" && selectedId && target?.tagName !== "A" && target?.tagName !== "BUTTON") {
        router.push(`/items/${selectedId}`);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [orderedIds, selectedId, selectItem, router]);

  return (
    <>
      <div className="sticky top-0 z-20 flex flex-col gap-[14px] border-b border-border/60 bg-surface px-4 pb-3 pt-4 lg:gap-3 lg:px-5 lg:pt-6">
        {header}
        {/* Zone chips + view toggle */}
        <div className="flex items-center gap-2">
          <div className="no-scrollbar flex flex-1 gap-[6px] overflow-x-auto">
            <button
              type="button"
              onClick={() => filterByLocation(null)}
              className={`flex-none cursor-pointer rounded-full px-3 py-[7px] text-[13px] font-semibold ${
                !activeLocationId
                  ? "border-none bg-[#1f2622] text-[#fbfaf6]"
                  : "border border-border bg-[#fbfaf6] text-[#1f2622] dark:bg-card"
              }`}
            >
              All
            </button>
            {topLocations.map((loc, i) => {
              const colors = ZONE_CHIP_COLORS[i % 5]!;
              const isActive = activeLocationId === loc.id;
              return (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => filterByLocation(loc.id)}
                  className={`flex flex-none cursor-pointer items-center gap-[6px] rounded-full px-3 py-[7px] text-[13px] font-semibold ${
                    isActive ? "border-none" : "border border-border"
                  }`}
                  style={isActive ? { background: colors.bg, color: colors.text } : undefined}
                >
                  <span className="h-2 w-2 rounded-[2px]" style={{ background: colors.dot }} />
                  {loc.name}
                </button>
              );
            })}
          </div>

          <div className="flex shrink-0 rounded-[10px] bg-surface-soft p-[3px]">
            {(["list", "grid"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => switchView(v)}
                aria-label={v === "list" ? "List view" : "Grid view"}
                aria-pressed={view === v}
                className="relative cursor-pointer rounded-[8px] border-none bg-transparent px-[9px] py-[5px]"
              >
                {view === v && (
                  <motion.span
                    layoutId="items-view-toggle"
                    className="absolute inset-0 rounded-[8px] bg-white shadow-sm dark:bg-card"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span
                  className={`material-symbols-rounded relative text-[20px] ${view === v ? "text-ink" : "text-muted"}`}
                >
                  {v === "list" ? "view_list" : "grid_view"}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-col px-4 pt-[14px] lg:px-5 lg:pt-3">
        {view === "list" ? (
          <ItemList
            groups={groupedByZone}
            locationNameById={locationNameById}
            selectedId={selectedId}
            onSelect={handleSelect}
          />
        ) : (
          <ItemGrid
            items={gridItems}
            locationNameById={locationNameById}
            selectedId={selectedId}
            onSelect={handleSelect}
          />
        )}
      </div>
    </>
  );
}

function groupItemsByZone(items: Item[], locations: Location[], topLocations: Location[]): ZoneGroup[] {
  const topLocationIds = new Set(topLocations.map((l) => l.id));
  const parentMap = new Map(locations.map((l) => [l.id, l.parentId]));

  function findTopZone(locationId: string | null): string | null {
    if (!locationId) return null;
    if (topLocationIds.has(locationId)) return locationId;
    const parent = parentMap.get(locationId);
    return parent ? findTopZone(parent) : locationId;
  }

  const groups = new Map<string | null, Item[]>();
  for (const item of items) {
    const zone = findTopZone(item.locationId);
    const list = groups.get(zone) ?? [];
    list.push(item);
    groups.set(zone, list);
  }

  const locationNameById = new Map(locations.map((l) => [l.id, l.name]));

  const COLORS = ["#c5c9bf", "#3f6b45", "#b0643f", "#8a7a4f", "#7c867f"];
  const colorByZone = new Map(topLocations.map((l, i) => [l.id, COLORS[i % COLORS.length]!]));
  const indexByZone = new Map(topLocations.map((l, i) => [l.id, i]));

  const result: ZoneGroup[] = [];
  for (const loc of topLocations) {
    const list = groups.get(loc.id);
    if (list?.length) {
      result.push({
        zoneId: loc.id,
        zoneName: loc.name,
        zoneIndex: indexByZone.get(loc.id)!,
        color: colorByZone.get(loc.id)!,
        items: list,
      });
    }
  }

  for (const [zoneId, list] of groups) {
    if (zoneId && !topLocationIds.has(zoneId) && list.length) {
      result.push({
        zoneId,
        zoneName: locationNameById.get(zoneId) ?? "Unknown",
        zoneIndex: -1,
        color: "#7c867f",
        items: list,
      });
    }
  }

  const unassigned = groups.get(null);
  if (unassigned?.length) {
    result.push({ zoneId: null, zoneName: "Unassigned", zoneIndex: -1, color: "#7c867f", items: unassigned });
  }

  return result;
}
