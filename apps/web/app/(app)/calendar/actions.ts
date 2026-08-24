"use server";

import { reminderQueries } from "@homebox-ai/db";
import { requireSessionUser } from "@homebox-ai/supabase/server";
import { revalidatePath } from "next/cache";

export async function createReminderAction(formData: FormData) {
  const user = await requireSessionUser();

  const title = String(formData.get("title") ?? "").trim();
  const dueDate = String(formData.get("dueDate") ?? "").trim();
  const itemId = String(formData.get("itemId") ?? "").trim() || undefined;
  const description = String(formData.get("description") ?? "").trim() || undefined;
  const assignedToUserId = String(formData.get("assignedToUserId") ?? "").trim() || undefined;
  if (!title || !dueDate) throw new Error("A title and due date are required");

  await reminderQueries.createReminder(user.id, { title, dueDate, itemId, description, assignedToUserId });
  revalidatePath("/calendar");
}

export async function completeReminderAction(formData: FormData) {
  const user = await requireSessionUser();

  const reminderId = String(formData.get("reminderId") ?? "").trim();
  if (!reminderId) throw new Error("Missing reminder id");

  await reminderQueries.completeReminder(user.id, reminderId);
  revalidatePath("/calendar");
}

export async function reopenReminderAction(formData: FormData) {
  const user = await requireSessionUser();

  const reminderId = String(formData.get("reminderId") ?? "").trim();
  if (!reminderId) throw new Error("Missing reminder id");

  await reminderQueries.reopenReminder(user.id, reminderId);
  revalidatePath("/calendar");
}

export async function deleteReminderAction(formData: FormData) {
  const user = await requireSessionUser();

  const reminderId = String(formData.get("reminderId") ?? "").trim();
  if (!reminderId) throw new Error("Missing reminder id");

  await reminderQueries.deleteReminder(user.id, reminderId);
  revalidatePath("/calendar");
}
