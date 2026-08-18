import { timingSafeEqual } from "node:crypto";

import { chatQueries, notifierQueries } from "@homebox-ai/db";
import { getModelForTask } from "@homebox-ai/ai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { NextResponse } from "next/server";

import { runTracedGraph } from "../../../../lib/traced-graph";

// Constant-time comparison so a wrong guess can't be distinguished by how
// long the check took — a plain `===` short-circuits on the first mismatched
// byte, which in principle leaks the secret's prefix to a timing attacker.
function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || !authHeader) return false;

  const expected = Buffer.from(`Bearer ${cronSecret}`);
  const actual = Buffer.from(authHeader);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

type ExpiringWarrantyItem = Awaited<ReturnType<typeof notifierQueries.listItemsWithExpiringWarranty>>[number];

async function generateWarrantyReminderMessage(ownerItems: ExpiringWarrantyItem[]): Promise<string> {
  const model = getModelForTask("reasoning");
  const itemList = ownerItems.map((item) => `- ${item.name} (warranty expires ${item.warrantyExpires})`).join("\n");

  const response = await runTracedGraph({ tags: ["notifier", "warranty"], runName: "warranty-notifier" }, (options) =>
    model.invoke(
      [
        new SystemMessage(
          "You are Homebox AI's proactive assistant, writing directly to the user in their chat — this message " +
            "appears unprompted, not as a reply to a question. Write a short, warm, conversational reminder (2-4 " +
            "sentences, no markdown headers or bullet lists) about the items listed, whose warranties are " +
            "expiring soon. Mention the item names and dates naturally in prose.",
        ),
        new HumanMessage(`These items have warranties expiring within 30 days:\n${itemList}`),
      ],
      options,
    ),
  );

  return typeof response.content === "string" ? response.content : String(response.content);
}

/**
 * Meant to be invoked by a scheduler (see vercel.json's cron entry), not a
 * user — Vercel automatically sends `Authorization: Bearer $CRON_SECRET` for
 * configured cron routes, which this checks for instead of a user session.
 */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const expiring = await notifierQueries.listItemsWithExpiringWarranty(30);
  if (expiring.length === 0) return NextResponse.json({ households: 0, itemsNotified: 0 });

  const itemsByOwner = new Map<string, ExpiringWarrantyItem[]>();
  for (const item of expiring) {
    const list = itemsByOwner.get(item.ownerId) ?? [];
    list.push(item);
    itemsByOwner.set(item.ownerId, list);
  }

  const today = new Date().toISOString().slice(0, 10);

  for (const [ownerId, ownerItems] of itemsByOwner) {
    try {
      const message = await generateWarrantyReminderMessage(ownerItems);
      const recipients = await notifierQueries.listRecipientsForOwner(ownerId);
      const sessionId = crypto.randomUUID();
      // One key per household per day — a second run for the same owner on
      // the same day (concurrent execution, a manual retry) inserts nothing
      // instead of a duplicate reminder, backed by the DB's unique index.
      const nudgeKey = `warranty:${ownerId}:${today}`;

      for (const userId of recipients) {
        await chatQueries.createChatMessage(userId, {
          sessionId,
          role: "assistant",
          content: message,
          isProactive: true,
          nudgeKey,
        });
      }

      await notifierQueries.markWarrantyNotified(ownerItems.map((item) => item.id));
    } catch (error) {
      // One household's AI call failing (rate limit, etc.) shouldn't stop the
      // rest — those items are left un-notified (warrantyNotifiedAt still
      // null) so the next run retries them.
      console.error(`warranty-check notifier failed for owner ${ownerId}:`, error);
    }
  }

  return NextResponse.json({ households: itemsByOwner.size, itemsNotified: expiring.length });
}
