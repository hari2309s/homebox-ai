import { itemQueries, maintenanceQueries } from "@homebox-ai/db";
import { HumanMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";

import { getStructuredModelForTask } from "../router";
import { maintenanceSuggestionSchema } from "../schemas/maintenance-suggestion";

export interface MaintenanceContext {
  /** Today in the household's timezone, `YYYY-MM-DD`. */
  today: string;
  /** Where the item lives, e.g. "Garden › Shed" — tells the model whether it's outdoors. */
  place?: string;
  /** Plain-text forecast for the home (see apps/web/lib/weather.ts), when a home location is set. */
  forecast?: string;
}

export async function runMaintenanceAssistantGraph(
  userId: string,
  itemId: string,
  context: MaintenanceContext,
  config?: RunnableConfig,
) {
  const [item, history] = await Promise.all([
    itemQueries.getItem(userId, itemId),
    maintenanceQueries.listMaintenanceForItem(userId, itemId),
  ]);
  if (!item) throw new Error("Item not found");

  const model = getStructuredModelForTask("reasoning", maintenanceSuggestionSchema);

  const weatherGuidance = context.forecast
    ? `\n\nWeather at the home for the coming days:\n${context.forecast}\n\n` +
      "Take the weather into account where it matters for this item: if it lives or is used outdoors, or is " +
      "affected by cold, heat, damp or wind (garden tools, mowers, outdoor taps, gutters, roofs, fences, paint and " +
      "sealants, boilers, heating, air conditioning, vehicles). Schedule outdoor work on a dry, frost-free day in " +
      "the forecast; add a task if the forecast calls for one (e.g. protect it before a frost); and set `weather` " +
      "to a short note whenever the forecast shaped a task or its date. Leave `weather` null for tasks it didn't " +
      "affect, and don't invent weather beyond the forecast given."
    : "\n\nNo forecast is available, so set `weather` to null on every suggestion.";

  return model.invoke(
    [
      new HumanMessage(
        `Today is ${context.today}.\n` +
          (context.place ? `The item is kept in: ${context.place}.\n` : "") +
          `Item: ${JSON.stringify(item)}\nPast maintenance entries: ${JSON.stringify(history)}\n\n` +
          "Suggest upcoming maintenance tasks and flag if the warranty is expiring within 60 days. " +
          "Base suggestions on the item's purchase date, description, and past maintenance history. " +
          "Every recommended date must be today or later." +
          weatherGuidance,
      ),
    ],
    config,
  );
}
