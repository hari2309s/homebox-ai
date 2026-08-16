import path from "node:path";

import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

// Unlike `pnpm dev` (which Next.js spawns via webServer.command below and
// which loads .env.local itself), the Playwright test runner is a separate
// process that doesn't auto-load it — needed here so e2e/auth.setup.ts can
// read E2E_TEST_EMAIL/E2E_TEST_PASSWORD. .env.local lives at the repo root,
// not in apps/web, so this is relative to this config file's own location
// rather than to process.cwd() (which depends on where the test command was
// invoked from).
loadEnv({ path: path.resolve(__dirname, "../../.env.local") });

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "dot" : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  webServer: {
    // A dedicated port, separate from `pnpm dev`'s default 3000 — so the e2e
    // suite can run its own server instance (against the same real Supabase
    // project) without colliding with a dev server you might already have
    // running locally.
    command: `pnpm dev --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    // Specs named *.unauth.spec.ts test what's reachable without a session
    // (login page, redirect guards) — they intentionally skip the "setup"
    // dependency so they run with a clean, logged-out browser context.
    { name: "unauthenticated", testMatch: /.*\.unauth\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
    {
      name: "authenticated",
      testMatch: /.*\.spec\.ts/,
      testIgnore: /.*\.unauth\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/user.json" },
      dependencies: ["setup"],
    },
  ],
});
