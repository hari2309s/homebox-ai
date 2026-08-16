import { test, expect } from "@playwright/test";

// Unique per run so repeated/parallel runs against the shared e2e account
// never collide with each other's leftover data.
function uniqueName(label: string) {
  return `${label} ${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

test("create an item, see it in the list, open it, then delete it", async ({ page }) => {
  const name = uniqueName("E2E Item");

  await page.goto("/items");
  await page.getByPlaceholder("New item name").fill(name);
  await page.getByRole("button", { name: "Add" }).click();

  const row = page.getByRole("link", { name: new RegExp(name) });
  await expect(row).toBeVisible();

  await row.click();
  await expect(page.getByRole("heading", { name })).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete" }).click();

  await expect(page).toHaveURL("/items");
  await expect(page.getByRole("link", { name: new RegExp(name) })).toHaveCount(0);
});

test("editing an item's fields persists after reload", async ({ page }) => {
  const name = uniqueName("E2E Editable Item");

  await page.goto("/items");
  await page.getByPlaceholder("New item name").fill(name);
  await page.getByRole("button", { name: "Add" }).click();
  await page.getByRole("link", { name: new RegExp(name) }).click();

  await page.getByLabel("Manufacturer").fill("Acme Corp");
  await page.getByRole("button", { name: "Save changes" }).click();
  // The save is a client-invoked Server Action (SubmitButton shows a spinner
  // via useFormStatus while it's in flight) — wait for that round-trip to
  // actually finish before reloading, or the reload can race ahead of it.
  await page.waitForLoadState("networkidle");

  await page.reload();
  await expect(page.getByLabel("Manufacturer")).toHaveValue("Acme Corp");

  // Clean up so this test's data doesn't accumulate on the shared account.
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page).toHaveURL("/items");
});
