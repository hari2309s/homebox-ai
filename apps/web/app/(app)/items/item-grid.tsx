"use client";

import { EmptyState, Spinner, StaggerItem, StaggerList } from "@homebox-ai/ui";
import Link from "next/link";

interface ItemGridProps {
  items: {
    id: string;
    name: string;
    locationId: string | null;
    archived: boolean;
    photoUrl: string | null;
    /** True while the signed URL is being fetched — shows a spinner instead of the placeholder icon. */
    isLoadingPhoto?: boolean;
  }[];
  locationNameById: Map<string, string>;
}

function PlaceholderIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-8 w-8 text-muted/50"
      aria-hidden="true"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

export function ItemGrid({ items, locationNameById }: ItemGridProps) {
  if (items.length === 0) {
    return <EmptyState>No items match — try a different search.</EmptyState>;
  }

  return (
    <StaggerList className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {items.map((item) => (
        <StaggerItem key={item.id} hover>
          <Link href={`/items/${item.id}`} className="flex flex-col gap-1.5">
            <div className="relative overflow-hidden rounded-md border border-border bg-surface-soft">
              {item.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- signed Storage URL, not a static asset
                <img
                  src={item.photoUrl}
                  alt={item.name}
                  className="aspect-square w-full object-cover"
                />
              ) : item.isLoadingPhoto ? (
                <div className="flex aspect-square w-full items-center justify-center text-muted">
                  <Spinner size={20} />
                </div>
              ) : (
                <div className="flex aspect-square w-full items-center justify-center">
                  <PlaceholderIcon />
                </div>
              )}
              {item.archived && (
                <span className="absolute left-1.5 top-1.5 rounded-full bg-muted/70 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                  Archived
                </span>
              )}
            </div>
            <div className="flex flex-col gap-0.5 px-0.5">
              <span className="truncate text-sm font-medium text-ink">{item.name}</span>
              {item.locationId && (
                <span className="truncate text-xs text-muted">{locationNameById.get(item.locationId) ?? ""}</span>
              )}
            </div>
          </Link>
        </StaggerItem>
      ))}
    </StaggerList>
  );
}
