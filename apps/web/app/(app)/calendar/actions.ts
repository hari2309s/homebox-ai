"use server";

import { reminderQueries } from "@homebox-ai/db";
import { requireSessionUser } from "@homebox-ai/supabase/server";
import { revalidatePath } from "next/cache";

import { assertAssignableToHousehold } from "../../../lib/reminders";

export async function createReminderAction(formData: FormData) {
  const user = await requireSessionUser();

  const title = String(formData.get("title") ?? "").trim();
  const dueDate = String(formData.get("dueDate") ?? "").trim();
  const itemId = String(formData.get("itemId") ?? "").trim() || undefined;
  const description = String(formData.get("description") ?? "").trim() || undefined;
  const assignedToUserId = String(formData.get("assignedToUserId") ?? "").trim() || undefined;
  if (!title || !dueDate) throw new Error("A title and due date are required");
  await assertAssignableToHousehold(user.id, assignedToUserId);

  await reminderQueries.createReminder(user.id, { title, dueDate, itemId, description, assignedToUserId });
  revalidatePath("/calendar");
}

// Next.js requires each server action to be its own top-level `async
// function` export (for its build-time reference wrapping), so this can't be
// a factory returning the export directly — but the three call sites below
// can still share one implementation.
async function runReminderIdAction(
  formData: FormData,
  queryFn: (userId: string, reminderId: string) => Promise<unknown>,
) {
  const user = await requireSessionUser();

  const reminderId = String(formData.get("reminderId") ?? "").trim();
  if (!reminderId) throw new Error("Missing reminder id");

  await queryFn(user.id, reminderId);
  revalidatePath("/calendar");
}

export async function completeReminderAction(formData: FormData) {
  await runReminderIdAction(formData, reminderQueries.completeReminder);
}

export async function reopenReminderAction(formData: FormData) {
  await runReminderIdAction(formData, reminderQueries.reopenReminder);
}

export async function deleteReminderAction(formData: FormData) {
  await runReminderIdAction(formData, reminderQueries.deleteReminder);
}
