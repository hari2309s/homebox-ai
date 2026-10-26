"use client";

import { ConfirmDialog } from "@homebox-ai/ui";
import Link from "next/link";
import { useEffect, useState } from "react";

import { locationPath } from "./items/item-summary";
import { PLAN_KINDS, type PlacedPlace, type PlanKind, type Rect } from "../../lib/plan-layout";
import type { PlanThing } from "./plan-canvas";

interface PlanPanelProps {
  place?: PlacedPlace;
  thing?: PlanThing;
  places: PlacedPlace[];
  things: PlanThing[];
  counts: Map<string, number>;
  onClose: () => void;
  onZoom: (rect: Rect) => void;
  onRename: (id: string, name: string, kind: PlanKind) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddThingHere: () => void;
  onAddPlaceInside: () => void;
  onPin: (thingId: string, placeId: string) => Promise<void>;
  onUnpin: (thingId: string) => Promise<void>;
  onSelectThing: (id: string) => void;
  onSelectPlace: (id: string) => void;
}

const CARD = "rounded-[14px] border border-border bg-card";
const SMALL_BASE =
  "flex cursor-pointer items-center justify-center gap-1 rounded-[9px] px-[10px] py-[7px] text-[12px] font-semibold no-underline";
const SMALL_BUTTON = `${SMALL_BASE} border border-border bg-card text-ink`;
const SMALL_PRIMARY = `${SMALL_BASE} border-none bg-accent text-white`;

function kindMeta(kind: PlanKind) {
  return PLAN_KINDS.find((k) => k.kind === kind)!;
}

function pathLabel(places: PlacedPlace[], id: string | null) {
  const path = locationPath(places, id);
  return path.length ? path.map((p) => p.name.toUpperCase()).join(" › ") : "NOT IN A PLACE";
}

export function PlanPanel(props: PlanPanelProps) {
  if (props.thing) return <ThingPanel {...props} thing={props.thing} />;
  if (props.place) return <PlacePanel {...props} place={props.place} />;
  return null;
}

function PanelHeader({ eyebrow, onClose }: { eyebrow: string; onClose: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-accent">{eyebrow}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="flex cursor-pointer border-none bg-transparent p-0 text-muted hover:text-ink"
      >
        <span aria-hidden className="material-symbols-rounded text-[20px]">
          close
        </span>
      </button>
    </div>
  );
}

