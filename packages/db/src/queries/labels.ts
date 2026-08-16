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

/** Resolves each name to an existing label's id, creating any that don't exist yet — dedupes case-insensitively by name. */
export async function resolveOrCreateLabelIds(userId: string, labelNames: string[]): Promise<string[]> {
  const existing = await listLabels(userId);
  const byName = new Map(existing.map((label) => [label.name.toLowerCase(), label.id]));
  const ids: string[] = [];
  for (const name of labelNames) {
    const key = name.toLowerCase();
    let id = byName.get(key);
    if (!id) {
      const [created] = await createLabel(userId, { name });
      if (!created) continue;
      id = created.id;
      byName.set(key, id);
    }
    ids.push(id);
  }
  return ids;
}
