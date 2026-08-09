"use client";

import { StaggerItem, StaggerList } from "@homebox-ai/ui";

interface ItemListProps {
  items: { id: string; name: string; locationId: string | null }[];
  locationNameById: Map<string, string>;
}

export function ItemList({ items, locationNameById }: ItemListProps) {
  return (
    <StaggerList>
      {items.map((item) => (
        <StaggerItem key={item.id}>
          {item.name}
          {item.locationId ? ` — ${locationNameById.get(item.locationId) ?? ""}` : ""}
        </StaggerItem>
      ))}
    </StaggerList>
  );
}