function PlacePanel({
  place,
  places,
  things,
  counts,
  onClose,
  onZoom,
  onRename,
  onDelete,
  onAddThingHere,
  onAddPlaceInside,
  onPin,
  onSelectThing,
  onSelectPlace,
}: PlanPanelProps & { place: PlacedPlace }) {
  const [name, setName] = useState(place.name);
  const [kind, setKind] = useState<PlanKind>(place.kind);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setName(place.name);
    setKind(place.kind);
  }, [place.id, place.name, place.kind]);

  const dirty = name.trim() !== place.name || kind !== place.kind;
  const subPlaces = places.filter((p) => p.parentId === place.id);
  const here = things.filter((t) => t.locationId === place.id);
  const total = counts.get(place.id) ?? 0;
  const meta = kindMeta(place.kind);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    await onRename(place.id, name.trim(), kind);
    setSaving(false);
  }

  return (
    <>
      <div className={`${CARD} flex flex-col gap-3 p-4 shadow-[8px_12px_24px_-14px_rgba(31,38,34,.25)]`}>
        <PanelHeader
          eyebrow={
            place.parentId ? `INSIDE ${pathLabel(places, place.parentId)}` : `${meta.label.toUpperCase()} · ON THE PLOT`
          }
          onClose={onClose}
        />
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
          className="flex flex-col gap-[10px]"
        >
          <div className="flex items-center gap-[10px]">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-selected text-accent">
              <span aria-hidden className="material-symbols-rounded text-[20px]">
                {kindMeta(kind).icon}
              </span>
            </span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-label="Rename place"
              className="min-w-0 flex-1 rounded-[8px] border border-transparent bg-transparent px-1 font-serif text-[22px] leading-tight text-ink outline-none hover:border-border focus:border-accent"
            />
          </div>
          <div className="flex flex-wrap gap-[5px]" role="radiogroup" aria-label="Kind of place">
            {PLAN_KINDS.map((k) => (
              <button
                key={k.kind}
                type="button"
                role="radio"
                aria-checked={kind === k.kind}
                onClick={() => setKind(k.kind)}
                className={`cursor-pointer rounded-full px-[9px] py-[3px] text-[11px] font-semibold ${
                  kind === k.kind
                    ? "border border-transparent bg-selected text-ink"
                    : "border border-border bg-transparent text-muted hover:text-ink"
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>
          {dirty && (
            <button
              type="submit"
              disabled={saving}
              className="self-start cursor-pointer rounded-[9px] border-none bg-accent px-3 py-[7px] text-[12px] font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          )}
        </form>
        <div className="grid grid-cols-2 rounded-xl border border-border/70 py-[10px] text-center">
          <div>
            <div className="font-mono text-[16px] text-ink">{total}</div>
            <div className="text-[11px] text-muted">{total === 1 ? "thing" : "things"}</div>
          </div>
          <div className="border-l border-border/60">
            <div className="font-mono text-[16px] text-ink">{subPlaces.length}</div>
            <div className="text-[11px] text-muted">{subPlaces.length === 1 ? "spot inside" : "spots inside"}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-[6px]">
          <button type="button" onClick={onAddThingHere} className={SMALL_PRIMARY}>
            <span aria-hidden className="material-symbols-rounded text-[16px]">
              add_circle
            </span>
            Add thing
          </button>
          <button type="button" onClick={onAddPlaceInside} className={SMALL_BUTTON}>
            <span aria-hidden className="material-symbols-rounded text-[16px]">
              add_location_alt
            </span>
            Add spot
          </button>
          <button type="button" onClick={() => onZoom(place.rect)} className={SMALL_BUTTON}>
            <span aria-hidden className="material-symbols-rounded text-[16px]">
              zoom_in_map
            </span>
            Zoom to
          </button>
          <Link href={`/items?location=${place.id}`} className={SMALL_BUTTON}>
            <span aria-hidden className="material-symbols-rounded text-[16px]">
              inventory_2
            </span>
            In Things
          </Link>
        </div>
        {!place.stored && (
          <p className="m-0 text-[12px] text-muted">This spot is a suggestion. Drag or resize it to save it.</p>
        )}
      </div>

      {subPlaces.length > 0 && (
        <div className={CARD}>
          <div className="border-b border-border/60 px-[14px] py-3 font-mono text-[10px] text-muted">SPOTS INSIDE</div>
          {subPlaces.map((sub) => (
            <button
              key={sub.id}
              type="button"
              onClick={() => onSelectPlace(sub.id)}
              className="flex w-full cursor-pointer items-center gap-[10px] border-0 border-b border-solid border-border/40 bg-transparent px-[14px] py-[10px] text-left last:border-b-0 hover:bg-selected-soft"
            >
              <span aria-hidden className="material-symbols-rounded text-[16px] text-muted">
                {kindMeta(sub.kind).icon}
              </span>
              <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink">{sub.name}</span>
              <span className="font-mono text-[10px] text-muted">{counts.get(sub.id) ?? 0}</span>
            </button>
          ))}
        </div>
      )}

      <div className={CARD}>
        <div className="flex justify-between border-b border-border/60 px-[14px] py-3 font-mono text-[10px] text-muted">
          <span>THINGS HERE</span>
          <span>{here.length}</span>
        </div>
        {here.length === 0 ? (
          <p className="m-0 px-[14px] py-3 text-[13px] text-muted">
            Nothing logged here yet. Pick Thing and click inside it to add one.
          </p>
        ) : (
          here.map((thing) => {
            const pinned = thing.planX != null && thing.planY != null;
            return (
              <div
                key={thing.id}
                className="flex items-center gap-2 border-b border-border/40 px-[14px] py-[9px] last:border-b-0"
              >
                <Link
                  href={`/items/${thing.id}`}
                  className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink no-underline hover:text-accent"
                >
                  {thing.name}
                </Link>
                {pinned ? (
                  <button
                    type="button"
                    onClick={() => onSelectThing(thing.id)}
                    aria-label={`Show ${thing.name} on the plan`}
                    className="flex cursor-pointer border-none bg-transparent p-0 text-accent"
                  >
                    <span
                      className="material-symbols-rounded text-[18px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      location_on
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void onPin(thing.id, place.id)}
                    aria-label={`Pin ${thing.name} on the plan`}
                    title="Pin on plan"
                    className="flex cursor-pointer border-none bg-transparent p-0 text-muted hover:text-accent"
                  >
                    <span aria-hidden className="material-symbols-rounded text-[18px]">
                      push_pin
                    </span>
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="flex flex-col gap-2 rounded-[14px] border-[1.5px] border-[#d9a58a] bg-[#fbf1ec] p-[14px] dark:border-[#6b3d28] dark:bg-[#2a1d16]">
        <p className="m-0 text-[12px] leading-snug text-[#7a3f22] dark:text-[#e7a582]">
          Deleting a place keeps its things; they become unassigned. Spots inside it move up to the plot.
        </p>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="self-start cursor-pointer rounded-[9px] border-none bg-[#b0643f] px-3 py-[7px] text-[12px] font-semibold text-white"
        >
          Delete place
        </button>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title={`Delete "${place.name}"?`}
        description="Things inside become unassigned. This can't be undone."
        confirmLabel="Delete"
        confirming={deleting}
        onConfirm={async () => {
          setDeleting(true);
          await onDelete(place.id);
          setDeleting(false);
          setConfirmOpen(false);
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}

function ThingPanel({ thing, places, onClose, onUnpin, onSelectPlace }: PlanPanelProps & { thing: PlanThing }) {
  const pinned = thing.planX != null && thing.planY != null;
  return (
    <div className={`${CARD} flex flex-col gap-3 p-4 shadow-[8px_12px_24px_-14px_rgba(31,38,34,.25)]`}>
      <PanelHeader eyebrow={pathLabel(places, thing.locationId)} onClose={onClose} />
      <div className="font-serif text-[22px] leading-tight text-ink">{thing.name}</div>
      <p className="m-0 text-[13px] leading-snug text-muted">
        Drag the pin into another place to move it there. Your inventory updates when you drop it.
      </p>
      <div className="grid grid-cols-2 gap-[6px]">
        <Link href={`/items/${thing.id}`} className={SMALL_PRIMARY}>
          <span aria-hidden className="material-symbols-rounded text-[16px]">
            open_in_new
          </span>
          Open
        </Link>
        {thing.locationId ? (
          <button type="button" onClick={() => onSelectPlace(thing.locationId!)} className={SMALL_BUTTON}>
            <span aria-hidden className="material-symbols-rounded text-[16px]">
              location_on
            </span>
            Its place
          </button>
        ) : (
          <span />
        )}
        {pinned && (
          <button type="button" onClick={() => void onUnpin(thing.id)} className={`${SMALL_BUTTON} col-span-2`}>
            <span aria-hidden className="material-symbols-rounded text-[16px]">
              location_off
            </span>
            Remove pin (keeps the thing)
          </button>
        )}
      </div>
    </div>
  );
}
