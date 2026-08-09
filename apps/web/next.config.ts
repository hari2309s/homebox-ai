import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // OpenTelemetry's Node SDK (for Langfuse tracing) uses require-in-the-middle's
  // dynamic require() to patch Node's module loader for auto-instrumentation.
  // Externalizing only that leaf package isn't enough — the require() call
  // happens inside @opentelemetry/instrumentation's own bundled code, so
  // webpack still traces into it unless the whole chain is externalized.
  serverExternalPackages: [
    "require-in-the-middle",
    "@opentelemetry/instrumentation",
    "@opentelemetry/sdk-node",
  ],
};

export default withSerwist(nextConfig);
