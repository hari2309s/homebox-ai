"use client";

import { EmptyState } from "@homebox-ai/ui";
import Link from "next/link";

import { formatCurrency } from "../../../lib/currency";

interface Item {
  id: string;
  name: string;
  locationId: string | null;
  assetId: number | null;
  archived: boolean;
  currency: string;
  purchasePrice: string | null;
}

interface ZoneGroup {
  zoneId: string | null;
  zoneName: string;
  color: string;
  items: Item[];
}

interface ItemListProps {
  groups: ZoneGroup[];
  locationNameById: Map<string, string>;
}

function ItemRow({ item, locationNameById }: { item: Item; locationNameById: Map<string, string> }) {
  const locationName = item.locationId ? locationNameById.get(item.locationId) : null;
  const price = formatCurrency(item.purchasePrice, item.currency);

  return (
    <Link
      href={`/items/${item.id}`}
      className="flex items-center gap-3 border-b border-[#eeeee8] px-0 py-[10px] no-underline last:border-b-0 dark:border-border"
    >
      <div className="h-[44px] w-[44px] shrink-0 rounded-[10px] bg-surface-soft" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[15px] font-medium text-ink">{item.name}</span>
        <span className="text-xs text-muted">{locationName ?? ""}</span>
      </div>
      {price && <span className="shrink-0 font-mono text-xs text-body">{price}</span>}
    </Link>
  );
}

export function ItemList({ groups, locationNameById }: ItemListProps) {
  if (groups.length === 0) {
    return <EmptyState>No items match — try a different search.</EmptyState>;
  }

  return (
    <div className="flex flex-col gap-[6px] pb-4">
      {groups.map((group) => (
        <div key={group.zoneId ?? "unassigned"} className="flex flex-col gap-[6px]">
          <div className="flex items-center gap-2 px-1">
            <span className="h-[10px] w-[10px] rounded-[3px]" style={{ background: group.color }} />
            <span className="flex-1 text-sm font-semibold text-ink">{group.zoneName}</span>
            <span className="font-mono text-[11px] text-muted">{group.items.length}</span>
          </div>
          <div className="rounded-[14px] border border-border bg-card px-3">
            {group.items.map((item) => (
              <ItemRow key={item.id} item={item} locationNameById={locationNameById} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
