"use client";

import { Input, Select, SubmitButton } from "@homebox-ai/ui";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition, type DragEvent } from "react";

import { toastLocationCreated } from "../notifications/use-notifications";
import { reparentPlaceAction } from "../plan-actions";
import { createLocationAction } from "./actions";

export interface TreePlace {
  id: string;
  name: string;
  parentId: string | null;
  count: number;
  color: string;
  path: string;
}

type DropTarget = { id: string; mode: "inside" | "before" | "after" } | { id: null; mode: "root" };

export function PlaceTree({ places: serverPlaces, selectedId }: { places: TreePlace[]; selectedId: string | null }) {
  const [filter, setFilter] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [drop, setDrop] = useState<DropTarget | null>(null);
  const [moved, setMoved] = useState<Map<string, string | null>>(new Map());
  const [pending, startTransition] = useTransition();

  // Optimistic parents until the refreshed server data arrives.
  useEffect(() => setMoved(new Map()), [serverPlaces]);
  const places = useMemo(
    () => serverPlaces.map((p) => (moved.has(p.id) ? { ...p, parentId: moved.get(p.id)! } : p)),
    [serverPlaces, moved],
  );

  const childrenOf = useMemo(() => {
    const map = new Map<string | null, TreePlace[]>();
    const ids = new Set(places.map((p) => p.id));
    for (const p of places) {
      const parent = p.parentId && ids.has(p.parentId) ? p.parentId : null;
      map.set(parent, [...(map.get(parent) ?? []), p]);
    }
    return map;
  }, [places]);

  const query = filter.trim().toLowerCase();
  const visible = useMemo(() => {
    if (!query) return null;
    const byId = new Map(places.map((p) => [p.id, p]));
    const keep = new Set<string>();
    for (const p of places) {
      if (!p.name.toLowerCase().includes(query)) continue;
      let current: TreePlace | undefined = p;
      for (let guard = 0; current && guard < 20; guard++) {
        keep.add(current.id);
        current = current.parentId ? byId.get(current.parentId) : undefined;
      }
    }
    return keep;
  }, [places, query]);

  const rows: { place: TreePlace; depth: number; hasKids: boolean }[] = [];
  const seen = new Set<string>();
  function walk(parent: string | null, depth: number) {
    for (const place of childrenOf.get(parent) ?? []) {
      if (seen.has(place.id) || (visible && !visible.has(place.id))) continue;
      seen.add(place.id);
      const hasKids = (childrenOf.get(place.id) ?? []).length > 0;
      rows.push({ place, depth, hasKids });
      if (hasKids && (visible || !collapsed.has(place.id))) walk(place.id, depth + 1);
    }
  }
  walk(null, 0);

  const byId = useMemo(() => new Map(places.map((p) => [p.id, p])), [places]);
  const blocked = useMemo(() => {
    if (!dragId) return new Set<string>();
    const out = new Set([dragId]);
    const queue = [dragId];
    while (queue.length) {
      for (const child of childrenOf.get(queue.shift()!) ?? []) {
        if (!out.has(child.id)) {
          out.add(child.id);
          queue.push(child.id);
        }
      }
    }
    return out;
  }, [dragId, childrenOf]);

  function targetParent(target: DropTarget): string | null {
    if (target.mode === "root") return null;
    if (target.mode === "inside") return target.id;
    return byId.get(target.id)?.parentId ?? null;
  }

  function onRowDragOver(event: DragEvent<HTMLLIElement>, id: string) {
    if (!dragId || blocked.has(id)) return;
    const box = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientY - box.top) / box.height;
    const mode = ratio < 0.25 ? "before" : ratio > 0.75 ? "after" : "inside";
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (drop?.id !== id || drop.mode !== mode) setDrop({ id, mode });
  }

  function commit(target: DropTarget) {
    const id = dragId;
    setDragId(null);
    setDrop(null);
    if (!id) return;
    const parentId = targetParent(target);
    const current = byId.get(id);
    if (!current || current.parentId === parentId || (parentId && blocked.has(parentId))) return;
    setError(null);
    setMoved((prev) => new Map(prev).set(id, parentId));
    if (parentId)
      setCollapsed((prev) => {
        const next = new Set(prev);
        next.delete(parentId);
        return next;
      });
    startTransition(async () => {
      try {
        await reparentPlaceAction(id, parentId);
      } catch (err) {
        setMoved((prev) => {
          const next = new Map(prev);
          next.delete(id);
          return next;
        });
        setError(err instanceof Error ? err.message : "Couldn't move that place");
      }
    });
  }

  function toggle(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      <label className="flex items-center gap-2 rounded-[10px] border border-border bg-card px-3 focus-within:border-accent">
        <span aria-hidden className="material-symbols-rounded text-[20px] text-muted">
          search
        </span>
        <input
          type="search"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Filter places"
          aria-label="Filter places"
          className="h-10 min-w-0 flex-1 border-none bg-transparent text-[14px] text-ink outline-none placeholder:text-muted"
        />
      </label>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-[14px] border border-border bg-card py-[2px]">
        {rows.length === 0 ? (
          <p className="m-0 px-4 py-3 text-[13px] text-muted">
            {query ? "No places match." : "No places yet. Add the first one below."}
          </p>
        ) : (
          <ul role="tree" aria-label="Places" className="m-0 list-none p-0">
            {rows.map(({ place, depth, hasKids }) => {
              const selected = place.id === selectedId;
              const open = visible ? true : !collapsed.has(place.id);
              return (
                <li
                  key={place.id}
                  role="treeitem"
                  aria-selected={selected}
                  aria-expanded={hasKids ? open : undefined}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", place.id);
                    setDragId(place.id);
                  }}
                  onDragEnd={() => {
                    setDragId(null);
                    setDrop(null);
                  }}
                  onDragOver={(event) => onRowDragOver(event, place.id)}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (drop && drop.id === place.id) commit(drop);
                  }}
                  className={`relative flex h-10 cursor-grab items-center gap-2 border-b border-border/40 pr-3 active:cursor-grabbing ${
                    drop?.id === place.id && drop.mode === "inside"
                      ? "bg-selected shadow-[inset_0_0_0_2px_var(--color-accent)]"
                      : selected
                        ? "bg-selected-soft shadow-[inset_3px_0_0_var(--color-accent)]"
                        : "hover:bg-selected-soft/60"
                  } ${dragId === place.id || (pending && moved.has(place.id)) ? "opacity-50" : ""}`}
                  style={{ paddingLeft: 12 + depth * 22 }}
                >
                  {drop?.id === place.id && drop.mode !== "inside" && (
                    <span
                      aria-hidden
                      className={`pointer-events-none absolute right-2 h-[2px] rounded-full bg-accent ${drop.mode === "before" ? "-top-px" : "-bottom-px"}`}
                      style={{ left: 12 + depth * 22 }}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => hasKids && toggle(place.id)}
                    aria-label={hasKids ? `${open ? "Collapse" : "Expand"} ${place.name}` : undefined}
                    tabIndex={hasKids ? 0 : -1}
                    className="flex w-[18px] cursor-pointer justify-center border-none bg-transparent p-0 text-muted"
                  >
                    {hasKids && (
                      <span aria-hidden className="material-symbols-rounded text-[18px]">
                        {open ? "expand_more" : "chevron_right"}
                      </span>
                    )}
                  </button>
                  <Link
                    href={`/locations?selected=${place.id}`}
                    scroll={false}
                    replace
                    draggable={false}
                    className="flex min-w-0 flex-1 items-center gap-2 self-stretch no-underline"
                  >
                    <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: place.color }} />
                    <span
                      className={`min-w-0 flex-1 truncate text-[14px] text-ink ${depth === 0 || selected ? "font-semibold" : "font-normal"}`}
                    >
                      {place.name}
                    </span>
                    <span className="font-mono text-[11px] text-muted">{place.count}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {dragId && (
          <div
            onDragOver={(event) => {
              event.preventDefault();
              if (drop?.mode !== "root") setDrop({ id: null, mode: "root" });
            }}
            onDrop={(event) => {
              event.preventDefault();
              commit({ id: null, mode: "root" });
            }}
            className={`m-2 rounded-[10px] border-2 border-dashed px-3 py-3 text-center text-[12px] font-semibold ${
              drop?.mode === "root" ? "border-accent bg-selected text-ink" : "border-border text-muted"
            }`}
          >
            Drop here to move it out onto the plot
          </div>
        )}
      </div>
      {!dragId && rows.length > 1 && (
        <p className="m-0 -mt-1 px-1 text-[11px] text-muted">
          Drag a place onto another to nest it, or between rows to move it alongside.
        </p>
      )}

      <form
        key={selectedId ?? "none"}
        action={async (formData) => {
          setError(null);
          try {
            await createLocationAction(formData);
            toastLocationCreated(String(formData.get("name") ?? ""));
          } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't add that place");
          }
        }}
        className="grid grid-cols-[minmax(0,1fr)_150px_40px] gap-[6px]"
      >
        <Input name="name" placeholder="New place, e.g. Swing" aria-label="New place name" required />
        <Select name="parentId" defaultValue={selectedId ?? ""} aria-label="Inside">
          <option value="">On the plot</option>
          {places.map((p) => (
            <option key={p.id} value={p.id}>
              {p.path}
            </option>
          ))}
        </Select>
        <SubmitButton aria-label="Add place" className="!rounded-[10px] !px-0">
          <span aria-hidden className="material-symbols-rounded text-[18px]">
            add
          </span>
        </SubmitButton>
      </form>
      {error && (
        <p role="alert" className="m-0 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger-ink">
          {error}
        </p>
      )}
    </>
  );
}
