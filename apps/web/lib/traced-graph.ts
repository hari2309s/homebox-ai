import { createLangfuseHandler, type TracingContext } from "@homebox-ai/ai";
import { after } from "next/server";

import { langfuseSpanProcessor } from "../instrumentation-node";

/**
 * Every AI-graph Server Action follows the same shape: build a per-call
 * Langfuse handler, invoke the graph with it, then flush the span processor
 * after the response is sent (serverless functions can be frozen right after
 * returning, before background export would otherwise run). This centralizes
 * that so each action only supplies the graph-specific `run` call.
 */
export async function runTracedGraph<T>(
  context: TracingContext & { runName: string },
  run: (options: { callbacks: [ReturnType<typeof createLangfuseHandler>]; runName: string }) => Promise<T>,
): Promise<T> {
  const langfuseHandler = createLangfuseHandler(context);
  const result = await run({ callbacks: [langfuseHandler], runName: context.runName });

  after(async () => {
    await langfuseSpanProcessor.forceFlush();
  });

  return result;
}
