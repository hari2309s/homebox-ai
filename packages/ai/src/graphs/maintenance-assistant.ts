import { itemQueries, maintenanceQueries } from "@homebox-ai/db";
import { HumanMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";

import { getStructuredModelForTask } from "../router";
import { maintenanceSuggestionSchema } from "../schemas/maintenance-suggestion";

export async function runMaintenanceAssistantGraph(userId: string, itemId: string, config?: RunnableConfig) {
  const [item, history] = await Promise.all([
    itemQueries.getItem(userId, itemId),
    maintenanceQueries.listMaintenanceForItem(userId, itemId),
  ]);
  if (!item) throw new Error("Item not found");

  const model = getStructuredModelForTask("reasoning", maintenanceSuggestionSchema);

  return model.invoke(
    [
      new HumanMessage(
        `Item: ${JSON.stringify(item)}\nPast maintenance entries: ${JSON.stringify(history)}\n\n` +
          "Suggest upcoming maintenance tasks and flag if the warranty is expiring within 60 days. " +
          "Base suggestions on the item's purchase date, description, and past maintenance history.",
      ),
    ],
    config,
  );
}
