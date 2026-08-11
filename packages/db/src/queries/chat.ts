import { asc, desc, eq, sql } from "drizzle-orm";

import { chatMessages } from "../schema";
import { withRLS } from "../rls";

export interface CreateChatMessageInput {
  sessionId: string;
  role: "user" | "assistant";
  content: string;
}

export function createChatMessage(userId: string, data: CreateChatMessageInput) {
  return withRLS(userId, (tx) =>
    tx
      .insert(chatMessages)
      .values({ ownerId: userId, ...data })
      .returning(),
  );
}

export function listChatMessages(userId: string, sessionId: string) {
  return withRLS(userId, (tx) =>
    tx
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(asc(chatMessages.createdAt)),
  );
}

export function listChatSessions(userId: string) {
  return withRLS(userId, (tx) =>
    tx
      .select({
        sessionId: chatMessages.sessionId,
        firstMessage: sql<string>`(array_agg(${chatMessages.content} order by ${chatMessages.createdAt} asc))[1]`,
        lastMessageAt: sql<string>`max(${chatMessages.createdAt})`,
      })
      .from(chatMessages)
      .groupBy(chatMessages.sessionId)
      .orderBy(desc(sql`max(${chatMessages.createdAt})`)),
  );
}
