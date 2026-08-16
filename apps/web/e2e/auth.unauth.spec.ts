import { test, expect } from "@playwright/test";

test.describe("login page", () => {
  test("renders the sign-in form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test("switches to the sign-up form and back", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Need an account? Sign up" }).click();
    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
    await expect(page.getByLabel("Name")).toBeVisible();
    await expect(page.getByLabel("Confirm password")).toBeVisible();

    await page.getByRole("button", { name: "Already have an account? Sign in" }).click();
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  });

  test("rejects a sign-up with mismatched passwords without hitting the network", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Need an account? Sign up" }).click();
    await page.getByLabel("Name").fill("Test User");
    await page.getByLabel("Email").fill(`mismatch-${Date.now()}@example.com`);
    await page.getByLabel("Password", { exact: true }).fill("Password123!");
    await page.getByLabel("Confirm password").fill("Different123!");
    await page.getByRole("button", { name: "Create account" }).click();
    // Next.js's own route-announcer live region also has role="alert" (empty
    // text), so scope to the form's error message specifically.
    await expect(page.getByText("Passwords don't match.")).toBeVisible();
  });

  test("shows a live checklist and rejects a sign-up password missing a required character class", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Need an account? Sign up" }).click();

    // Below the minimum length: the browser's own `minLength` constraint
    // blocks submission before our JS validation ever runs, so this checks
    // the checklist reacts rather than submitting.
    await page.getByLabel("Password", { exact: true }).fill("short1A");
    await expect(page.getByText("At least 10 characters")).toBeVisible();

    // Long enough but missing several required classes (no uppercase, no
    // number, no symbol) — passes the native minLength check, so this
    // exercises our own JS rule instead.
    await page.getByLabel("Name").fill("Test User");
    await page.getByLabel("Email").fill(`weak-${Date.now()}@example.com`);
    await page.getByLabel("Password", { exact: true }).fill("onlylowercaseletters");
    await page.getByLabel("Confirm password").fill("onlylowercaseletters");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText(/Password must be at least 10 characters/)).toBeVisible();
  });
});

test.describe("forgot password", () => {
  test("links to and from the request-reset page", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "Forgot password?" }).click();
    await expect(page).toHaveURL("/forgot-password");
    await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();

    await page.getByRole("link", { name: "Back to sign in" }).click();
    await expect(page).toHaveURL("/login");
  });

  test("shows a confirmation after requesting a reset link", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.getByLabel("Email").fill(`forgot-${Date.now()}@example.com`);
    await page.getByRole("button", { name: "Send reset link" }).click();
    // Same message regardless of whether the address is registered, so this
    // doesn't assert anything about the (nonexistent) test account itself.
    await expect(page.getByText(/If an account exists for that email/)).toBeVisible();
  });
});

test.describe("auth guard", () => {
  test("redirects an unauthenticated visit to a protected route, preserving it as redirectTo", async ({ page }) => {
    await page.goto("/items");
    await expect(page).toHaveURL(/\/login\?redirectTo=%2Fitems$/);
  });

  test("preserves a /join/[token] invite link through the login redirect", async ({ page }) => {
    await page.goto("/join/some-test-token");
    await expect(page).toHaveURL(/\/login\?redirectTo=%2Fjoin%2Fsome-test-token$/);
  });

  test("redirects an unauthenticated visit to /reset-password", async ({ page }) => {
    // Only reachable with a real session (established by /auth/callback
    // after the emailed recovery link) — visiting cold with no session at
    // all should bounce to login like any other protected route.
    await page.goto("/reset-password");
    await expect(page).toHaveURL(/\/login\?redirectTo=%2Freset-password$/);
  });

  test("signing in from a preserved redirectTo lands back on the original page", async ({ page }) => {
    const email = process.env.E2E_TEST_EMAIL;
    const password = process.env.E2E_TEST_PASSWORD;
    test.skip(!email || !password, "E2E_TEST_EMAIL/E2E_TEST_PASSWORD not set");

    await page.goto("/locations");
    await expect(page).toHaveURL(/\/login\?redirectTo=%2Flocations$/);

    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password", { exact: true }).fill(password!);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL("/locations");
  });
});
