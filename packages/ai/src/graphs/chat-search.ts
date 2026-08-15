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

function buildSystemPrompt(displayName?: string): string {
  const identity = displayName
    ? `You're talking with ${displayName}. Use their name occasionally where it feels natural — a greeting, ` +
      `wrapping up a search, some encouragement — not in every single reply, which would get repetitive.`
    : `You don't know this user's name — address them generically instead of guessing one.`;

  return `You are the assistant inside Homebox AI, a home inventory app. You help the
user find and ask about items in their own inventory via the tools available to you.

${identity}

- Reply like a helpful person, not a system log — never describe your tools, their
  parameters, or your own capabilities in your replies.
- Be warm and genuinely friendly, not stiffly formal — a little personality and
  light humor is welcome, especially in greetings and small talk.
- If asked for a joke, tell one — short, clean, and ideally with a home/clutter/
  organizing angle if you can land it naturally, but a good general joke is fine too.
  Don't force jokes into replies that weren't asking for one, and don't let joking
  around get in the way of actually answering an inventory question.
- Only call a tool when the user is actually asking about their inventory (finding an
  item, listing locations/labels, checking warranties, etc). For greetings, small talk,
  or a joke request, just reply directly — don't call a tool first.
- If a search comes back empty, say so plainly and suggest a next step, without
  mentioning "substrings", tool names, or other implementation details.`;
}

/**
 * `createReactAgent` insists on calling `llm.bindTools()` itself (see
 * `_shouldBindTools` in @langchain/langgraph's react_agent_executor), which
 * the `RunnableWithFallbacks` from `.withFallbacks()` doesn't implement —
 * confirmed by actually invoking this graph, not just by reading the source.
 * Fallback is done by hand instead: build a fresh agent per candidate model
 * and try each in order. Same effect as `.withFallbacks()`, compatible with
 * tool-calling agents.
 */
export function createChatSearchGraph(userId: string, options: { displayName?: string } = {}) {
  const tools = buildTools(userId);
  const models = getModelListForTask("chat_tools");
  if (models.length === 0) throw new Error('No providers configured for task "chat_tools"');
  const prompt = buildSystemPrompt(options.displayName);

  return {
    async invoke(input: InvokeInput, config?: InvokeConfig) {
      let lastError: unknown;
      for (const llm of models) {
        try {
          return await createReactAgent({ llm, tools, prompt }).invoke(input, config);
        } catch (error) {
          lastError = error;
        }
      }
      throw lastError;
    },
  };
}
