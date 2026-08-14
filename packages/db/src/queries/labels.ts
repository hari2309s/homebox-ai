import { and, eq } from "drizzle-orm";

import { labels } from "../schema";
import { withRLS } from "../rls";

export function listLabels(userId: string) {
  return withRLS(userId, (tx) => tx.select().from(labels).where(eq(labels.ownerId, userId)));
}

export function createLabel(userId: string, data: { name: string }) {
  return withRLS(userId, (tx) => tx.insert(labels).values({ ownerId: userId, name: data.name }).returning());
}

export function updateLabel(userId: string, labelId: string, data: { name: string }) {
  return withRLS(userId, (tx) =>
    tx
      .update(labels)
      .set({ name: data.name })
      .where(and(eq(labels.id, labelId), eq(labels.ownerId, userId)))
      .returning(),
  );
}

export function deleteLabel(userId: string, labelId: string) {
  return withRLS(userId, (tx) => tx.delete(labels).where(and(eq(labels.id, labelId), eq(labels.ownerId, userId))));
}
