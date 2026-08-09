import { createChatSearchGraph, createLangfuseHandler } from "@homebox-ai/ai";
import { HumanMessage } from "@langchain/core/messages";
import { NextResponse, after } from "next/server";

import { getSessionUser } from "@homebox-ai/supabase/server";

import { langfuseSpanProcessor } from "../../../instrumentation-node";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { message, sessionId } = (await request.json()) as { message?: string; sessionId?: string };
  if (!message) return NextResponse.json({ error: "message is required" }, { status: 400 });

  const langfuseHandler = createLangfuseHandler({
    userId: user.id,
    sessionId: sessionId ?? crypto.randomUUID(),
    tags: ["chat"],
  });

  const graph = createChatSearchGraph(user.id);
  const result = await graph.invoke(
    { messages: [new HumanMessage(message)] },
    { callbacks: [langfuseHandler], runName: "chat-search" },
  );
  const lastMessage = result.messages.at(-1);

  after(async () => {
    await langfuseSpanProcessor.forceFlush();
  });

  return NextResponse.json({ reply: lastMessage?.content ?? "" });
}
