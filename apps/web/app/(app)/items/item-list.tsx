"use client";

import { EmptyState, StaggerItem, StaggerList } from "@homebox-ai/ui";
import Link from "next/link";

interface ItemListProps {
  items: { id: string; name: string; locationId: string | null; assetId: number | null; archived: boolean }[];
  locationNameById: Map<string, string>;
}

export function ItemList({ items, locationNameById }: ItemListProps) {
  if (items.length === 0) {
    return <EmptyState>No items match — try a different search.</EmptyState>;
  }

  return (
    <StaggerList className="flex list-none flex-col gap-2 p-0 m-0">
      {items.map((item) => (
        <StaggerItem key={item.id}>
          <Link
            href={`/items/${item.id}`}
            className="flex items-center justify-between gap-3 rounded-md border border-border px-4 py-3 transition-colors duration-150 hover:border-accent"
          >
            <span className="flex items-center gap-2 font-medium text-ink">
              {item.name}
              {item.archived && (
                <span className="rounded-full bg-muted/20 px-2 py-0.5 text-[10px] font-semibold text-muted">
                  Archived
                </span>
              )}
            </span>
            <span className="flex shrink-0 items-center gap-2 text-sm text-muted">
              {item.assetId != null && <span>#{String(item.assetId).padStart(4, "0")}</span>}
              {item.locationId && <span>{locationNameById.get(item.locationId) ?? ""}</span>}
            </span>
          </Link>
        </StaggerItem>
      ))}
    </StaggerList>
  );
}
