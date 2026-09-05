import { test, expect } from "@playwright/test";

// Unique per run so repeated/parallel runs against the shared e2e account
// never collide with each other's leftover data.
function uniqueName(label: string) {
  return `${label} ${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

test("adding a reminder collapses the form and lists it under today, then it can be completed, reopened, and deleted", async ({
  page,
}) => {
  const title = uniqueName("E2E Reminder");

  await page.goto("/calendar");

  // The add-reminder form is docked and collapsed by default behind a toggle.
  await page.getByRole("button", { name: "+ Add reminder" }).click();
  await page.getByPlaceholder("What needs doing").fill(title);
  await page.getByRole("button", { name: "Add reminder", exact: true }).click();

  // Regression coverage for the bug where CrudShell-style docked forms never
  // collapsed back after a successful submit — the toggle should reappear,
  // not stay expanded with a blank form on top of the newly-added reminder.
  await expect(page.getByRole("button", { name: "+ Add reminder" })).toBeVisible();

  // Due date defaults to whatever day is selected (today, on first load), so
  // the new reminder shows up in that day's list without changing months.
  const row = page.locator("li").filter({ hasText: title });
  await expect(row).toBeVisible();
  await expect(row.getByText("Assigned to Myself")).toBeVisible();

  await row.getByRole("button", { name: "Done" }).click();
  await expect(row.getByRole("button", { name: "Reopen" })).toBeVisible();

  await row.getByRole("button", { name: "Reopen" }).click();
  await expect(row.getByRole("button", { name: "Done" })).toBeVisible();

  await row.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.locator("li").filter({ hasText: title })).toHaveCount(0);
});

test("a reminder can be left unassigned instead of defaulting to the current user", async ({ page }) => {
  const title = uniqueName("E2E Unassigned Reminder");

  await page.goto("/calendar");
  await page.getByRole("button", { name: "+ Add reminder" }).click();
  await page.getByPlaceholder("What needs doing").fill(title);
  await page.locator('select[name="assignedToUserId"]').selectOption({ label: "Unassigned" });
  await page.getByRole("button", { name: "Add reminder", exact: true }).click();

  const row = page.locator("li").filter({ hasText: title });
  await expect(row.getByText("Assigned to Unassigned")).toBeVisible();

  // Clean up so this test's data doesn't accumulate on the shared account.
  await row.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.locator("li").filter({ hasText: title })).toHaveCount(0);
});
