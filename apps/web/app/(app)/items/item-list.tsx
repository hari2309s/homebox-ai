"use client";

import { EmptyState } from "@homebox-ai/ui";
import Link from "next/link";
import type { CustomContainerComponentProps, CustomItemComponentProps } from "virtua";
import { Virtualizer } from "virtua";

import { formatCurrency } from "../../../lib/currency";
import { useScrollContainer } from "../../../lib/use-scroll-container";

interface Item {
  id: string;
  name: string;
  locationId: string | null;
  assetId: number | null;
  archived: boolean;
  currency: string;
  purchasePrice: string | null;
}

interface ItemListProps {
  items: Item[];
  locationNameById: Map<string, string>;
}

function ItemRow({ item, locationNameById }: { item: Item; locationNameById: Map<string, string> }) {
  return (
    <Link
      href={`/items/${item.id}`}
      className="flex items-center justify-between gap-3 rounded-md border border-border px-4 py-3 transition-transform duration-150 hover:-translate-y-px hover:scale-[1.015] active:scale-[0.985]"
    >
      <span className="flex items-center gap-2 font-medium text-ink">
        {item.name}
        {item.archived && (
          <span className="rounded-full bg-muted/20 px-2 py-0.5 text-[10px] font-semibold text-muted">Archived</span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-2 text-sm text-muted">
        {formatCurrency(item.purchasePrice, item.currency) && (
          <span className="font-semibold text-ink">{formatCurrency(item.purchasePrice, item.currency)}</span>
        )}
        {item.assetId != null && <span>#{String(item.assetId).padStart(4, "0")}</span>}
        {item.locationId && <span>{locationNameById.get(item.locationId) ?? ""}</span>}
      </span>
    </Link>
  );
}

function ListContainer({ children, style, ref }: CustomContainerComponentProps) {
  return (
    <ul ref={ref} role="list" className="m-0 list-none p-0" style={style}>
      {children}
    </ul>
  );
}

function ListRow({ children, style, ref }: CustomItemComponentProps) {
  return (
    <li ref={ref} className="pb-2" style={style}>
      {children}
    </li>
  );
}

export function ItemList({ items, locationNameById }: ItemListProps) {
  const { anchorRef, scrollContainerRef, ready } = useScrollContainer<HTMLUListElement>();

  if (items.length === 0) {
    return <EmptyState>No items match — try a different search.</EmptyState>;
  }

  // Renders every row until the page's scroll container is found client-side
  // (see use-scroll-container.ts) — matches SSR/no-JS, and only visible for
  // one pre-paint layout pass before the virtualized view below takes over.
  if (!ready) {
    return (
      <ul ref={anchorRef} role="list" className="m-0 flex list-none flex-col gap-2 p-0">
        {items.map((item) => (
          <li key={item.id}>
            <ItemRow item={item} locationNameById={locationNameById} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <Virtualizer scrollRef={scrollContainerRef} data={items} as={ListContainer} item={ListRow}>
      {(item: Item) => <ItemRow item={item} locationNameById={locationNameById} />}
    </Virtualizer>
  );
}
