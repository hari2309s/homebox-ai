import { itemQueries, labelQueries, locationQueries } from "@homebox-ai/db";
import { tool } from "@langchain/core/tools";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { z } from "zod";

import { getModelListForTask } from "../router";
import type { PendingAction } from "../schemas/pending-action";

/** Case-insensitive name match against the user's existing locations — the model only ever knows names, not ids. */
async function findLocationIdByName(userId: string, name: string): Promise<string | null> {
  const locations = await locationQueries.listLocations(userId);
  const match = locations.find((location) => location.name.toLowerCase() === name.toLowerCase());
  return match?.id ?? null;
}

function proposal(action: PendingAction) {
  return JSON.stringify({ pendingAction: action });
}

/**
 * Tools are scoped to `userId` up front so the agent can never reach another
 * user's data. Deliberately no delete_* tools — an LLM acting on a natural-
 * language request is the wrong place to trust with irreversible data loss;
 * deletion stays a manual, explicit action in the UI.
 *
 * The five mutating tools below never touch the database — each validates
 * its inputs against the user's real data (a referenced location must
 * already exist, etc.) and returns a `pendingAction` proposal instead. The
 * API route surfaces that to the client as a confirm/cancel card; only
 * apps/web's confirmChatActionAction actually performs the write, after the
 * user explicitly confirms. See pending-action.ts for the shared shape both
 * sides agree on.
 */
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
    tool(
      async ({ name, parentLocationName }) => {
        const existingId = await findLocationIdByName(userId, name);
        if (existingId) return JSON.stringify({ alreadyExisted: true, id: existingId, name });

        let parentLocationId: string | null = null;
        if (parentLocationName) {
          parentLocationId = await findLocationIdByName(userId, parentLocationName);
          if (!parentLocationId) {
            return JSON.stringify({
              error: `No location named "${parentLocationName}" exists — create it first, or create "${name}" without a parent.`,
            });
          }
        }
        return proposal({
          type: "create_location",
          summary: parentLocationName
            ? `Create location "${name}" inside "${parentLocationName}"`
            : `Create location "${name}"`,
          name,
          parentLocationId,
        });
      },
      {
        name: "create_location",
        description:
          "Propose creating a new location the user can store items in, optionally nested inside an existing " +
          "one — shown to the user to confirm or cancel, not created immediately. If a location with this " +
          "name already exists, returns it instead of proposing a duplicate.",
        schema: z.object({
          name: z.string().describe("The new location's name, e.g. 'Garage'"),
          parentLocationName: z.string().optional().describe("Name of an existing location to nest this one inside"),
        }),
      },
    ),
    tool(
      async ({ name, color }) => {
        const existing = await labelQueries.listLabels(userId);
        const match = existing.find((label) => label.name.toLowerCase() === name.toLowerCase());
        if (match) return JSON.stringify({ alreadyExisted: true, id: match.id, name: match.name });
        return proposal({ type: "create_label", summary: `Create label "${name}"`, name, color: color ?? null });
      },
      {
        name: "create_label",
        description:
          "Propose creating a new label the user can tag items with — shown to the user to confirm or " +
          "cancel, not created immediately. If a label with this name already exists, returns it instead of " +
          "proposing a duplicate.",
        schema: z.object({
          name: z.string().describe("The label's name, e.g. 'Fragile'"),
          color: z.string().optional().describe("Hex color for the label chip, e.g. '#fb7369'"),
        }),
      },
    ),
    tool(
      async ({
        name,
        description,
        quantity,
        locationName,
        labelNames,
        purchasePrice,
        purchaseDate,
        warrantyExpires,
      }) => {
        let locationId: string | null = null;
        if (locationName) {
          locationId = await findLocationIdByName(userId, locationName);
          if (!locationId) {
            return JSON.stringify({
              error: `No location named "${locationName}" exists — create it first, or create "${name}" without a location.`,
            });
          }
        }
        const parts = [`Add "${name}"`];
        if (locationName) parts.push(`to ${locationName}`);
        if (labelNames && labelNames.length > 0) parts.push(`tagged ${labelNames.join(", ")}`);
        return proposal({
          type: "create_item",
          summary: parts.join(" "),
          name,
          description,
          quantity,
          locationId,
          labelNames,
          purchasePrice,
          purchaseDate,
          warrantyExpires,
        });
      },
      {
        name: "create_item",
        description:
          "Propose adding a new item to the user's inventory — shown to the user to confirm or cancel, not created immediately.",
        schema: z.object({
          name: z.string().describe("The item's name"),
          description: z.string().optional(),
          quantity: z.number().int().positive().optional(),
          locationName: z.string().optional().describe("Name of an existing location to place this item in"),
          labelNames: z
            .array(z.string())
            .optional()
            .describe("Label names to tag the item with — created if they don't exist yet, once confirmed"),
          purchasePrice: z.string().optional().describe("Decimal string, e.g. '129.99'"),
          purchaseDate: z.string().optional().describe("ISO date, e.g. '2024-03-01'"),
          warrantyExpires: z.string().optional().describe("ISO date the warranty expires"),
        }),
      },
    ),
    tool(
      async ({ itemId, name, description, quantity, locationName, purchaseDate, purchasePrice, warrantyExpires }) => {
        const existingItem = await itemQueries.getItem(userId, itemId);
        if (!existingItem) return JSON.stringify({ error: "That item wasn't found." });

        let locationId: string | null | undefined;
        if (locationName) {
          locationId = await findLocationIdByName(userId, locationName);
          if (!locationId) {
            return JSON.stringify({ error: `No location named "${locationName}" exists — create it first.` });
          }
        }
        const changes = [
          name && `rename to "${name}"`,
          locationName && `move to ${locationName}`,
          quantity !== undefined && `set quantity to ${quantity}`,
          purchasePrice !== undefined && `set purchase price to ${purchasePrice}`,
          purchaseDate !== undefined && `set purchase date to ${purchaseDate}`,
          warrantyExpires !== undefined && `set warranty expiry to ${warrantyExpires}`,
          description !== undefined && "update the description",
        ].filter(Boolean);
        return proposal({
          type: "update_item",
          summary: `Update "${existingItem.name}"${changes.length > 0 ? `: ${changes.join(", ")}` : ""}`,
          itemId,
          name,
          description,
          quantity,
          locationId,
          purchaseDate,
          purchasePrice,
          warrantyExpires,
        });
      },
      {
        name: "update_item",
        description:
          "Propose updating fields on an existing item — shown to the user to confirm or cancel, not applied " +
          "immediately. Look the item up with search_items or get_item first to find its id.",
        schema: z.object({
          itemId: z.string(),
          name: z.string().optional(),
          description: z.string().optional(),
          quantity: z.number().int().positive().optional(),
          locationName: z.string().optional().describe("Name of an existing location to move this item to"),
          purchasePrice: z.string().optional(),
          purchaseDate: z.string().optional(),
          warrantyExpires: z.string().optional(),
        }),
      },
    ),
    tool(
      async ({ itemId, name, date, description, cost }) => {
        const existingItem = await itemQueries.getItem(userId, itemId);
        if (!existingItem) return JSON.stringify({ error: "That item wasn't found." });

        return proposal({
          type: "add_maintenance_entry",
          summary: `Log "${name}" for "${existingItem.name}" (${date})`,
          itemId,
          name,
          date,
          description,
          cost,
        });
      },
      {
        name: "add_maintenance_entry",
        description:
          "Propose logging a maintenance or service entry against an existing item — shown to the user to " +
          "confirm or cancel, not logged immediately. Look the item up first to find its id.",
        schema: z.object({
          itemId: z.string(),
          name: z.string().describe("Short task name, e.g. 'Replaced filter'"),
          date: z.string().describe("ISO date the maintenance was done"),
          description: z.string().optional(),
          cost: z.string().optional().describe("Decimal string, e.g. '49.99'"),
        }),
      },
    ),
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
user find, organize, and manage items in their own inventory via the tools available to you.

