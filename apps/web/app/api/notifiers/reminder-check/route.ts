import { chatQueries, notifierQueries, reminderQueries } from "@homebox-ai/db";
import { getModelForTask } from "@homebox-ai/ai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { NextResponse } from "next/server";

import { mapWithConcurrency } from "../../../../lib/concurrency";
import { isCronRequestAuthorized } from "../../../../lib/cron-auth";
import { groupRemindersForNotification } from "../../../../lib/reminder-notification-groups";
import { runTracedGraph } from "../../../../lib/traced-graph";

/** At most 3 concurrent LLM calls per cron run — avoids spiking provider rate limits when many reminder groups fire at once. */
const LLM_CONCURRENCY = 3;

// How many days out a reminder needs to be due before it gets nudged.
const LEAD_DAYS = 3;

type UpcomingReminder = Awaited<ReturnType<typeof reminderQueries.listUpcomingReminders>>[number];

async function generateReminderNudgeMessage(dueReminders: UpcomingReminder[]): Promise<string> {
  const model = getModelForTask("reasoning");
  const list = dueReminders
    .map(
      (r) =>
        `- ${r.title}${r.itemName ? ` (${r.itemName})` : ""}, due ${r.dueDate}${r.description ? `: ${r.description}` : ""}`,
    )
    .join("\n");

  const response = await runTracedGraph({ tags: ["notifier", "reminder"], runName: "reminder-notifier" }, (options) =>
    model.invoke(
      [
        new SystemMessage(
          "You are Homebox AI's proactive assistant, writing directly to the user in their chat — this message " +
            "appears unprompted, not as a reply to a question. Write a short, warm, conversational reminder (2-4 " +
            `sentences, no markdown headers or bullet lists) about the household tasks listed below, due within the next ${LEAD_DAYS} days. ` +
            "Mention the task names and dates naturally in prose.",
        ),
        new HumanMessage(`These reminders are coming up soon:\n${list}`),
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

  const upcoming = await reminderQueries.listUpcomingReminders(LEAD_DAYS);
  if (upcoming.length === 0) return NextResponse.json({ groups: 0, remindersNotified: 0 });

  // Only unassigned reminders need a household's member list resolved — an
  // assigned reminder's sole recipient is already known.
  const ownerIdsNeedingHousehold = [...new Set(upcoming.filter((r) => !r.assignedToUserId).map((r) => r.ownerId))];
  const recipientsByOwner = new Map<string, string[]>(
    await Promise.all(
      ownerIdsNeedingHousehold.map(
        async (ownerId) => [ownerId, await notifierQueries.listRecipientsForOwner(ownerId)] as const,
      ),
    ),
  );
  const groupsByKey = groupRemindersForNotification(upcoming, recipientsByOwner);

  const today = new Date().toISOString().slice(0, 10);

  // Bounded concurrency so a large number of groups doesn't spike provider
  // rate limits. Each group is independent; failures are caught per-group so
  // one error doesn't stop the rest.
  const groups = Array.from(groupsByKey.values());
  const results = await mapWithConcurrency(groups, LLM_CONCURRENCY, async (group) => {
    try {
      const message = await generateReminderNudgeMessage(group.reminders);
      const sessionId = crypto.randomUUID();

      // Sequential on purpose: if any recipient's send fails partway through,
      // the whole group's reminders stay un-notified below so the next run
      // retries all of them — a recipient who already got the message today
      // may see it again on retry, but nobody in the group is silently
      // skipped forever (the bug this replaces: marking a reminder notified
      // as soon as any one of its several recipients succeeded).
      for (const userId of group.recipients) {
        // One key per recipient per day — a second run for the same person on
        // the same day (concurrent execution, a manual retry) inserts nothing
        // instead of a duplicate reminder, backed by the DB's unique index.
        const nudgeKey = `reminder:${userId}:${today}`;
        await chatQueries.createChatMessage(userId, {
          sessionId,
          role: "assistant",
          content: message,
          isProactive: true,
          nudgeKey,
        });
      }

      return group.reminders.map((reminder) => reminder.id);
    } catch (error) {
      // One group's AI call or send failing (rate limit, etc.) shouldn't stop
      // the rest — its reminders are left un-notified so the next run retries them.
      console.error(`reminder-check notifier failed for recipients [${group.recipients.join(", ")}]:`, error);
      return [];
    }
  });

  const notifiedReminderIds = results.flat();

  await reminderQueries.markRemindersNotified(notifiedReminderIds);
  return NextResponse.json({ groups: groupsByKey.size, remindersNotified: notifiedReminderIds.length });
}
