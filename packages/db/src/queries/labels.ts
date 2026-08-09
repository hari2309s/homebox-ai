import { eq } from "drizzle-orm";

import { labels } from "../schema";
import { withRLS } from "../rls";

export function listLabels(userId: string) {
  return withRLS(userId, (tx) => tx.select().from(labels).where(eq(labels.ownerId, userId)));
}

export function createLabel(userId: string, data: { name: string }) {
  return withRLS(userId, (tx) => tx.insert(labels).values({ ownerId: userId, name: data.name }).returning());
}
