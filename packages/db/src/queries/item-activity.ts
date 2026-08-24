import { desc, eq } from "drizzle-orm";

import { getEffectiveOwnerId } from "../access";
import { itemActivity } from "../schema";
import { withRLS } from "../rls";

export interface RecordItemActivityInput {
  itemName: string;
  action: "created" | "updated" | "deleted";
  itemId?: string;
}

/** Appends one row to the household's item activity log — called by every item create/update/delete so the home page feed reflects it, including deletions. */
export function recordItemActivity(userId: string, data: RecordItemActivityInput) {
  return withRLS(userId, async (tx) => {
    const ownerId = await getEffectiveOwnerId(tx, userId);
    await tx.insert(itemActivity).values({ ownerId, actorId: userId, ...data });
  });
}

/** Most recent item lifecycle events — used for the home page activity feed. */
export function listRecentItemActivity(userId: string, limit = 5) {
  return withRLS(userId, async (tx) => {
    const ownerId = await getEffectiveOwnerId(tx, userId);
    return tx
      .select()
      .from(itemActivity)
      .where(eq(itemActivity.ownerId, ownerId))
      .orderBy(desc(itemActivity.createdAt))
      .limit(limit);
  });
}
