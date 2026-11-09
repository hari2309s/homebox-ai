/**
 * CI entry point for langfuse/experiment-action (.github/workflows/langfuse-eval.yml).
 * Runs the "homebox-golden" dataset (loaded by the action via `dataset_name`)
 * and fails the job — via RegressionError — if any aggregate drops below its
 * threshold.
 *
 * Thresholds below are initial conservative values. After the first few real
 * runs establish a baseline, re-baseline per the README instructions.
 */

import { RegressionError, type RunnerContext } from "@langfuse/client";
import { runEvalItem } from "./task";
import {
  warrantyDetection,
  dateValidity,
  responseQualityJudge,
  avgWarrantyAccuracy,
  avgDateValidity,
  avgResponseQuality,
} from "./evaluators";
import type { EvalItemInput, EvalItemMetadata } from "./dataset-items";

const THRESHOLDS = {
  avg_warranty_accuracy: 0.75, // 4 items have expectedWarranty=true — allows 1 miss
  avg_date_validity: 0.75, // allows a couple of past-date hallucinations
  avg_response_quality: 3.0, // 12 items on 1-5 scale — margin for judge variance
};

export async function experiment(context: RunnerContext<EvalItemInput, undefined, EvalItemMetadata>) {
  const result = await context.runExperiment({
    name: "CI gate: homebox-golden",
    task: runEvalItem,
    evaluators: [warrantyDetection, dateValidity, responseQualityJudge],
    runEvaluators: [avgWarrantyAccuracy, avgDateValidity, avgResponseQuality],
    maxConcurrency: 2, // free-tier provider quotas — keep bursts low
  });

  for (const [metric, threshold] of Object.entries(THRESHOLDS)) {
    const value = result.runEvaluations.find((e) => e.name === metric)?.value;
    if (typeof value !== "number" || value < threshold) {
      throw new RegressionError({
        result,
        metric,
        value: typeof value === "number" ? value : 0,
        threshold,
      });
    }
  }

  return result;
}
