import { NodeSDK } from "@opentelemetry/sdk-node";
import { LangfuseSpanProcessor } from "@langfuse/otel";

// Exported so route handlers can `forceFlush()` before returning — serverless
// functions can be frozen/torn down right after the response is sent, before
// the SDK's background export would otherwise have run.
export const langfuseSpanProcessor = new LangfuseSpanProcessor({
  exportMode: "immediate",
});

const sdk = new NodeSDK({
  spanProcessors: [langfuseSpanProcessor],
});

sdk.start();
