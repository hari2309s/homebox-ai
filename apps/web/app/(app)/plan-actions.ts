"use server";

import { itemActivityQueries, itemQueries, locationQueries } from "@homebox-ai/db";
import { revalidatePath, revalidateTag } from "next/cache";

import { requireSessionUser } from "@homebox-ai/supabase/server";

import { locationTag } from "../../lib/cached-queries";
import { clampToPlot, isPlanKind, PLOT_H, PLOT_W, type Rect } from "../../lib/plan-layout";

function finite(value: unknown, label: string): number {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(`Invalid ${label}`);
  return n;
}

function validRect(rect: Rect): Rect {
  const r = clampToPlot({
    x: finite(rect.x, "x"),
    y: finite(rect.y, "y"),
    w: Math.max(12, finite(rect.w, "width")),
    h: Math.max(12, finite(rect.h, "height")),
  });
  return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) };
}

function validPoint(x: unknown, y: unknown) {
  return {
    planX: Math.round(Math.max(0, Math.min(PLOT_W, finite(x, "x")))),
    planY: Math.round(Math.max(0, Math.min(PLOT_H, finite(y, "y")))),
  };
}

function cleanName(name: unknown): string {
  const trimmed = String(name ?? "").trim();
  if (!trimmed) throw new Error("Give it a name first");
  return trimmed.slice(0, 120);
}

function afterPlaceChange(userId: string) {
  revalidateTag(locationTag(userId));
  revalidatePath("/locations");
}

export interface PlaceGeometryUpdate {
  id: string;
  rect: Rect;
  kind?: string;
}

/** Saves place geometry, plus any pins that moved with them, before revalidating — so the refreshed page never shows a half-saved drag. */
export async function savePlacesAction(
  updates: PlaceGeometryUpdate[],
  pins: { id: string; x: number; y: number }[] = [],
) {
  const user = await requireSessionUser();
  if (
    !Array.isArray(updates) ||
    updates.length === 0 ||
    updates.length > 500 ||
    !Array.isArray(pins) ||
    pins.length > 500
  )
    return;
  for (const pin of pins) {
    await itemQueries.updateItem(user.id, String(pin.id), validPoint(pin.x, pin.y));
  }
  await locationQueries.updateLocationPlans(
    user.id,
    updates.map(({ id, rect, kind }) => {
      const r = validRect(rect);
      return {
        id: String(id),
        planX: r.x,
        planY: r.y,
        planW: r.w,
        planH: r.h,
        ...(kind !== undefined ? { planKind: isPlanKind(kind) ? kind : null } : {}),
      };
    }),
  );
  afterPlaceChange(user.id);
}

export async function createPlaceAction(input: { name: string; parentId: string | null; kind: string; rect: Rect }) {
  const user = await requireSessionUser();
  const r = validRect(input.rect);
  const [location] = await locationQueries.createLocation(user.id, {
    name: cleanName(input.name),
    parentId: input.parentId || null,
    planKind: isPlanKind(input.kind) ? input.kind : null,
    planX: r.x,
    planY: r.y,
    planW: r.w,
    planH: r.h,
  });
  afterPlaceChange(user.id);
  if (!location) throw new Error("Couldn't add that place");
  return { id: location.id };
}

export async function updatePlaceAction(input: { id: string; name: string; parentId: string | null; kind: string }) {
  const user = await requireSessionUser();
  await locationQueries.updateLocation(user.id, input.id, {
    name: cleanName(input.name),
    parentId: input.parentId || null,
  });
  await locationQueries.updateLocationPlans(user.id, [
    { id: input.id, planKind: isPlanKind(input.kind) ? input.kind : null },
  ]);
  afterPlaceChange(user.id);
}

export async function deletePlaceAction(id: string) {
  const user = await requireSessionUser();
  await locationQueries.deleteLocation(user.id, String(id));
  afterPlaceChange(user.id);
  revalidatePath("/items");
}

export async function createThingAction(input: { name: string; locationId: string | null; x: number; y: number }) {
  const user = await requireSessionUser();
  const [item] = await itemQueries.createItem(user.id, {
    name: cleanName(input.name),
    locationId: input.locationId || null,
    ...validPoint(input.x, input.y),
  });
  if (!item) throw new Error("Couldn't add that thing");
  await itemActivityQueries.recordItemActivity(user.id, { itemName: item.name, action: "created", itemId: item.id });
  revalidatePath("/", "layout");
  return { id: item.id };
}

/** Moves a pinned thing; landing in a different place moves the item there in the inventory too. */
export async function moveThingAction(input: { id: string; locationId: string | null; x: number; y: number }) {
  const user = await requireSessionUser();
  await itemQueries.updateItem(user.id, String(input.id), {
    locationId: input.locationId || null,
    ...validPoint(input.x, input.y),
  });
  revalidatePath("/items");
}

export async function unpinThingAction(id: string) {
  const user = await requireSessionUser();
  await itemQueries.updateItem(user.id, String(id), { planX: null, planY: null });
}
