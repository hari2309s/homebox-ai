import { test as setup, expect } from "@playwright/test";

const AUTH_FILE = "e2e/.auth/user.json";

/**
 * Runs once before the "authenticated" project's specs (see
 * playwright.config.ts's `dependencies: ["setup"]`), signs in the dedicated
 * e2e test account through the real login form, and saves the resulting
 * session as storage state for every authenticated spec to reuse — so each
 * spec starts already logged in instead of re-running the login flow itself.
 */
setup("authenticate", async ({ page }) => {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "E2E_TEST_EMAIL and E2E_TEST_PASSWORD must be set (in .env.local) to run authenticated e2e specs — " +
        "see .env.example for what these are and how the account was created.",
    );
  }

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL("/items");
  await page.context().storageState({ path: AUTH_FILE });
});
