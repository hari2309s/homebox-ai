export const maxDuration = 60;

import { createChatSearchGraph, pendingActionSchema, type PendingAction } from "@homebox-ai/ai";
import { chatQueries } from "@homebox-ai/db";
import { AIMessage, HumanMessage, ToolMessage, type BaseMessage } from "@langchain/core/messages";
import { NextResponse } from "next/server";

import { createSupabaseServerClient, getSessionUser } from "@homebox-ai/supabase/server";
import { getAttachmentSignedUrls } from "@homebox-ai/supabase/storage";

import { runTracedGraph } from "../../../lib/traced-graph";

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

export interface ReferencedItem {
  id: string;
  name: string;
  photoUrl: string;
}

/**
 * Scans tool-call results for items that have a primary photo. Used to surface
 * cover photos alongside the AI's text response in the chat UI.
 * Capped at 5 — a long multi-item list doesn't need a photo strip.
 */
function extractItemsWithPhotos(
  messages: readonly BaseMessage[],
): { id: string; name: string; primaryPhotoPath: string }[] {
  const found: { id: string; name: string; primaryPhotoPath: string }[] = [];
  const seenIds = new Set<string>();

  for (const message of messages) {
    if (!(message instanceof ToolMessage) || typeof message.content !== "string") continue;
    try {
      const parsed = JSON.parse(message.content);
      const candidates = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of candidates) {
        if (
          typeof item?.id === "string" &&
          typeof item?.name === "string" &&
          typeof item?.primaryPhotoPath === "string" &&
          !seenIds.has(item.id)
        ) {
          seenIds.add(item.id);
          found.push({ id: item.id, name: item.name, primaryPhotoPath: item.primaryPhotoPath });
          if (found.length >= 5) return found;
        }
      }
    } catch {
      // Not JSON or not item data — skip.
    }
  }
  return found;
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { message, sessionId: rawSessionId, isContinuation } = (await request.json()) as {
    message?: string;
    sessionId?: string;
    /** True when the client is auto-invoking the agent after a confirmed action to continue a multi-step request. The synthetic "Continue." prompt is not saved to the chat history — only the agent's follow-up response is stored, keeping the history coherent. */
    isContinuation?: boolean;
  };
  if (!message) return NextResponse.json({ error: "message is required" }, { status: 400 });

  const sessionId = rawSessionId ?? crypto.randomUUID();

  try {
    const history = await chatQueries.listChatMessages(user.id, sessionId);
    const historyMessages = history.map((entry) =>
      entry.role === "user" ? new HumanMessage(entry.content) : new AIMessage(entry.content),
    );

    const displayName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : undefined;
    const graph = createChatSearchGraph(user.id, { displayName });
    const result = await runTracedGraph(
      { userId: user.id, sessionId, tags: ["chat"], runName: "chat-search" },
      (options) => graph.invoke({ messages: [...historyMessages, new HumanMessage(message)] }, options),
    );
    const lastMessage = result.messages.at(-1);
    const reply = typeof lastMessage?.content === "string" ? lastMessage.content : "";
    // Ephemeral by design — only this response carries it, not chat_messages,
    // so a reloaded conversation shows the assistant's description of what it
    // proposed but not a still-actionable card for an old, possibly-stale turn.
    const pendingAction = extractPendingAction(result.messages);

    // Gather items with cover photos from this turn's tool results so the chat
    // UI can render thumbnails alongside the reply. Signed URLs are generated
    // here (one batch call) rather than client-side to keep auth server-scoped.
    // Ephemeral — like pendingAction, not saved to chat_messages.
    const itemsWithPhotos = extractItemsWithPhotos(result.messages);
    let referencedItems: ReferencedItem[] = [];
    if (itemsWithPhotos.length > 0) {
      const supabase = await createSupabaseServerClient();
      const urlMap = await getAttachmentSignedUrls(
        supabase,
        itemsWithPhotos.map((i) => i.primaryPhotoPath),
      );
      referencedItems = itemsWithPhotos.flatMap((item) => {
        const photoUrl = urlMap.get(item.primaryPhotoPath);
        return photoUrl ? [{ id: item.id, name: item.name, photoUrl }] : [];
      });
    }

    // Continuation messages are synthetic ("Continue.") — not real user input, so
    // omitting them keeps the saved history clean and coherent on reload.
    if (!isContinuation) await chatQueries.createChatMessage(user.id, { sessionId, role: "user", content: message });
    if (reply) {
      await chatQueries.createChatMessage(user.id, {
        sessionId,
        role: "assistant",
        content: reply,
        referencedItemIds: referencedItems.length > 0 ? referencedItems.map((i) => i.id) : undefined,
      });
    }

    return NextResponse.json({ reply, sessionId, pendingAction, referencedItems });
  } catch (error) {
    console.error("chat-search graph failed:", error);
    return NextResponse.json(
      { error: "The assistant is temporarily unavailable. Try again shortly." },
      { status: 502 },
    );
  }
}
