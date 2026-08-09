import { itemQueries, labelQueries, locationQueries } from "@homebox-ai/db";
import { tool } from "@langchain/core/tools";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { z } from "zod";

import { getModelForTask } from "../router";

/** Tools are scoped to `userId` up front so the agent can never reach another user's data. */
function buildTools(userId: string) {
  return [
    tool(
      async ({ query, locationId }) => JSON.stringify(await itemQueries.searchItems(userId, { query, locationId })),
      {
        name: "search_items",
        description: "Search the user's inventory by name substring and/or location.",
        schema: z.object({
          query: z.string().optional().describe("Substring to match against item names"),
          locationId: z.string().optional().describe("Restrict results to this location id"),
        }),
      },
    ),
    tool(async ({ itemId }) => JSON.stringify(await itemQueries.getItem(userId, itemId)), {
      name: "get_item",
      description: "Look up a single item by id.",
      schema: z.object({ itemId: z.string() }),
    }),
    tool(async () => JSON.stringify(await locationQueries.listLocations(userId)), {
      name: "list_locations",
      description: "List all of the user's locations.",
      schema: z.object({}),
    }),
    tool(async () => JSON.stringify(await labelQueries.listLabels(userId)), {
      name: "list_labels",
      description: "List all of the user's labels.",
      schema: z.object({}),
    }),
  ];
}

export function createChatSearchGraph(userId: string) {
  return createReactAgent({
    llm: getModelForTask("chat_tools"),
    tools: buildTools(userId),
  });
}
