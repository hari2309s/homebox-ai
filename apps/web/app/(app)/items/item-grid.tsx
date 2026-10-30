"use client";

import { EmptyState, WalkingDots } from "@homebox-ai/ui";
import Link from "next/link";
import type { MouseEvent } from "react";

interface Item {
  id: string;
  name: string;
  locationId: string | null;
  archived: boolean;
  photoUrl: string | null;
  isLoadingPhoto?: boolean;
}

interface ItemGridProps {
  items: Item[];
  locationNameById: Map<string, string>;
  selectedId: string | null;
  onSelect: (itemId: string, event: MouseEvent<HTMLAnchorElement>) => void;
}

function ItemCard({
  item,
  locationNameById,
  selected,
  onSelect,
}: {
  item: Item;
  locationNameById: Map<string, string>;
  selected: boolean;
  onSelect: ItemGridProps["onSelect"];
}) {
  const locationName = item.locationId ? locationNameById.get(item.locationId) : null;

  return (
    <Link
      href={`/items/${item.id}`}
      onClick={(event) => onSelect(item.id, event)}
      aria-current={selected ? "true" : undefined}
      data-item-id={item.id}
      className={`flex flex-col gap-2 rounded-[14px] border border-border bg-card p-[6px] no-underline shadow-card transition-transform hover:-translate-y-0.5 ${
        selected ? "lg:shadow-[0_0_0_2px_var(--color-accent)]" : ""
      }`}
    >
      <div className="relative overflow-hidden rounded-[10px] bg-surface-soft">
        {item.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed Storage URL
          <img src={item.photoUrl} alt={item.name} className="aspect-[4/3] w-full object-cover" />
        ) : item.isLoadingPhoto ? (
          <div className="flex aspect-[4/3] w-full items-center justify-center text-muted">
            <WalkingDots size={6} />
          </div>
        ) : (
          <div className="flex aspect-[4/3] w-full items-center justify-center">
            <span className="material-symbols-rounded text-3xl text-muted/40">image</span>
          </div>
        )}
        {item.archived && (
          <span className="absolute left-1.5 top-1.5 rounded-full bg-muted/70 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            Archived
          </span>
        )}
      </div>
      <div className="flex flex-col gap-0.5 px-[6px] pb-[6px]">
        <span className="truncate text-sm font-semibold text-ink">{item.name}</span>
        {locationName && (
          <span className="truncate font-mono text-[10px] text-muted">{locationName.toUpperCase()}</span>
        )}
      </div>
    </Link>
  );
}

export function ItemGrid({ items, locationNameById, selectedId, onSelect }: ItemGridProps) {
  if (items.length === 0) {
    return <EmptyState>No items match — try a different search.</EmptyState>;
  }

  return (
    <div className="grid grid-cols-2 gap-[10px] pb-4">
      {items.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          locationNameById={locationNameById}
          selected={item.id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