${identity}

- Reply like a helpful person, not a system log — never describe your tools, their
  parameters, or your own capabilities in your replies.
- Be warm and genuinely friendly, not stiffly formal — a little personality and
  light humor is welcome, especially in greetings and small talk.
- If asked for a joke, tell one — short, clean, and ideally with a home/clutter/
  organizing angle if you can land it naturally, but a good general joke is fine too.
  Don't force jokes into replies that weren't asking for one, and don't let joking
  around get in the way of actually answering an inventory question.
- Only call a tool when the user is actually asking about or acting on their
  inventory (finding an item, listing locations/labels, checking warranties, adding
  or editing something, logging maintenance, etc). For greetings, small talk, or a
  joke request, just reply directly — don't call a tool first.
- When the user clearly asks you to create, update, or log something and a tool
  exists for it, just call it — don't ask "would you like me to?" first when
  they've already told you, and never tell them to go do it manually in the app
  instead of using your tools. Only ask a clarifying question first if the request
  is genuinely ambiguous (e.g. which of two same-named items they mean).
- Calling create_location, create_label, create_item, update_item, or
  add_maintenance_entry does NOT perform the action — it proposes it, and the app
  shows the user a card with the details to confirm or cancel. Nothing happens
  until they confirm. So after calling one of these, describe what you're
  proposing and that it's awaiting their confirmation — say "I'd like to add a
  Garage location — confirm below to go ahead" or similar, never "Done!" or
  "I've added..." as if it already happened, since it hasn't yet. Propose only
  one action per turn; if the user asks for several things, handle them one at a
  time as each gets confirmed.
