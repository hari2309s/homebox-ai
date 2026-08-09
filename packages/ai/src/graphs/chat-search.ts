import { itemQueries, labelQueries, locationQueries } from "@homebox-ai/db";
import { tool } from "@langchain/core/tools";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { z } from "zod";

import { getModelListForTask } from "../router";

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

type ReactAgent = ReturnType<typeof createReactAgent>;
type InvokeInput = Parameters<ReactAgent["invoke"]>[0];
type InvokeConfig = Parameters<ReactAgent["invoke"]>[1];

/**
 * `createReactAgent` insists on calling `llm.bindTools()` itself (see
 * `_shouldBindTools` in @langchain/langgraph's react_agent_executor), which
 * the `RunnableWithFallbacks` from `.withFallbacks()` doesn't implement —
 * confirmed by actually invoking this graph, not just by reading the source.
 * Fallback is done by hand instead: build a fresh agent per candidate model
 * and try each in order. Same effect as `.withFallbacks()`, compatible with
 * tool-calling agents.
 */
export function createChatSearchGraph(userId: string) {
  const tools = buildTools(userId);
  const models = getModelListForTask("chat_tools");
  if (models.length === 0) throw new Error('No providers configured for task "chat_tools"');

  return {
    async invoke(input: InvokeInput, config?: InvokeConfig) {
      let lastError: unknown;
      for (const llm of models) {
        try {
          return await createReactAgent({ llm, tools }).invoke(input, config);
        } catch (error) {
          lastError = error;
        }
      }
      throw lastError;
    },
  };
}
