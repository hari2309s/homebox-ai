import { and, eq, ilike } from "drizzle-orm";

import { items } from "../schema";
import { withRLS } from "../rls";

export interface SearchItemsFilters {
  query?: string;
  locationId?: string;
}

export function searchItems(userId: string, filters: SearchItemsFilters = {}) {
  return withRLS(userId, (tx) => {
    const conditions = [eq(items.ownerId, userId)];
    if (filters.query) conditions.push(ilike(items.name, `%${filters.query}%`));
    if (filters.locationId) conditions.push(eq(items.locationId, filters.locationId));
    return tx
      .select()
      .from(items)
      .where(and(...conditions));
  });
}

export function getItem(userId: string, itemId: string) {
  return withRLS(userId, async (tx) => {
    const rows = await tx
      .select()
      .from(items)
      .where(and(eq(items.id, itemId), eq(items.ownerId, userId)));
    return rows[0] ?? null;
  });
}

export interface CreateItemInput {
  name: string;
  description?: string;
  quantity?: number;
  purchasePrice?: string;
  purchaseDate?: string;
  warrantyExpires?: string;
  locationId?: string | null;
  notes?: string;
}

export function createItem(userId: string, data: CreateItemInput) {
  return withRLS(userId, (tx) =>
    tx
      .insert(items)
      .values({ ownerId: userId, ...data })
      .returning(),
  );
}

export function updateItem(userId: string, itemId: string, data: Partial<CreateItemInput>) {
  return withRLS(userId, (tx) =>
    tx
      .update(items)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(items.id, itemId), eq(items.ownerId, userId)))
      .returning(),
  );
}

export function deleteItem(userId: string, itemId: string) {
  return withRLS(userId, (tx) =>
    tx.delete(items).where(and(eq(items.id, itemId), eq(items.ownerId, userId))),
  );
}