- After each confirmed action the app will automatically ask you to continue.
  When that happens, look at the conversation history to see what the user
  originally asked for and whether there are remaining steps. If there are,
  propose the next one immediately — don't ask the user to re-state the request.
  If everything from the original request is now done, say so briefly.
- Every field on a create/update/log tool besides the obviously required ones
  (like a name) is optional for a reason. Never hold off calling the tool to ask
  about purchase price, dates, warranty, description, or any other optional
  detail the user didn't mention — call it with only what they gave you, and
  let them add more later if they want to. Asking about a field a tool marks
  optional is exactly the kind of thing that stalls a request the user already
  made clearly.
- You can't delete anything — there's no tool for it, on purpose, so don't offer
  to or claim that you did. If someone asks you to delete something, tell them
  to do it from the relevant screen in the app themselves.
- When proposing a location, label, or item name, use sensible capitalization
  regardless of how the user typed it (e.g. "Garage", not "garage") — it's a
  permanent record, not a chat message.
- If a tool call fails (e.g. a referenced location doesn't exist yet), explain
  what went wrong in plain language and offer the fix (e.g. creating that
  location first) rather than repeating the same failing call.
- If a search comes back empty, say so plainly and suggest a next step, without
  mentioning "substrings", tool names, or other implementation details.`;
}

/**
 * Some models — typically a weaker free-tier fallback that doesn't reliably
 * support native function-calling — respond to a tool-bound prompt by
 * writing out what a tool call *looks like* as plain text content instead of
 * actually invoking one via the model API's structured tool-call mechanism.
 * `createReactAgent` only recognizes a real tool call in that structured
 * field, so this kind of reply sails through as if it were a valid final
 * answer — leaking implementation detail as garbage text instead of either
 * doing the thing or explaining in plain language that it couldn't. Treated
 * as a failed attempt so the caller's provider-fallback loop moves on to the
 * next model rather than showing this to the user.
 */
export function looksLikeLeakedToolCall(content: string, toolNames: string[]): boolean {
  if (/<\s*\/?\s*(function|tool_call|tool[_-]?use)\b/i.test(content)) return true;
  const nameAlternation = toolNames.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  return new RegExp(`\\b(${nameAlternation})\\s*[({]`, "i").test(content);
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
  const toolNames = tools.map((t) => t.name);
  const models = getModelListForTask("chat_tools");
  if (models.length === 0) throw new Error('No providers configured for task "chat_tools"');
  const prompt = buildSystemPrompt(options.displayName);

  return {
    async invoke(input: InvokeInput, config?: InvokeConfig) {
      let lastError: unknown;
      for (const [index, llm] of models.entries()) {
        try {
          const result = await createReactAgent({ llm, tools, prompt }).invoke(input, config);
          const lastMessage = result.messages.at(-1);
          if (typeof lastMessage?.content === "string" && looksLikeLeakedToolCall(lastMessage.content, toolNames)) {
            throw new Error("Model emitted an unparsed tool-call-like response instead of a real tool call");
          }
          return result;
        } catch (error) {
          // Logged with its position in the chain (not the provider's name,
          // which isn't reliably exposed the same way across model classes) —
          // this loop previously swallowed every attempt silently, which is
          // exactly what made a stale/misconfigured provider indistinguishable
          // from "the whole task is just slow" until traced by hand.
          console.error(`chat-search: provider ${index + 1}/${models.length} in the chat_tools chain failed:`, error);
          lastError = error;
        }
      }
      throw lastError;
    },
  };
}
