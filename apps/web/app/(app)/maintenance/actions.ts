"use server";

import { runMaintenanceAssistantGraph, type MaintenanceSuggestion } from "@homebox-ai/ai";
import { reminderQueries } from "@homebox-ai/db";
import { requireSessionUser } from "@homebox-ai/supabase/server";
import { revalidatePath } from "next/cache";

import { assertAssignableToHousehold } from "../../../lib/reminders";
import { runTracedGraph } from "../../../lib/traced-graph";

export async function getMaintenanceSuggestionsAction(itemId: string): Promise<MaintenanceSuggestion> {
  const user = await requireSessionUser();
  if (!itemId) throw new Error("Choose an item first");

  return runTracedGraph(
    { userId: user.id, tags: ["maintenance-assistant"], runName: "maintenance-assistant" },
    (options) => runMaintenanceAssistantGraph(user.id, itemId, options),
  );
}

export async function createReminderFromSuggestionAction(formData: FormData) {
  const user = await requireSessionUser();

  const itemId = String(formData.get("itemId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const dueDate = String(formData.get("dueDate") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || undefined;
  const assignedToUserId = String(formData.get("assignedToUserId") ?? "").trim() || undefined;
  if (!itemId || !title || !dueDate) throw new Error("Missing suggestion details");
  await assertAssignableToHousehold(user.id, assignedToUserId);

  await reminderQueries.createReminder(user.id, { itemId, title, dueDate, description, assignedToUserId });
  revalidatePath("/calendar");
}
