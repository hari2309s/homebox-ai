import { createLangfuseHandler, type TracingContext } from "@homebox-ai/ai";
import { after } from "next/server";

import { langfuseSpanProcessor } from "../instrumentation-node";

const langfuseEnabled =
  Boolean(process.env.LANGFUSE_PUBLIC_KEY) && Boolean(process.env.LANGFUSE_SECRET_KEY);

/**
 * Every AI-graph Server Action follows the same shape: optionally build a
 * per-call Langfuse handler, invoke the graph with it, then flush the span
 * processor after the response is sent. When Langfuse keys are not configured
 * the graph runs without any callbacks so missing keys never block AI calls.
 */
export async function runTracedGraph<T>(
  context: TracingContext & { runName: string },
  run: (options: { callbacks: ReturnType<typeof createLangfuseHandler>[]; runName: string }) => Promise<T>,
): Promise<T> {
  if (langfuseEnabled) {
    const langfuseHandler = createLangfuseHandler(context);
    const result = await run({ callbacks: [langfuseHandler], runName: context.runName });
    after(async () => {
      await langfuseSpanProcessor.forceFlush();
    });
    return result;
  }

  return run({ callbacks: [], runName: context.runName });
}
