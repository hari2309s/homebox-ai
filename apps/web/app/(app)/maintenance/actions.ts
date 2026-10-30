"use server";

import { runMaintenanceAssistantGraph, type MaintenanceSuggestion } from "@homebox-ai/ai";
import { homeQueries, itemQueries, reminderQueries } from "@homebox-ai/db";
import { requireSessionUser } from "@homebox-ai/supabase/server";
import { revalidatePath } from "next/cache";

import { listLocationsCached } from "../../../lib/cached-queries";
import { assertAssignableToHousehold } from "../../../lib/reminders";
import { runTracedGraph } from "../../../lib/traced-graph";
import { forecastForPrompt, getForecast } from "../../../lib/weather";
import { locationPath } from "../items/item-summary";

/** `YYYY-MM-DD` for today in `timeZone` (the server's own zone when unknown). */
function todayIn(timeZone: string | null): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timeZone ?? undefined }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat("en-CA").format(new Date());
  }
}

export async function getMaintenanceSuggestionsAction(itemId: string): Promise<MaintenanceSuggestion> {
  const user = await requireSessionUser();
  if (!itemId) throw new Error("Choose an item first");

  // Where the thing lives and the home's forecast let the assistant time outdoor and weather-sensitive jobs.
  const [home, item, locations] = await Promise.all([
    homeQueries.getHomeLocation(user.id),
    itemQueries.getItem(user.id, itemId),
    listLocationsCached(user.id),
  ]);
  const forecast = home ? await getForecast(home.latitude, home.longitude) : null;
  const place = locationPath(locations, item?.locationId ?? null)
    .map((l) => l.name)
    .join(" › ");

  return runTracedGraph(
    {
      userId: user.id,
      tags: ["maintenance-assistant", ...(forecast ? ["weather"] : [])],
      runName: "maintenance-assistant",
    },
    (options) =>
      runMaintenanceAssistantGraph(
        user.id,
        itemId,
        {
          today: todayIn(home?.timezone ?? null),
          place: place || undefined,
          forecast: home && forecast ? forecastForPrompt(home.placeName, forecast) : undefined,
        },
        options,
      ),
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

  await reminderQueries.createReminder(user.id, {
    itemId,
    title,
    dueDate,
    description,
    assignedToUserId,
    source: "suggestion",
  });
  revalidatePath("/calendar");
  revalidatePath("/maintenance");
}
