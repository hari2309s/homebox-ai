import { NodeSDK } from "@opentelemetry/sdk-node";
import { LangfuseSpanProcessor } from "@langfuse/otel";

const langfuseEnabled =
  Boolean(process.env.LANGFUSE_PUBLIC_KEY) && Boolean(process.env.LANGFUSE_SECRET_KEY);

// Exported so route handlers can `forceFlush()` before returning. When
// Langfuse keys are not configured this is a no-op stub so missing keys
// never produce 401 noise or block AI graph invocations.
export const langfuseSpanProcessor = langfuseEnabled
  ? new LangfuseSpanProcessor({ exportMode: "immediate" })
  : ({ forceFlush: async () => {} } as Pick<LangfuseSpanProcessor, "forceFlush">);

if (langfuseEnabled) {
  const sdk = new NodeSDK({
    spanProcessors: [langfuseSpanProcessor as LangfuseSpanProcessor],
  });
  sdk.start();
}
