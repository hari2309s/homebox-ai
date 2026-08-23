import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";

import { chatMessages } from "../schema";
import { withRLS } from "../rls";

export interface CreateChatMessageInput {
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  /** Set for AI-initiated messages (e.g. a notifier reminder), not replies to something the user asked. */
  isProactive?: boolean;
  /** Deterministic per-notification-event key; a duplicate insert with the same (ownerId, nudgeKey) is a no-op. */
  nudgeKey?: string;
  /** IDs of items whose cover photos appeared inline with this assistant message — persisted so history reload can re-sign the URLs. */
  referencedItemIds?: string[];
}

export function createChatMessage(userId: string, data: CreateChatMessageInput) {
  return withRLS(userId, (tx) =>
    tx
      .insert(chatMessages)
      .values({ ownerId: userId, ...data })
      // Matches the partial unique index on (owner_id, nudge_key) — the
      // `where` here must mirror the index's predicate for Postgres to use
      // it as the conflict target. A duplicate nudge (same owner + key)
      // silently inserts nothing instead of erroring or duplicating.
      .onConflictDoNothing({
        target: [chatMessages.ownerId, chatMessages.nudgeKey],
        where: sql`${chatMessages.nudgeKey} is not null`,
      })
      .returning(),
  );
}

export function listChatMessages(userId: string, sessionId: string) {
  return withRLS(userId, (tx) =>
    tx.select().from(chatMessages).where(eq(chatMessages.sessionId, sessionId)).orderBy(asc(chatMessages.createdAt)),
  );
}

export function listAllChatMessages(userId: string) {
  return withRLS(userId, (tx) =>
    tx
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.ownerId, userId))
      .orderBy(asc(chatMessages.sessionId), asc(chatMessages.createdAt)),
  );
}

export function listChatSessions(userId: string) {
  return withRLS(userId, (tx) =>
    tx
      .select({
        sessionId: chatMessages.sessionId,
        firstMessage: sql<string>`(array_agg(${chatMessages.content} order by ${chatMessages.createdAt} asc))[1]`,
        lastMessageAt: sql<string>`max(${chatMessages.createdAt})`,
        hasUnread: sql<boolean>`bool_or(${chatMessages.isProactive} and ${chatMessages.readAt} is null)`,
      })
      .from(chatMessages)
      .groupBy(chatMessages.sessionId)
      .orderBy(desc(sql`max(${chatMessages.createdAt})`)),
  );
}

export function markSessionMessagesRead(userId: string, sessionId: string) {
  return withRLS(userId, (tx) =>
    tx
      .update(chatMessages)
      .set({ readAt: new Date() })
      .where(and(eq(chatMessages.sessionId, sessionId), eq(chatMessages.ownerId, userId), isNull(chatMessages.readAt))),
  );
}

export async function countUnreadProactiveMessages(userId: string): Promise<number> {
  return withRLS(userId, async (tx) => {
    const [row] = await tx
      .select({ count: sql<number>`count(*)` })
      .from(chatMessages)
      .where(and(eq(chatMessages.ownerId, userId), eq(chatMessages.isProactive, true), isNull(chatMessages.readAt)));
    return Number(row?.count ?? 0);
  });
}
