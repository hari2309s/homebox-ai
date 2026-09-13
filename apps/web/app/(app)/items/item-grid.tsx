"use client";

import { EmptyState, Spinner } from "@homebox-ai/ui";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { CustomContainerComponentProps, CustomItemComponentProps } from "virtua";
import { Virtualizer } from "virtua";

import { chunkIntoRows, columnsForWidth } from "../../../lib/grid-columns";
import { useScrollContainer } from "../../../lib/use-scroll-container";

interface Item {
  id: string;
  name: string;
  locationId: string | null;
  archived: boolean;
  photoUrl: string | null;
  /** True while the signed URL is being fetched — shows a spinner instead of the placeholder icon. */
  isLoadingPhoto?: boolean;
}

interface ItemGridProps {
  items: Item[];
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

function ItemCard({ item, locationNameById }: { item: Item; locationNameById: Map<string, string> }) {
  return (
    <Link
      href={`/items/${item.id}`}
      role="listitem"
      className="flex flex-col gap-1.5 transition-transform duration-150 hover:-translate-y-px hover:scale-[1.015] active:scale-[0.985]"
    >
      <div className="relative overflow-hidden rounded-md border border-border bg-surface-soft">
        {item.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed Storage URL, not a static asset
          <img src={item.photoUrl} alt={item.name} className="aspect-square w-full object-cover" />
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
  );
}

function GridRow({
  row,
  columns,
  locationNameById,
}: {
  row: Item[];
  columns: number;
  locationNameById: Map<string, string>;
}) {
  return (
    // Structural only (row-per-virtualized-item is a rendering detail, not a
    // real grouping) — presentation removes it from the a11y tree so each
    // card's listitem role attaches directly to the outer list below.
    <div
      role="presentation"
      className="grid gap-3 pb-3"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {row.map((item) => (
        <ItemCard key={item.id} item={item} locationNameById={locationNameById} />
      ))}
    </div>
  );
}

function GridContainer({ children, style, ref }: CustomContainerComponentProps) {
  return (
    <div ref={ref} role="list" style={style}>
      {children}
    </div>
  );
}

function GridRowWrapper({ children, style, ref }: CustomItemComponentProps) {
  return (
    <div ref={ref} style={style}>
      {children}
    </div>
  );
}

/** Tracks the item grid's current column count (2/3/4/5, matching its Tailwind breakpoints). */
function useGridColumns(): number {
  const [columns, setColumns] = useState(() => (typeof window === "undefined" ? 2 : columnsForWidth(window.innerWidth)));

  useEffect(() => {
    function handleResize() {
      setColumns(columnsForWidth(window.innerWidth));
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return columns;
}

export function ItemGrid({ items, locationNameById }: ItemGridProps) {
  const columns = useGridColumns();
  const { anchorRef, scrollContainerRef, ready } = useScrollContainer<HTMLDivElement>();

  if (items.length === 0) {
    return <EmptyState>No items match — try a different search.</EmptyState>;
  }

  // Renders every card until the page's scroll container is found client-side
  // (see use-scroll-container.ts) — matches SSR/no-JS, and only visible for
  // one pre-paint layout pass before the virtualized view below takes over.
  if (!ready) {
    return (
      <div
        ref={anchorRef}
        role="list"
        className="m-0 grid grid-cols-2 gap-3 p-0 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
      >
        {items.map((item) => (
          <ItemCard key={item.id} item={item} locationNameById={locationNameById} />
        ))}
      </div>
    );
  }

  const rows = chunkIntoRows(items, columns);

  return (
    <Virtualizer scrollRef={scrollContainerRef} data={rows} as={GridContainer} item={GridRowWrapper}>
      {(row: Item[]) => <GridRow row={row} columns={columns} locationNameById={locationNameById} />}
    </Virtualizer>
  );
}
