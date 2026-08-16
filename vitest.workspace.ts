import { defineWorkspace } from "vitest/config";

export default defineWorkspace(["apps/web/vitest.config.ts", "packages/ai/vitest.config.ts", "packages/db/vitest.config.ts"]);
