import { timingSafeEqual } from "node:crypto";

import { chatQueries, notifierQueries, reminderQueries } from "@homebox-ai/db";
import { getModelForTask } from "@homebox-ai/ai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { NextResponse } from "next/server";

import { runTracedGraph } from "../../../../lib/traced-graph";

// How many days out a reminder needs to be due before it gets nudged.
const LEAD_DAYS = 3;

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

type UpcomingReminder = Awaited<ReturnType<typeof reminderQueries.listUpcomingReminders>>[number];

async function generateReminderNudgeMessage(dueReminders: UpcomingReminder[]): Promise<string> {
  const model = getModelForTask("reasoning");
  const list = dueReminders
    .map((r) => `- ${r.title}${r.itemName ? ` (${r.itemName})` : ""}, due ${r.dueDate}${r.description ? `: ${r.description}` : ""}`)
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

/**
 * Meant to be invoked by a scheduler (see vercel.json's cron entry), not a
 * user — Vercel automatically sends `Authorization: Bearer $CRON_SECRET` for
 * configured cron routes, which this checks for instead of a user session.
 */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const upcoming = await reminderQueries.listUpcomingReminders(LEAD_DAYS);
  if (upcoming.length === 0) return NextResponse.json({ recipients: 0, remindersNotified: 0 });

  // A reminder assigned to someone specific nudges just them; an unassigned
  // one nudges the whole household, same as the warranty notifier does.
  const recipientsByOwner = new Map<string, string[]>();
  async function recipientsForOwner(ownerId: string): Promise<string[]> {
    const cached = recipientsByOwner.get(ownerId);
    if (cached) return cached;
    const recipients = await notifierQueries.listRecipientsForOwner(ownerId);
    recipientsByOwner.set(ownerId, recipients);
    return recipients;
  }

  const remindersByRecipient = new Map<string, UpcomingReminder[]>();
  for (const reminder of upcoming) {
    const recipients = reminder.assignedToUserId ? [reminder.assignedToUserId] : await recipientsForOwner(reminder.ownerId);
    for (const userId of recipients) {
      const list = remindersByRecipient.get(userId) ?? [];
      list.push(reminder);
      remindersByRecipient.set(userId, list);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const notifiedReminderIds = new Set<string>();

  for (const [userId, userReminders] of remindersByRecipient) {
    try {
      const message = await generateReminderNudgeMessage(userReminders);
      // One key per recipient per day — a second run for the same person on
      // the same day (concurrent execution, a manual retry) inserts nothing
      // instead of a duplicate reminder, backed by the DB's unique index.
      const nudgeKey = `reminder:${userId}:${today}`;

      await chatQueries.createChatMessage(userId, {
        sessionId: crypto.randomUUID(),
        role: "assistant",
        content: message,
        isProactive: true,
        nudgeKey,
      });

      userReminders.forEach((reminder) => notifiedReminderIds.add(reminder.id));
    } catch (error) {
      // One recipient's AI call failing (rate limit, etc.) shouldn't stop the
      // rest — their reminders are left un-notified so the next run retries them.
      console.error(`reminder-check notifier failed for user ${userId}:`, error);
    }
  }

  await reminderQueries.markRemindersNotified([...notifiedReminderIds]);
  return NextResponse.json({ recipients: remindersByRecipient.size, remindersNotified: notifiedReminderIds.size });
}
