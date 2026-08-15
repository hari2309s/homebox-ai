import { and, eq, inArray, isNull, lte, sql } from "drizzle-orm";

import { getDb } from "../client";
import { items, sharedAccess } from "../schema";

export interface ExpiringWarrantyItem {
  id: string;
  name: string;
  ownerId: string;
  warrantyExpires: string | null;
}

/**
 * System-wide scan across every owner's items — deliberately not scoped by
 * withRLS/a single user, since the warranty-check cron has no session to run
 * as. Uses the direct (table-owner) DB connection, like migrations and
 * acceptInvite do.
 */
export async function listItemsWithExpiringWarranty(daysAhead = 30): Promise<ExpiringWarrantyItem[]> {
  const db = getDb();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + daysAhead);
  const cutoffDate = cutoff.toISOString().slice(0, 10);

  return db
    .select({ id: items.id, name: items.name, ownerId: items.ownerId, warrantyExpires: items.warrantyExpires })
    .from(items)
    .where(
      and(
        eq(items.archived, false),
        eq(items.lifetimeWarranty, false),
        isNull(items.warrantyNotifiedAt),
        sql`${items.warrantyExpires} is not null`,
        lte(items.warrantyExpires, cutoffDate),
      ),
    );
}

export async function markWarrantyNotified(itemIds: string[]) {
  if (itemIds.length === 0) return;
  const db = getDb();
  await db.update(items).set({ warrantyNotifiedAt: new Date() }).where(inArray(items.id, itemIds));
}

/** Everyone who should see a notification about this owner's data: the owner plus every shared member. */
export async function listRecipientsForOwner(ownerId: string): Promise<string[]> {
  const db = getDb();
  const members = await db.select({ userId: sharedAccess.memberUserId }).from(sharedAccess).where(eq(sharedAccess.ownerId, ownerId));
  return [ownerId, ...members.map((row) => row.userId)];
}
