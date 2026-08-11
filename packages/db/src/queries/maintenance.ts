import { eq } from "drizzle-orm";

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
  return withRLS(userId, (tx) =>
    tx.select().from(maintenanceEntries).where(eq(maintenanceEntries.itemId, itemId)),
  );
}

export function listAllMaintenance(userId: string) {
  return withRLS(userId, (tx) => tx.select().from(maintenanceEntries).where(eq(maintenanceEntries.ownerId, userId)));
}

export function createMaintenanceEntry(userId: string, data: CreateMaintenanceEntryInput) {
  return withRLS(userId, (tx) =>
    tx
      .insert(maintenanceEntries)
      .values({ ownerId: userId, ...data })
      .returning(),
  );
}
