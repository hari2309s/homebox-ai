import { and, eq } from "drizzle-orm";

import { getEffectiveOwnerId } from "../access";
import { locations } from "../schema";
import { withRLS } from "../rls";

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

export function updateLocation(userId: string, locationId: string, data: { name: string; parentId?: string | null }) {
  return withRLS(userId, async (tx) => {
    const ownerId = await getEffectiveOwnerId(tx, userId);
    return tx
      .update(locations)
      .set({ name: data.name, parentId: data.parentId ?? null })
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
