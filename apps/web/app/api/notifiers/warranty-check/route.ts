import { chatQueries, notifierQueries } from "@homebox-ai/db";
import { getModelForTask } from "@homebox-ai/ai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { NextResponse } from "next/server";

import { mapWithConcurrency } from "../../../../lib/concurrency";
import { isCronRequestAuthorized } from "../../../../lib/cron-auth";
import { runTracedGraph } from "../../../../lib/traced-graph";

/** At most 3 concurrent LLM calls per cron run — avoids spiking provider rate limits when many households have expiring warranties. */
const LLM_CONCURRENCY = 3;

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

export async function POST(request: Request) {
  if (!isCronRequestAuthorized(request)) {
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
  const owners = Array.from(itemsByOwner.entries());

  // Bounded concurrency so a large number of households doesn't spike
  // provider rate limits. Each owner's call is independent; failures are
  // caught per-owner so one household's error doesn't stop the rest.
  const results = await mapWithConcurrency(owners, LLM_CONCURRENCY, async ([ownerId, ownerItems]) => {
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

      return ownerItems.map((item) => item.id);
    } catch (error) {
      // One household's AI call failing (rate limit, etc.) shouldn't stop the
      // rest — those items are left un-notified (warrantyNotifiedAt still
      // null) so the next run retries them.
      console.error(`warranty-check notifier failed for owner ${ownerId}:`, error);
      return [];
    }
  });

  const notifiedItemIds = results.flat();

  await notifierQueries.markWarrantyNotified(notifiedItemIds);
  return NextResponse.json({ households: itemsByOwner.size, itemsNotified: notifiedItemIds.length });
}
