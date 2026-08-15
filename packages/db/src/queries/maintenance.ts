import { and, eq } from "drizzle-orm";

import { getEffectiveOwnerId } from "../access";
import { maintenanceEntries } from "../schema";
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
