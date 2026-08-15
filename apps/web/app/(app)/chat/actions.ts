"use server";

import { chatQueries } from "@homebox-ai/db";

import { getSessionUser } from "@homebox-ai/supabase/server";

export async function listChatSessionsAction() {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");

  const sessions = await chatQueries.listChatSessions(user.id);
  return sessions.map((session) => ({
    sessionId: session.sessionId,
    title: session.firstMessage.length > 60 ? `${session.firstMessage.slice(0, 60)}…` : session.firstMessage,
    lastMessageAt: new Date(session.lastMessageAt).toISOString(),
    hasUnread: session.hasUnread,
  }));
}

export async function loadChatSessionAction(sessionId: string) {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");

  const messages = await chatQueries.listChatMessages(user.id, sessionId);
  await chatQueries.markSessionMessagesRead(user.id, sessionId);
  return messages.map((message) => ({ id: message.id, role: message.role, content: message.content }));
}
