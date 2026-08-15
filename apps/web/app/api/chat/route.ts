import { createChatSearchGraph, createLangfuseHandler } from "@homebox-ai/ai";
import { chatQueries } from "@homebox-ai/db";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { NextResponse, after } from "next/server";

import { getSessionUser } from "@homebox-ai/supabase/server";

import { langfuseSpanProcessor } from "../../../instrumentation-node";

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

    await chatQueries.createChatMessage(user.id, { sessionId, role: "user", content: message });
    if (reply) await chatQueries.createChatMessage(user.id, { sessionId, role: "assistant", content: reply });

    return NextResponse.json({ reply, sessionId });
  } catch (error) {
    console.error("chat-search graph failed:", error);
    return NextResponse.json({ error: "The assistant is temporarily unavailable. Try again shortly." }, { status: 502 });
  }
}
