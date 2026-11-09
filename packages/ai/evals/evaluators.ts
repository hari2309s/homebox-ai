import type { Evaluation, Evaluator, RunEvaluator } from "@langfuse/client";
import { HumanMessage } from "@langchain/core/messages";

import { getModelForTask } from "../src/router";
import type { EvalItemInput, EvalItemMetadata } from "./dataset-items";
import type { MaintenanceSuggestion } from "../src/schemas/maintenance-suggestion";

// --- warranty detection (deterministic) ------------------------------------
//
// The maintenance prompt instructs the model to set `warrantyExpiringSoon` to
// true when the warranty expires within 60 days. Fixtures are built so some
// items are inside that window and others are not — this checks the model
// followed the instruction correctly.

export const warrantyDetection: Evaluator<EvalItemInput, undefined, EvalItemMetadata> = async ({
  output,
  metadata,
}) => {
  if (metadata?.expectedWarranty === undefined) return [];

  let parsed: MaintenanceSuggestion;
  try {
    parsed = JSON.parse(String(output));
  } catch {
    return { name: "warranty_detection", value: 0, comment: "Output is not valid JSON" };
  }

  const passed = parsed.warrantyExpiringSoon === metadata.expectedWarranty;
  return {
    name: "warranty_detection",
    value: passed ? 1 : 0,
    comment: passed
      ? undefined
      : `warrantyExpiringSoon=${parsed.warrantyExpiringSoon}, expected ${metadata.expectedWarranty}`,
  };
};

// --- date validity (deterministic) -----------------------------------------
//
// The prompt says "every recommended date must be today or later". This checks
// that the model didn't hallucinate past dates. Uses the current date at eval
// runtime, which matches the "today" fed to the model in task.ts since both
// run in the same process.

export const dateValidity: Evaluator<EvalItemInput, undefined, EvalItemMetadata> = async ({ output }) => {
  let parsed: MaintenanceSuggestion;
  try {
    parsed = JSON.parse(String(output));
  } catch {
    return { name: "date_validity", value: 0, comment: "Output is not valid JSON" };
  }

  if (parsed.suggestions.length === 0) {
    return { name: "date_validity", value: 1, comment: "No suggestions to check" };
  }

  const today = new Date().toISOString().slice(0, 10);
  const invalid = parsed.suggestions.filter((s) => s.recommendedDate < today);

  return {
    name: "date_validity",
    value: invalid.length === 0 ? 1 : 0,
    comment:
      invalid.length > 0
        ? `${invalid.length} suggestion(s) before today (${today}): ${invalid.map((s) => `${s.name}: ${s.recommendedDate}`).join(", ")}`
        : undefined,
  };
};

// --- response quality LLM judge --------------------------------------------

// Same judge-score parser as truffle: exact bare-integer first, then fallback
// to scanning for a word-boundaried digit 1-5, preferring the last one since
// leaked reasoning precedes the actual verdict.
function parseJudgeScore(text: string): number | null {
  const trimmed = text.trim();
  const exact = Number(trimmed);
  if (Number.isInteger(exact) && exact >= 1 && exact <= 5) return exact;

  const matches = trimmed.match(/\b[1-5]\b/g);
  return matches?.length ? Number(matches[matches.length - 1]) : null;
}

export const responseQualityJudge: Evaluator<EvalItemInput, undefined, EvalItemMetadata> = async ({
  input,
  output,
}) => {
  const prompt = `You are evaluating an AI home-maintenance assistant's structured JSON output.

The assistant was given a household item and its maintenance history, and asked to
suggest upcoming maintenance tasks and flag whether the warranty is expiring soon.

Fixture: ${input.fixtureKey}

AI output:
${output}

Score the response 1-5 on this scale:
1 = Wrong, irrelevant, or harmful suggestions
2 = Partially relevant but missing obvious tasks
3 = Adequate suggestions but not well-reasoned
4 = Good — relevant, well-timed, practical suggestions
5 = Excellent — precise, useful, contextually aware (considers item age, history, location)

Respond with ONLY the integer score.`;

  const response = await getModelForTask("reasoning").invoke([new HumanMessage(prompt)]);
  const text = typeof response.content === "string" ? response.content : String(response.content);
  const score = parseJudgeScore(text);

  return {
    name: "response_quality",
    value: score ?? 0,
    comment: score === null ? `Judge did not return a parseable score: "${text.slice(0, 80)}"` : undefined,
  };
};

// --- run-level aggregates --------------------------------------------------

function average(evaluations: Array<{ evaluations: Evaluation[] }>, name: string): number | null {
  const values = evaluations
    .flatMap((r) => r.evaluations)
    .filter((e) => e.name === name && typeof e.value === "number")
    .map((e) => e.value as number);
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null;
}

export const avgWarrantyAccuracy: RunEvaluator<EvalItemInput, undefined, EvalItemMetadata> = async ({
  itemResults,
}) => {
  const avg = average(itemResults, "warranty_detection");
  return avg === null ? [] : { name: "avg_warranty_accuracy", value: avg };
};

export const avgDateValidity: RunEvaluator<EvalItemInput, undefined, EvalItemMetadata> = async ({ itemResults }) => {
  const avg = average(itemResults, "date_validity");
  return avg === null ? [] : { name: "avg_date_validity", value: avg };
};

export const avgResponseQuality: RunEvaluator<EvalItemInput, undefined, EvalItemMetadata> = async ({
  itemResults,
}) => {
  const avg = average(itemResults, "response_quality");
  return avg === null ? [] : { name: "avg_response_quality", value: avg };
};
