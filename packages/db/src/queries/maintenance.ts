import { and, desc, eq } from "drizzle-orm";

import { getEffectiveOwnerId } from "../access";
import { items, maintenanceEntries } from "../schema";
import { withRLS } from "../rls";

export interface CreateMaintenanceEntryInput {
  itemId: string;
  date: string;
  name: string;
  description?: string;
  cost?: string;
}

export function listMaintenanceForItem(userId: string, itemId: string) {
  return withRLS(userId, async (tx) => {
    const ownerId = await getEffectiveOwnerId(tx, userId);
    return tx
      .select()
      .from(maintenanceEntries)
      .where(and(eq(maintenanceEntries.itemId, itemId), eq(maintenanceEntries.ownerId, ownerId)));
  });
}

/** Most recently logged maintenance entries with their item name — used for the home page activity feed. */
export function listRecentMaintenance(userId: string, limit = 5) {
  return withRLS(userId, async (tx) => {
    const ownerId = await getEffectiveOwnerId(tx, userId);
    return tx
      .select({
        id: maintenanceEntries.id,
        name: maintenanceEntries.name,
        itemId: maintenanceEntries.itemId,
        itemName: items.name,
        createdAt: maintenanceEntries.createdAt,
      })
      .from(maintenanceEntries)
      .innerJoin(items, eq(maintenanceEntries.itemId, items.id))
      .where(eq(maintenanceEntries.ownerId, ownerId))
      .orderBy(desc(maintenanceEntries.createdAt))
      .limit(limit);
  });
}

export function listAllMaintenance(userId: string) {
  return withRLS(userId, async (tx) => {
    const ownerId = await getEffectiveOwnerId(tx, userId);
    return tx.select().from(maintenanceEntries).where(eq(maintenanceEntries.ownerId, ownerId));
  });
}

export function createMaintenanceEntry(userId: string, data: CreateMaintenanceEntryInput) {
  return withRLS(userId, async (tx) => {
    const ownerId = await getEffectiveOwnerId(tx, userId);
    return tx
      .insert(maintenanceEntries)
      .values({ ownerId, ...data })
      .returning();
  });
}

export interface UpdateMaintenanceEntryInput {
  date?: string;
  name?: string;
  description?: string | null;
  cost?: string | null;
}

export function updateMaintenanceEntry(userId: string, entryId: string, data: UpdateMaintenanceEntryInput) {
  return withRLS(userId, async (tx) => {
    const ownerId = await getEffectiveOwnerId(tx, userId);
    return tx
      .update(maintenanceEntries)
      .set(data)
      .where(and(eq(maintenanceEntries.id, entryId), eq(maintenanceEntries.ownerId, ownerId)))
      .returning();
  });
}

export function deleteMaintenanceEntry(userId: string, entryId: string) {
  return withRLS(userId, async (tx) => {
    const ownerId = await getEffectiveOwnerId(tx, userId);
    return tx
      .delete(maintenanceEntries)
      .where(and(eq(maintenanceEntries.id, entryId), eq(maintenanceEntries.ownerId, ownerId)))
      .returning();
  });
}
