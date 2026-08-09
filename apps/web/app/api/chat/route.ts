import { createChatSearchGraph } from "@homebox-ai/ai";
import { HumanMessage } from "@langchain/core/messages";
import { NextResponse } from "next/server";

import { getSessionUser } from "@homebox-ai/supabase/server";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { message } = (await request.json()) as { message?: string };
  if (!message) return NextResponse.json({ error: "message is required" }, { status: 400 });

  const graph = createChatSearchGraph(user.id);
  const result = await graph.invoke({ messages: [new HumanMessage(message)] });
  const lastMessage = result.messages.at(-1);

  return NextResponse.json({ reply: lastMessage?.content ?? "" });
}
