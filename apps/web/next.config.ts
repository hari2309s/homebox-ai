import path from "node:path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

// Next only auto-loads .env.local from this app's own directory, but the
// shared .env.local (also read by Drizzle Kit) lives at the monorepo root.
// forceReload (4th arg): Next's own startup already calls loadEnvConfig
// against this app's own directory (finding nothing) and caches that empty
// result — without forcing a reload here, this call would just return that
// stale cache instead of actually reading the monorepo root's files.
loadEnvConfig(path.join(process.cwd(), "..", ".."), process.env.NODE_ENV !== "production", console, true);

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Default (1MB) is too small for the full ZIP import (data.json plus
    // every attachment file) — the CSV/JSON imports stay well under this.
    serverActions: { bodySizeLimit: "25mb" },
  },
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
