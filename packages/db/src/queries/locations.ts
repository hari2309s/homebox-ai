import { and, eq } from "drizzle-orm";

import { getEffectiveOwnerId } from "../access";
import { locations } from "../schema";
import { withRLS, type Tx } from "../rls";

export function listLocations(userId: string) {
  return withRLS(userId, async (tx) => {
    const ownerId = await getEffectiveOwnerId(tx, userId);
    return tx.select().from(locations).where(eq(locations.ownerId, ownerId));
  });
}

export function createLocation(userId: string, data: { name: string; parentId?: string | null }) {
  return withRLS(userId, async (tx) => {
    const ownerId = await getEffectiveOwnerId(tx, userId);
    return tx
      .insert(locations)
      .values({ ownerId, name: data.name, parentId: data.parentId ?? null })
      .returning();
  });
}

// Walks up from `proposedParentId` following parentId links, watching for
// `locationId` itself. Without this, nothing stops a location from being
// re-parented under its own descendant — which would make the nesting chain
// circular, and apps/web's /locations page builds a display path by
// recursing up that chain with no cycle guard, so a circular chain crashes
// that page (stack overflow) on every future load, not just at write time.
async function wouldCreateCycle(tx: Tx, ownerId: string, locationId: string, proposedParentId: string): Promise<boolean> {
  let currentId: string | null = proposedParentId;
  const visited = new Set<string>();
  while (currentId) {
    if (currentId === locationId) return true;
    if (visited.has(currentId)) return false; // already-circular ancestor data unrelated to this edit — not our call to fix here
    visited.add(currentId);
    const [row] = await tx
      .select({ parentId: locations.parentId })
      .from(locations)
      .where(and(eq(locations.id, currentId), eq(locations.ownerId, ownerId)));
    currentId = row?.parentId ?? null;
  }
  return false;
}

export function updateLocation(userId: string, locationId: string, data: { name: string; parentId?: string | null }) {
  return withRLS(userId, async (tx) => {
    const ownerId = await getEffectiveOwnerId(tx, userId);
    const parentId = data.parentId ?? null;
    if (parentId && (await wouldCreateCycle(tx, ownerId, locationId, parentId))) {
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
