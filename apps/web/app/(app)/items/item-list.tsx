"use client";

import { EmptyState, SwipeableRow, type SwipeAction } from "@homebox-ai/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { useCallback, useState } from "react";

import { formatCurrency } from "../../../lib/currency";
import { toastItemArchived } from "../notifications/use-notifications";
import { archiveItemAction } from "./actions";
import { stripeFor } from "./item-summary";

interface Item {
  id: string;
  name: string;
  locationId: string | null;
  assetId: number | null;
  archived: boolean;
  currency: string;
  purchasePrice: string | null;
}

export interface ZoneGroup {
  zoneId: string | null;
  zoneName: string;
  zoneIndex: number;
  color: string;
  items: Item[];
}

interface ItemListProps {
  groups: ZoneGroup[];
  locationNameById: Map<string, string>;
  selectedId: string | null;
  onSelect: (itemId: string, event: MouseEvent<HTMLAnchorElement>) => void;
}

function ItemRow({
  item,
  group,
  locationNameById,
  selected,
  onSelect,
}: {
  item: Item;
  group: ZoneGroup;
  locationNameById: Map<string, string>;
  selected: boolean;
  onSelect: ItemListProps["onSelect"];
}) {
  const locationName = item.locationId ? locationNameById.get(item.locationId) : null;
  const price = formatCurrency(item.purchasePrice, item.currency);

  return (
    <Link
      href={`/items/${item.id}`}
      onClick={(event) => onSelect(item.id, event)}
      aria-current={selected ? "true" : undefined}
      data-item-id={item.id}
      className={`flex items-center gap-3 border-b border-border/40 py-[10px] no-underline last:border-b-0 lg:px-3 lg:py-[9px] lg:hover:bg-selected-soft ${
        selected ? "lg:bg-selected-soft lg:shadow-[inset_3px_0_0_var(--color-accent)]" : ""
      }`}
    >
      <div
        className="h-[44px] w-[44px] shrink-0 rounded-[10px] lg:h-10 lg:w-10 lg:rounded-[9px]"
        style={{ backgroundImage: stripeFor(group.zoneIndex) }}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[15px] font-medium text-ink lg:text-[14px]">
          {item.name}
          {item.archived && <span className="ml-2 text-[11px] font-semibold text-muted">archived</span>}
        </span>
        <span className="flex items-center gap-[6px] text-xs text-muted">
          <span className="hidden h-[7px] w-[7px] rounded-[2px] lg:inline-block" style={{ background: group.color }} />
          {locationName ?? (group.zoneId ? "" : "No location")}
        </span>
      </div>
      {price && <span className="shrink-0 font-mono text-xs text-body">{price}</span>}
    </Link>
  );
}

function SwipeableItemRow({
  item,
  group,
  locationNameById,
  selected,
  onSelect,
  onArchive,
}: {
  item: Item;
  group: ZoneGroup;
  locationNameById: Map<string, string>;
  selected: boolean;
  onSelect: ItemListProps["onSelect"];
  onArchive: (itemId: string, name: string) => void;
}) {
  const router = useRouter();

  const actions: SwipeAction[] = [
    {
      icon: "move_item",
      label: "Move",
      bg: "#3a423d",
      color: "#fbfaf6",
      onAction: () => router.push(`/items/${item.id}?action=move`),
    },
    {
      icon: "archive",
      label: "Archive",
      bg: "#d9a43a",
      color: "#3a2a06",
      onAction: () => onArchive(item.id, item.name),
    },
    {
      icon: "delete",
      label: "Delete",
      bg: "#b0643f",
      color: "#fff",
      onAction: () => router.push(`/items/${item.id}?action=delete`),
    },
  ];

  const fullSwipeAction: SwipeAction = {
    icon: "archive",
    label: "Archive",
    bg: "#d9a43a",
    color: "#3a2a06",
    onAction: () => onArchive(item.id, item.name),
  };

  return (
    <SwipeableRow actions={actions} fullSwipeAction={fullSwipeAction} fullSwipeLabel="Release to archive">
      <div className="px-3">
        <ItemRow item={item} group={group} locationNameById={locationNameById} selected={selected} onSelect={onSelect} />
      </div>
    </SwipeableRow>
  );
}

export function ItemList({ groups, locationNameById, selectedId, onSelect }: ItemListProps) {
  const [undoItem, setUndoItem] = useState<{ id: string; name: string } | null>(null);

  const handleArchive = useCallback(async (itemId: string, name: string) => {
    setUndoItem({ id: itemId, name });
    await archiveItemAction(itemId);
    toastItemArchived(name);
    setTimeout(() => setUndoItem((prev) => (prev?.id === itemId ? null : prev)), 4000);
  }, []);

  if (groups.length === 0) {
    return <EmptyState>No items match — try a different search.</EmptyState>;
  }

  return (
    <div className="flex flex-col gap-[6px] pb-4 lg:gap-0 lg:overflow-hidden lg:rounded-[14px] lg:border lg:border-border lg:bg-card lg:py-[2px]">
      {groups.map((group) => (
        <div key={group.zoneId ?? "unassigned"} className="flex flex-col gap-[6px] lg:gap-0">
          <div className="flex items-center gap-2 px-1 lg:hidden">
            <span className="h-[10px] w-[10px] rounded-[3px]" style={{ background: group.color }} />
            <span className="flex-1 text-sm font-semibold text-ink">{group.zoneName}</span>
            <span className="font-mono text-[11px] text-muted">{group.items.length}</span>
          </div>

          {/* Desktop: simple rows in a card */}
          <div className="hidden rounded-[14px] border border-border bg-card px-3 lg:block lg:rounded-none lg:border-0 lg:border-b lg:border-border/40 lg:bg-transparent lg:px-0 lg:last:border-b-0">
            {group.items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                group={group}
                locationNameById={locationNameById}
                selected={item.id === selectedId}
                onSelect={onSelect}
              />
            ))}
          </div>

          {/* Mobile: swipeable rows */}
          <div className="overflow-hidden rounded-[14px] border border-border bg-card lg:hidden">
            {group.items.map((item) => (
              <SwipeableItemRow
                key={item.id}
                item={item}
                group={group}
                locationNameById={locationNameById}
                selected={item.id === selectedId}
                onSelect={onSelect}
                onArchive={handleArchive}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Undo snackbar */}
      {undoItem && (
        <div className="flex items-center gap-[10px] rounded-[14px] bg-inverse px-[14px] py-[14px] lg:hidden">
          <span className="flex-1 text-[14px] text-inverse-ink">
            &ldquo;{undoItem.name}&rdquo; archived
          </span>
          <button
            type="button"
            className="cursor-pointer border-none bg-transparent text-[14px] font-semibold text-accent"
            onClick={() => setUndoItem(null)}
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
