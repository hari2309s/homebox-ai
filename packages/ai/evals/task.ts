import type { ExperimentTaskParams } from "@langfuse/client";
import { HumanMessage } from "@langchain/core/messages";

import { getStructuredModelForTask } from "../src/router";
import { maintenanceSuggestionSchema } from "../src/schemas/maintenance-suggestion";
import { buildMaintenanceFixtures } from "./fixtures";
import type { EvalItemInput, EvalItemMetadata } from "./dataset-items";

// Built once at module load — dates are relative to "now", so every item in a
// single eval run sees the same "today".
const FIXTURES = buildMaintenanceFixtures();

// Dispatches a dataset item to the real production model + schema + prompt
// pipeline it names, against the synthetic fixture set. Output is always
// JSON-stringified structured output — evaluators parse it back.
export async function runEvalItem(
  params: ExperimentTaskParams<EvalItemInput, undefined, EvalItemMetadata>,
): Promise<string> {
  const input = params.input as EvalItemInput;

  switch (input.graph) {
    case "maintenance":
      return runMaintenanceItem(input);
    default:
      throw new Error(`Unknown eval graph: ${(input as EvalItemInput).graph}`);
  }
}

// Replicates the prompt from src/graphs/maintenance-assistant.ts, but with
// fixture data instead of DB-fetched data. Tests the same model + schema +
// prompt pipeline that production uses.
async function runMaintenanceItem(input: EvalItemInput): Promise<string> {
  const fixture = FIXTURES[input.fixtureKey];
  if (!fixture) throw new Error(`Unknown fixture key: ${input.fixtureKey}`);

  const model = getStructuredModelForTask("reasoning", maintenanceSuggestionSchema);
  const { item, history, context } = fixture;

  const weatherGuidance = context.forecast
    ? `\n\nWeather at the home for the coming days:\n${context.forecast}\n\n` +
      "Take the weather into account where it matters for this item: if it lives or is used outdoors, or is " +
      "affected by cold, heat, damp or wind (garden tools, mowers, outdoor taps, gutters, roofs, fences, paint and " +
      "sealants, boilers, heating, air conditioning, vehicles). Schedule outdoor work on a dry, frost-free day in " +
      "the forecast; add a task if the forecast calls for one (e.g. protect it before a frost); and set `weather` " +
      "to a short note whenever the forecast shaped a task or its date. Leave `weather` null for tasks it didn't " +
      "affect, and don't invent weather beyond the forecast given."
    : "\n\nNo forecast is available, so set `weather` to null on every suggestion.";

  const result = await model.invoke([
    new HumanMessage(
      `Today is ${context.today}.\n` +
        (context.place ? `The item is kept in: ${context.place}.\n` : "") +
        `Item: ${JSON.stringify(item)}\nPast maintenance entries: ${JSON.stringify(history)}\n\n` +
        "Suggest upcoming maintenance tasks and flag if the warranty is expiring within 60 days. " +
        "Base suggestions on the item's purchase date, description, and past maintenance history. " +
        "Every recommended date must be today or later." +
        weatherGuidance,
    ),
  ]);

  return JSON.stringify(result);
}
