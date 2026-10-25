"use client";

import {
  ConfirmDialog,
  EmptyState,
  Input,
  Select,
  SubmitButton,
  TapButton,
} from "@homebox-ai/ui";
import { useState } from "react";

import { deleteLocationAction, updateLocationAction } from "./actions";

interface LocationRecord {
  id: string;
  name: string;
  parentId: string | null;
}

interface LocationListProps {
  locations: LocationRecord[];
  pathById: Map<string, string>;
  countsById: Record<string, number>;
}

const ZONE_COLORS = ["#c5c9bf", "#3f6b45", "#b0643f", "#8a7a4f", "#7c867f"];

export function LocationList({ locations, pathById, countsById }: LocationListProps) {
  if (locations.length === 0) {
    return <EmptyState>No locations yet — add your first one below.</EmptyState>;
  }

  const topLocations = locations.filter((l) => !l.parentId);
  const colorByZone = new Map(topLocations.map((l, i) => [l.id, ZONE_COLORS[i % ZONE_COLORS.length]!]));

  function findZoneColor(locationId: string): string {
    const loc = locations.find((l) => l.id === locationId);
    if (!loc) return "#7c867f";
    if (!loc.parentId) return colorByZone.get(loc.id) ?? "#7c867f";
    return findZoneColor(loc.parentId);
  }

  function getChildren(parentId: string): LocationRecord[] {
    return locations.filter((l) => l.parentId === parentId);
  }

  function hasChildren(locationId: string): boolean {
    return locations.some((l) => l.parentId === locationId);
  }

  return (
    <div className="rounded-[14px] border border-border bg-card shadow-card">
      {topLocations.map((location, i) => (
        <LocationNode
          key={location.id}
          location={location}
          locations={locations}
          pathById={pathById}
          countsById={countsById}
          depth={0}
          color={colorByZone.get(location.id) ?? "#7c867f"}
          findZoneColor={findZoneColor}
          getChildren={getChildren}
          hasChildren={hasChildren}
          isLast={i === topLocations.length - 1}
        />
      ))}
    </div>
  );
}

function LocationNode({
  location,
  locations,
  pathById,
  countsById,
  depth,
  color,
  findZoneColor,
  getChildren,
  hasChildren,
  isLast,
}: {
  location: LocationRecord;
  locations: LocationRecord[];
  pathById: Map<string, string>;
  countsById: Record<string, number>;
  depth: number;
  color: string;
  findZoneColor: (id: string) => string;
  getChildren: (id: string) => LocationRecord[];
  hasChildren: (id: string) => boolean;
  isLast: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const children = getChildren(location.id);
  const hasKids = hasChildren(location.id);
  const count = countsById[location.id] ?? 0;
  const isTopLevel = depth === 0;
  const paddingLeft = depth === 0 ? 12 : depth === 1 ? 30 : 54;
  const dotSize = depth === 0 ? 12 : depth === 1 ? 8 : 6;

  async function handleDelete() {
    setError(null);
    setDeleting(true);
    const formData = new FormData();
    formData.set("id", location.id);
    try {
      await deleteLocationAction(formData);
      setConfirmOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete this location");
      setConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  if (editing) {
    return (
      <div
        className="border-b border-border/60 bg-[#f6f9f3]"
        style={{ paddingLeft }}
      >
        <form
          action={async (formData) => {
            setError(null);
            try {
              await updateLocationAction(formData);
              setEditing(false);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Couldn't save that change");
            }
          }}
          className="flex items-center gap-[6px] py-2 pr-3"
        >
          <span className="material-symbols-rounded w-[18px] text-[18px] text-muted">
            {hasKids ? "expand_more" : ""}
          </span>
          <input type="hidden" name="id" value={location.id} />
          <Input name="name" defaultValue={location.name} required className="flex-1 !rounded-[9px] !border-2 !border-accent !shadow-[0_0_0_3px_#dfe8d6]" />
          <Select name="parentId" defaultValue={location.parentId ?? ""} className="max-w-[140px] !rounded-[9px]">
            <option value="">No parent</option>
            {locations
              .filter((c) => c.id !== location.id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {pathById.get(c.id) ?? c.name}
                </option>
              ))}
          </Select>
          <SubmitButton className="!h-8 !w-8 !rounded-lg !px-0">
            <span className="material-symbols-rounded text-[18px]">check</span>
          </SubmitButton>
          <TapButton
            type="button"
            onClick={() => setEditing(false)}
            className="!h-8 !w-8 cursor-pointer rounded-lg border border-border bg-card !px-0"
          >
            <span className="material-symbols-rounded text-[18px] text-body">close</span>
          </TapButton>
        </form>
        {error && (
          <p role="alert" className="px-3 pb-2 text-sm text-[#7a3f22]">{error}</p>
        )}
      </div>
    );
  }

  return (
    <>
      <div
        className={`flex items-center gap-2 border-b border-border/40 ${isTopLevel ? "bg-[#fbfaf6] dark:bg-card" : ""}`}
        style={{ paddingLeft, height: 40, paddingRight: 12 }}
      >
        <button
          type="button"
          onClick={() => hasKids && setExpanded(!expanded)}
          className="flex w-[18px] cursor-pointer items-center justify-center border-none bg-transparent p-0"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {hasKids && (
            <span className="material-symbols-rounded text-[18px] text-muted">
              {expanded ? "expand_more" : "chevron_right"}
            </span>
          )}
        </button>
        <span
          className="shrink-0 rounded-[3px]"
          style={{ width: dotSize, height: dotSize, background: color }}
        />
        <span
          className="flex-1 truncate text-ink"
          style={{ fontSize: isTopLevel ? 15 : 14, fontWeight: isTopLevel ? 600 : depth === 1 ? 500 : 400 }}
        >
          {location.name}
        </span>
        <span className="font-mono text-[11px] text-muted">{count}</span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="cursor-pointer border-none bg-transparent p-0"
          aria-label="Edit location"
        >
          <span className="material-symbols-rounded text-[18px] text-[#a3aba5]">more_horiz</span>
        </button>
      </div>

      {confirmOpen && (
        <div className="border-b border-border/40 bg-[#fbf1ec] px-4 py-3" style={{ paddingLeft }}>
          <div className="flex flex-col gap-2">
            <p className="text-[13px] leading-snug text-[#7a3f22]">
              <b>Delete &ldquo;{location.name}&rdquo;?</b>
              {" "}Items inside will become unassigned.
            </p>
            <div className="flex gap-[6px]">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="cursor-pointer rounded-lg bg-[#b0643f] px-3 py-1.5 text-[13px] font-semibold text-white border-none"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="cursor-pointer rounded-lg border border-border bg-card px-3 py-1.5 text-[13px] font-semibold text-ink"
              >
                Keep
              </button>
            </div>
          </div>
        </div>
      )}

      {error && !editing && (
        <p role="alert" className="border-b border-border/40 px-4 py-2 text-sm text-[#7a3f22]">{error}</p>
      )}

      {expanded &&
        children.map((child, i) => (
          <LocationNode
            key={child.id}
            location={child}
            locations={locations}
            pathById={pathById}
            countsById={countsById}
            depth={depth + 1}
            color={color}
            findZoneColor={findZoneColor}
            getChildren={getChildren}
            hasChildren={hasChildren}
            isLast={i === children.length - 1 && isLast}
          />
        ))}

      <ConfirmDialog
        open={false}
        title=""
        confirmLabel=""
        confirming={false}
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    </>
  );
}
