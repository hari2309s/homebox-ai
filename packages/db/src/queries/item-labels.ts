import { eq } from "drizzle-orm";

import { itemLabels, items } from "../schema";
import { withRLS } from "../rls";

// RLS on item_labels checks ownership via the referenced items/labels rows
// (see packages/db/src/policies/item_labels.sql), so it's still safe to
// scope every call through withRLS even though this table has no owner_id.

export function setItemLabels(userId: string, itemId: string, labelIds: string[]) {
  return withRLS(userId, async (tx) => {
    await tx.delete(itemLabels).where(eq(itemLabels.itemId, itemId));
    if (labelIds.length === 0) return [];
    return tx
      .insert(itemLabels)
      .values(labelIds.map((labelId) => ({ itemId, labelId })))
      .returning();
  });
}

export function listLabelsForItem(userId: string, itemId: string) {
  return withRLS(userId, (tx) => tx.select().from(itemLabels).where(eq(itemLabels.itemId, itemId)));
}

export function listAllItemLabelsForUser(userId: string) {
  return withRLS(userId, (tx) =>
    tx
      .select({ itemId: itemLabels.itemId, labelId: itemLabels.labelId })
      .from(itemLabels)
      .innerJoin(items, eq(itemLabels.itemId, items.id))
      .where(eq(items.ownerId, userId)),
  );
}
