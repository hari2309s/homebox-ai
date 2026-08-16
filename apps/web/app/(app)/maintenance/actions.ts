"use server";

import { runMaintenanceAssistantGraph, type MaintenanceSuggestion } from "@homebox-ai/ai";
import { maintenanceQueries } from "@homebox-ai/db";
import { requireSessionUser } from "@homebox-ai/supabase/server";

import { runTracedGraph } from "../../../lib/traced-graph";

export async function getMaintenanceSuggestionsAction(itemId: string): Promise<MaintenanceSuggestion> {
  const user = await requireSessionUser();
  if (!itemId) throw new Error("Choose an item first");

  return runTracedGraph(
    { userId: user.id, tags: ["maintenance-assistant"], runName: "maintenance-assistant" },
    (options) => runMaintenanceAssistantGraph(user.id, itemId, options),
  );
}

export async function acceptMaintenanceSuggestionAction(formData: FormData) {
  const user = await requireSessionUser();

  const itemId = String(formData.get("itemId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || undefined;
  if (!itemId || !name || !date) throw new Error("Missing suggestion details");

  await maintenanceQueries.createMaintenanceEntry(user.id, { itemId, name, date, description });
}
