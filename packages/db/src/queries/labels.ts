import { and, eq } from "drizzle-orm";

import { getEffectiveOwnerId } from "../access";
import { labels } from "../schema";
import { withRLS } from "../rls";

export function listLabels(userId: string) {
  return withRLS(userId, async (tx) => {
    const ownerId = await getEffectiveOwnerId(tx, userId);
    return tx.select().from(labels).where(eq(labels.ownerId, ownerId));
  });
}

export function createLabel(userId: string, data: { name: string; color?: string | null }) {
  return withRLS(userId, async (tx) => {
    const ownerId = await getEffectiveOwnerId(tx, userId);
    return tx
      .insert(labels)
      .values({ ownerId, name: data.name, color: data.color ?? null })
      .returning();
  });
}

export function updateLabel(userId: string, labelId: string, data: { name: string; color?: string | null }) {
  return withRLS(userId, async (tx) => {
    const ownerId = await getEffectiveOwnerId(tx, userId);
    return tx
      .update(labels)
      .set({ name: data.name, color: data.color ?? null })
      .where(and(eq(labels.id, labelId), eq(labels.ownerId, ownerId)))
      .returning();
  });
}

export function deleteLabel(userId: string, labelId: string) {
  return withRLS(userId, async (tx) => {
    const ownerId = await getEffectiveOwnerId(tx, userId);
    return tx.delete(labels).where(and(eq(labels.id, labelId), eq(labels.ownerId, ownerId)));
  });
}
