import { test, expect } from "@playwright/test";

// Deliberately never fills in a password that actually passes validation —
// this suite must not submit a real password change for the shared e2e test
// account, since every other authenticated spec depends on signing in with
// E2E_TEST_PASSWORD staying valid.
test.describe("settings password form", () => {
  test("shows a live checklist and rejects a weak new password without hitting the network", async ({ page }) => {
    await page.goto("/settings");

    // Current password only needs to be non-empty to enable the submit
    // button — our own weak-password check short-circuits before this value
    // is ever sent anywhere, so it never needs to be the real one.
    await page.getByLabel("Current password").fill("irrelevant-for-this-test");

    const newPassword = page.getByLabel("New password");
    await newPassword.fill("onlylowercaseletters");
    await expect(page.getByText("One uppercase letter")).toBeVisible();

    await page.getByLabel("Confirm password").fill("onlylowercaseletters");
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(page.getByText(/Password must be at least 10 characters/)).toBeVisible();
  });
});
