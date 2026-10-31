import { and, eq, sql } from "drizzle-orm";

import { getEffectiveOwnerId } from "../access";
import { wouldFormCycle } from "../cycle";
import { locations } from "../schema";
import { withRLS, type Tx } from "../rls";

export function listLocations(userId: string) {
  return withRLS(userId, async (tx) => {
    const ownerId = await getEffectiveOwnerId(tx, userId);
    return tx.select().from(locations).where(eq(locations.ownerId, ownerId));
  });
}

export interface LocationPlan {
  planKind?: string | null;
  planShape?: string | null;
  planX?: number | null;
  planY?: number | null;
  planW?: number | null;
  planH?: number | null;
}

export function createLocation(userId: string, data: { name: string; parentId?: string | null } & LocationPlan) {
  return withRLS(userId, async (tx) => {
    const ownerId = await getEffectiveOwnerId(tx, userId);
    return tx
      .insert(locations)
      .values({ ...data, ownerId, parentId: data.parentId ?? null })
      .returning();
  });
}

/** Saves site-plan kind/geometry for several places in one transaction (a dragged zone moves its sub-places too). */
export function updateLocationPlans(userId: string, updates: ({ id: string } & LocationPlan)[]) {
  if (updates.length === 0) return Promise.resolve();
  // Single-item fast path avoids the overhead of unnest/CTE.
  if (updates.length === 1) {
    const { id, ...plan } = updates[0]!;
    return withRLS(userId, async (tx) => {
      const ownerId = await getEffectiveOwnerId(tx, userId);
      await tx
        .update(locations)
        .set(plan)
        .where(and(eq(locations.id, id), eq(locations.ownerId, ownerId)));
    });
  }
  return withRLS(userId, async (tx) => {
    const ownerId = await getEffectiveOwnerId(tx, userId);
    const ids = updates.map((u) => u.id);
    const planKinds = updates.map((u) => u.planKind ?? null);
    const planShapes = updates.map((u) => u.planShape ?? null);
    const planXs = updates.map((u) => u.planX ?? null);
    const planYs = updates.map((u) => u.planY ?? null);
    const planWs = updates.map((u) => u.planW ?? null);
    const planHs = updates.map((u) => u.planH ?? null);
    await tx.execute(sql`
      update locations as l set
        plan_kind  = coalesce(v.plan_kind,  l.plan_kind),
        plan_shape = coalesce(v.plan_shape, l.plan_shape),
        plan_x     = coalesce(v.plan_x,     l.plan_x),
        plan_y     = coalesce(v.plan_y,     l.plan_y),
        plan_w     = coalesce(v.plan_w,     l.plan_w),
        plan_h     = coalesce(v.plan_h,     l.plan_h)
      from (
        select
          unnest(${ids}::uuid[])             as id,
          unnest(${planKinds}::text[])       as plan_kind,
          unnest(${planShapes}::text[])      as plan_shape,
          unnest(${planXs}::double precision[])   as plan_x,
          unnest(${planYs}::double precision[])   as plan_y,
          unnest(${planWs}::double precision[])   as plan_w,
          unnest(${planHs}::double precision[])   as plan_h
      ) as v
      where l.id = v.id and l.owner_id = ${ownerId}
    `);
  });
}

// Without this, nothing stops a location from being re-parented under its
// own descendant — which would make the nesting chain circular, and apps/web's
// /locations page builds a display path by recursing up that chain with no
// cycle guard, so a circular chain crashes that page (stack overflow) on
// every future load, not just at write time. See ../cycle.ts.
async function getParentId(tx: Tx, ownerId: string, locationId: string): Promise<string | null> {
  const [row] = await tx
    .select({ parentId: locations.parentId })
    .from(locations)
    .where(and(eq(locations.id, locationId), eq(locations.ownerId, ownerId)));
  return row?.parentId ?? null;
}

export function updateLocation(userId: string, locationId: string, data: { name: string; parentId?: string | null }) {
  return withRLS(userId, async (tx) => {
    const ownerId = await getEffectiveOwnerId(tx, userId);
    const parentId = data.parentId ?? null;
    if (parentId && (await wouldFormCycle(locationId, parentId, (id) => getParentId(tx, ownerId, id)))) {
      throw new Error("Can't move a location inside itself or one of its own sub-locations.");
    }
    return tx
      .update(locations)
      .set({ name: data.name, parentId })
      .where(and(eq(locations.id, locationId), eq(locations.ownerId, ownerId)))
      .returning();
  });
}

export function deleteLocation(userId: string, locationId: string) {
  return withRLS(userId, async (tx) => {
    const ownerId = await getEffectiveOwnerId(tx, userId);
    return tx.delete(locations).where(and(eq(locations.id, locationId), eq(locations.ownerId, ownerId)));
  });
}

/** Moves a place under a new parent (or to the top level) without touching its name. */
export function setLocationParent(userId: string, locationId: string, parentId: string | null) {
  return withRLS(userId, async (tx) => {
    const ownerId = await getEffectiveOwnerId(tx, userId);
    if (parentId && (await wouldFormCycle(locationId, parentId, (id) => getParentId(tx, ownerId, id)))) {
      throw new Error("Can't move a place inside itself or one of its own spots.");
    }
    return tx
      .update(locations)
      .set({ parentId })
      .where(and(eq(locations.id, locationId), eq(locations.ownerId, ownerId)))
      .returning();
  });
}
