import { createChatSearchGraph, createLangfuseHandler, pendingActionSchema, type PendingAction } from "@homebox-ai/ai";
import { chatQueries } from "@homebox-ai/db";
import { AIMessage, HumanMessage, ToolMessage, type BaseMessage } from "@langchain/core/messages";
import { NextResponse, after } from "next/server";

import { getSessionUser } from "@homebox-ai/supabase/server";

import { langfuseSpanProcessor } from "../../../instrumentation-node";

/**
 * The mutating chat tools (create_location, create_item, etc.) never write
 * to the database themselves — they return a `pendingAction` proposal, which
 * the client renders as a confirm/cancel card. Scans backward for the most
 * recent one in this turn's tool-call trace (there's normally at most one —
 * the system prompt tells the model to propose a single action per turn).
 */
function extractPendingAction(messages: readonly BaseMessage[]): PendingAction | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (!(message instanceof ToolMessage) || typeof message.content !== "string") continue;
    try {
      const parsed = JSON.parse(message.content);
      if (!parsed?.pendingAction) continue;
      const validated = pendingActionSchema.safeParse(parsed.pendingAction);
      if (validated.success) return validated.data;
    } catch {
      // Not JSON, or not a pending action — keep scanning earlier messages.
    }
  }
  return undefined;
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { message, sessionId: rawSessionId } = (await request.json()) as { message?: string; sessionId?: string };
  if (!message) return NextResponse.json({ error: "message is required" }, { status: 400 });

  const sessionId = rawSessionId ?? crypto.randomUUID();

  const langfuseHandler = createLangfuseHandler({
    userId: user.id,
    sessionId,
    tags: ["chat"],
  });

  after(async () => {
    await langfuseSpanProcessor.forceFlush();
  });

  try {
    const history = await chatQueries.listChatMessages(user.id, sessionId);
    const historyMessages = history.map((entry) =>
      entry.role === "user" ? new HumanMessage(entry.content) : new AIMessage(entry.content),
    );

    const displayName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : undefined;
    const graph = createChatSearchGraph(user.id, { displayName });
    const result = await graph.invoke(
      { messages: [...historyMessages, new HumanMessage(message)] },
      { callbacks: [langfuseHandler], runName: "chat-search" },
    );
    const lastMessage = result.messages.at(-1);
    const reply = typeof lastMessage?.content === "string" ? lastMessage.content : "";
    // Ephemeral by design — only this response carries it, not chat_messages,
    // so a reloaded conversation shows the assistant's description of what it
    // proposed but not a still-actionable card for an old, possibly-stale turn.
    const pendingAction = extractPendingAction(result.messages);

    await chatQueries.createChatMessage(user.id, { sessionId, role: "user", content: message });
    if (reply) await chatQueries.createChatMessage(user.id, { sessionId, role: "assistant", content: reply });

    return NextResponse.json({ reply, sessionId, pendingAction });
  } catch (error) {
    console.error("chat-search graph failed:", error);
    return NextResponse.json(
      { error: "The assistant is temporarily unavailable. Try again shortly." },
      { status: 502 },
    );
  }
}
