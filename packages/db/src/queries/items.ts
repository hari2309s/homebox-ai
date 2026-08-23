import { and, count, eq, ilike, lte, sql } from "drizzle-orm";

import { getEffectiveOwnerId } from "../access";
import { wouldFormCycle } from "../cycle";
import { attachments, items } from "../schema";
import { withRLS, type Tx } from "../rls";

export interface SearchItemsFilters {
  query?: string;
  locationId?: string;
  /** Archived items are hidden by default — pass true to include them (e.g. an "Archived" filter view). */
  includeArchived?: boolean;
}

/** Lightweight count of active (non-archived) items — use on the dashboard instead of fetching all rows. */
export function countItems(userId: string): Promise<number> {
  return withRLS(userId, async (tx) => {
    const ownerId = await getEffectiveOwnerId(tx, userId);
    const [row] = await tx
      .select({ n: count() })
      .from(items)
      .where(and(eq(items.ownerId, ownerId), eq(items.archived, false)));
    return row?.n ?? 0;
  });
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

/** Like searchItems but also returns each item's primary photo storage path (null if none). Used for the grid view on the items list page. */
export function searchItemsWithPrimaryPhoto(userId: string, filters: SearchItemsFilters = {}) {
  return withRLS(userId, async (tx) => {
    const ownerId = await getEffectiveOwnerId(tx, userId);
    const conditions = [eq(items.ownerId, ownerId)];
    if (filters.query) conditions.push(ilike(items.name, `%${filters.query}%`));
    if (filters.locationId) conditions.push(eq(items.locationId, filters.locationId));
    if (!filters.includeArchived) conditions.push(eq(items.archived, false));
    return tx
      .select({
        id: items.id,
        name: items.name,
        locationId: items.locationId,
        assetId: items.assetId,
        archived: items.archived,
        currency: items.currency,
        purchasePrice: items.purchasePrice,
        primaryPhotoPath: attachments.storagePath,
      })
      .from(items)
      .leftJoin(attachments, and(eq(attachments.itemId, items.id), eq(attachments.isPrimary, true)))
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

/** Like getItem but also returns the primary photo storage path — used by the AI search tools so the chat UI can show cover photos. */
export function getItemWithPrimaryPhoto(userId: string, itemId: string) {
  return withRLS(userId, async (tx) => {
    const ownerId = await getEffectiveOwnerId(tx, userId);
    const rows = await tx
      .select({
        id: items.id,
        name: items.name,
        locationId: items.locationId,
        assetId: items.assetId,
        archived: items.archived,
        currency: items.currency,
        purchasePrice: items.purchasePrice,
        description: items.description,
        quantity: items.quantity,
        warrantyExpires: items.warrantyExpires,
        primaryPhotoPath: attachments.storagePath,
      })
      .from(items)
      .leftJoin(attachments, and(eq(attachments.itemId, items.id), eq(attachments.isPrimary, true)))
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
// IDs start at 1 regardless of how many items other owners have. The
// transaction-scoped advisory lock (auto-released at commit/rollback) closes
// the read-then-insert race between two concurrent createItem calls for the
// same owner — without it, both could read the same max() and insert the
// same assetId.
async function nextAssetId(tx: Tx, ownerId: string): Promise<number> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${ownerId})::bigint)`);
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
  currency?: string;
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
  currency?: string;
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

// Same reasoning as locations.ts: without this, an item can be re-parented
// under its own descendant, making the containment chain circular (item A
// contains B contains A). Nothing currently recurses over this chain the way
// /locations does, but it's a nonsensical, unrecoverable state to allow
// regardless — better to reject it at the write. See ../cycle.ts.
async function getParentItemId(tx: Tx, ownerId: string, itemId: string): Promise<string | null> {
  const [row] = await tx
    .select({ parentItemId: items.parentItemId })
    .from(items)
    .where(and(eq(items.id, itemId), eq(items.ownerId, ownerId)));
  return row?.parentItemId ?? null;
}

export function updateItem(userId: string, itemId: string, data: UpdateItemInput) {
  return withRLS(userId, async (tx) => {
    const ownerId = await getEffectiveOwnerId(tx, userId);
    if (
      data.parentItemId &&
      (await wouldFormCycle(itemId, data.parentItemId, (id) => getParentItemId(tx, ownerId, id)))
    ) {
      throw new Error("Can't move an item inside itself or one of its own sub-items.");
    }
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

export interface CurrencyTotal {
  currency: string;
  total: string;
}

/** Sum of purchasePrice per currency, across active (non-archived) items — the dashboard's "what you own is worth" tiles, one per currency actually in use. */
export function getInventoryValueByCurrency(userId: string): Promise<CurrencyTotal[]> {
  return withRLS(userId, async (tx) => {
    const ownerId = await getEffectiveOwnerId(tx, userId);
    return tx
      .select({ currency: items.currency, total: sql<string>`sum(${items.purchasePrice})` })
      .from(items)
      .where(and(eq(items.ownerId, ownerId), eq(items.archived, false), sql`${items.purchasePrice} is not null`))
      .groupBy(items.currency);
  });
}

export interface UpcomingWarrantyExpiration {
  id: string;
  name: string;
  warrantyExpires: string | null;
}

/** User-scoped counterpart to notifierQueries.listItemsWithExpiringWarranty (that one is a system-wide cron scan) — for the dashboard's "expiring soon" list. */
export function listUpcomingWarrantyExpirations(userId: string, daysAhead = 60): Promise<UpcomingWarrantyExpiration[]> {
  return withRLS(userId, async (tx) => {
    const ownerId = await getEffectiveOwnerId(tx, userId);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysAhead);
    const cutoffDate = cutoff.toISOString().slice(0, 10);
    return tx
      .select({ id: items.id, name: items.name, warrantyExpires: items.warrantyExpires })
      .from(items)
      .where(
        and(
          eq(items.ownerId, ownerId),
          eq(items.archived, false),
          eq(items.lifetimeWarranty, false),
          sql`${items.warrantyExpires} is not null`,
          lte(items.warrantyExpires, cutoffDate),
        ),
      )
      .orderBy(items.warrantyExpires);
  });
}
