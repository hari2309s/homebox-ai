/**
 * Runs the "homebox-golden" Langfuse dataset as an experiment against the real
 * model + schema + prompt pipeline, and prints per-item + aggregate scores.
 *
 * Requires the dataset to exist — run `pnpm eval:sync-dataset` first (or
 * after editing evals/dataset-items.ts).
 *
 * Run with: pnpm --filter @homebox-ai/ai eval
 */

import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env.local") });

import { runEvalItem } from "./task";
import {
  warrantyDetection,
  dateValidity,
  responseQualityJudge,
  avgWarrantyAccuracy,
  avgDateValidity,
  avgResponseQuality,
} from "./evaluators";

const DATASET_NAME = "homebox-golden";

async function run() {
  const { LangfuseClient } = await import("@langfuse/client");
  const langfuse = new LangfuseClient();
  const dataset = await langfuse.dataset.get(DATASET_NAME);

  const result = await dataset.runExperiment({
    name: "Local golden run",
    description: "Manual run via pnpm eval",
    task: runEvalItem,
    evaluators: [warrantyDetection, dateValidity, responseQualityJudge],
    runEvaluators: [avgWarrantyAccuracy, avgDateValidity, avgResponseQuality],
    maxConcurrency: 2, // free-tier provider quotas — keep bursts low
  });

  console.log(await result.format());
}

run().catch((e) => {
  console.error("Fatal:", e);
  process.exitCode = 1;
});
