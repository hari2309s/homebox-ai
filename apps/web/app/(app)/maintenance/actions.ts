"use server";

import { createLangfuseHandler, runMaintenanceAssistantGraph, type MaintenanceSuggestion } from "@homebox-ai/ai";
import { maintenanceQueries } from "@homebox-ai/db";
import { getSessionUser } from "@homebox-ai/supabase/server";
import { after } from "next/server";

import { langfuseSpanProcessor } from "../../../instrumentation-node";

export async function getMaintenanceSuggestionsAction(itemId: string): Promise<MaintenanceSuggestion> {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");
  if (!itemId) throw new Error("Choose an item first");

  const langfuseHandler = createLangfuseHandler({ userId: user.id, tags: ["maintenance-assistant"] });
  const suggestions = await runMaintenanceAssistantGraph(user.id, itemId, {
    callbacks: [langfuseHandler],
    runName: "maintenance-assistant",
  });

  after(async () => {
    await langfuseSpanProcessor.forceFlush();
  });

  return suggestions;
}

export async function acceptMaintenanceSuggestionAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");

  const itemId = String(formData.get("itemId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || undefined;
  if (!itemId || !name || !date) throw new Error("Missing suggestion details");

  await maintenanceQueries.createMaintenanceEntry(user.id, { itemId, name, date, description });
}
