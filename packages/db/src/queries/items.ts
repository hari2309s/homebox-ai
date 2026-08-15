import { and, eq, ilike, sql } from "drizzle-orm";

import { getEffectiveOwnerId } from "../access";
import { items } from "../schema";
import { withRLS, type Tx } from "../rls";

export interface SearchItemsFilters {
  query?: string;
  locationId?: string;
  /** Archived items are hidden by default — pass true to include them (e.g. an "Archived" filter view). */
  includeArchived?: boolean;
}

export function searchItems(userId: string, filters: SearchItemsFilters = {}) {
  return withRLS(userId, async (tx) => {
    const ownerId = await getEffectiveOwnerId(tx, userId);
    const conditions = [eq(items.ownerId, ownerId)];
    if (filters.query) conditions.push(ilike(items.name, `%${filters.query}%`));
    if (filters.locationId) conditions.push(eq(items.locationId, filters.locationId));
    if (!filters.includeArchived) conditions.push(eq(items.archived, false));
    return tx
      .select()
      .from(items)
      .where(and(...conditions));
  });
}

export function getItem(userId: string, itemId: string) {
  return withRLS(userId, async (tx) => {
    const ownerId = await getEffectiveOwnerId(tx, userId);
    const rows = await tx
      .select()
      .from(items)
      .where(and(eq(items.id, itemId), eq(items.ownerId, ownerId)));
    return rows[0] ?? null;
  });
}

export function listChildItems(userId: string, parentItemId: string) {
  return withRLS(userId, async (tx) => {
    const ownerId = await getEffectiveOwnerId(tx, userId);
    return tx
      .select()
      .from(items)
      .where(and(eq(items.parentItemId, parentItemId), eq(items.ownerId, ownerId)));
  });
}

// Per-owner sequential numbering (not a global sequence), so each user's asset
// IDs start at 1 regardless of how many items other owners have.
async function nextAssetId(tx: Tx, ownerId: string): Promise<number> {
  const [row] = await tx
    .select({ next: sql<number>`coalesce(max(${items.assetId}), 0) + 1` })
    .from(items)
    .where(eq(items.ownerId, ownerId));
  return row?.next ?? 1;
}

export interface CreateItemInput {
  name: string;
  description?: string;
  quantity?: number;
  serialNumber?: string;
  modelNumber?: string;
  manufacturer?: string;
  insured?: boolean;
  lifetimeWarranty?: boolean;
  purchasePrice?: string;
  purchaseDate?: string;
  purchaseFrom?: string;
  salePrice?: string;
  saleDate?: string;
  warrantyExpires?: string;
  locationId?: string | null;
  parentItemId?: string | null;
  notes?: string;
}

export function createItem(userId: string, data: CreateItemInput) {
  return withRLS(userId, async (tx) => {
    const ownerId = await getEffectiveOwnerId(tx, userId);
    const assetId = await nextAssetId(tx, ownerId);
    return tx
      .insert(items)
      .values({ ownerId, assetId, ...data })
      .returning();
  });
}

export interface UpdateItemInput {
  name?: string;
  description?: string | null;
  quantity?: number;
  serialNumber?: string | null;
  modelNumber?: string | null;
  manufacturer?: string | null;
  insured?: boolean;
  archived?: boolean;
  lifetimeWarranty?: boolean;
  purchasePrice?: string | null;
  purchaseDate?: string | null;
  purchaseFrom?: string | null;
  salePrice?: string | null;
  saleDate?: string | null;
  soldTo?: string | null;
  soldNotes?: string | null;
  warrantyExpires?: string | null;
  locationId?: string | null;
  parentItemId?: string | null;
  notes?: string | null;
}

export function updateItem(userId: string, itemId: string, data: UpdateItemInput) {
  return withRLS(userId, async (tx) => {
    const ownerId = await getEffectiveOwnerId(tx, userId);
    const [existing] = await tx
      .select({ assetId: items.assetId })
      .from(items)
      .where(and(eq(items.id, itemId), eq(items.ownerId, ownerId)));
    const assetId = existing?.assetId ?? (await nextAssetId(tx, ownerId));
    // Editing the warranty date makes any earlier expiry notification stale —
    // reset it so the notifier re-evaluates against the new date.
    const warrantyNotifiedAt = "warrantyExpires" in data ? null : undefined;

    return tx
      .update(items)
      .set({ ...data, assetId, warrantyNotifiedAt, updatedAt: new Date() })
      .where(and(eq(items.id, itemId), eq(items.ownerId, ownerId)))
      .returning();
  });
}

export function deleteItem(userId: string, itemId: string) {
  return withRLS(userId, async (tx) => {
    const ownerId = await getEffectiveOwnerId(tx, userId);
    return tx.delete(items).where(and(eq(items.id, itemId), eq(items.ownerId, ownerId)));
  });
}
