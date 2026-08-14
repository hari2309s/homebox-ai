"use client";

import { EmptyState, StaggerItem, StaggerList } from "@homebox-ai/ui";
import Link from "next/link";

interface ItemListProps {
  items: { id: string; name: string; locationId: string | null }[];
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
            className="flex items-center justify-between rounded-md border border-border px-4 py-3 transition-colors duration-150 hover:border-accent"
          >
            <span className="font-medium text-ink">{item.name}</span>
            {item.locationId && (
              <span className="text-sm text-muted">{locationNameById.get(item.locationId) ?? ""}</span>
            )}
          </Link>
        </StaggerItem>
      ))}
    </StaggerList>
  );
}
