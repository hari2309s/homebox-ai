import { test, expect } from "@playwright/test";

// Unique per run so repeated/parallel runs against the shared e2e account
// never collide with each other's leftover data.
function uniqueName(label: string) {
  return `${label} ${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

async function createLocation(page: import("@playwright/test").Page, name: string, parentNameSubstring?: string) {
  await page.getByPlaceholder("New location name").fill(name);
  if (parentNameSubstring) {
    // The dropdown shows full paths ("Grandparent / Parent"), not bare
    // names, so resolve the actual option text rather than assuming it
    // equals parentNameSubstring — a plain string match against a
    // substring silently selects the wrong (or no) option otherwise.
    const select = page.locator('select[name="parentId"]').first();
    const options = await select.locator("option").allTextContents();
    const match = options.find((o) => o.includes(parentNameSubstring));
    expect(match, `expected "${parentNameSubstring}" among the parent dropdown's options`).toBeDefined();
    await select.selectOption({ label: match });
  }
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.getByTestId(`location-row-${name}`)).toBeVisible();
}

async function deleteLocation(page: import("@playwright/test").Page, name: string) {
  const row = page.getByTestId(`location-row-${name}`);
  await row.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByTestId(`location-row-${name}`)).toHaveCount(0);
}

// Regression test for a bug where the location edit form's parent dropdown
// only excluded a location from being its own parent (not its own
// descendant), letting the nesting chain become circular — which crashed
// the whole /locations page (unguarded recursive path-building) on every
// future load. See packages/db/src/cycle.ts and its unit tests for the fix
// at the data layer; this exercises the same fix end-to-end through the UI.
test("rejects re-parenting a location under its own sub-location, without crashing the page", async ({ page }) => {
  const parent = uniqueName("E2E Parent");
  const child = uniqueName("E2E Child");

  await page.goto("/locations");
  await createLocation(page, parent);
  await createLocation(page, child, parent);

  // Attempt to re-parent "parent" under its own child "child" -> should be rejected.
  const parentRow = page.getByTestId(`location-row-${parent}`);
  await parentRow.getByRole("button", { name: "Edit" }).click();
  const select = parentRow.getByRole("combobox");
  const options = await select.locator("option").allTextContents();
  const childOption = options.find((o) => o.includes(child));
  expect(childOption, `expected "${child}" among the parent dropdown's options`).toBeDefined();
  await select.selectOption({ label: childOption });
  await parentRow.getByRole("button", { name: "Save" }).click();

  await expect(parentRow.getByRole("alert")).toHaveText(
    "Can't move a location inside itself or one of its own sub-locations.",
  );
  // The page itself must still be intact — not replaced by Next's uncaught-error page.
  await expect(page.getByPlaceholder("New location name")).toBeVisible();

  await parentRow.getByRole("button", { name: "Cancel" }).click();
  await deleteLocation(page, child);
  await deleteLocation(page, parent);
});

test("allows a legitimate (non-circular) re-parent", async ({ page }) => {
  const grandparent = uniqueName("E2E Grandparent");
  const parent = uniqueName("E2E Middle");
  const mover = uniqueName("E2E Mover");

  await page.goto("/locations");
  await createLocation(page, grandparent);
  await createLocation(page, parent, grandparent);
  await createLocation(page, mover); // top-level, unrelated to the chain above

  const moverRow = page.getByTestId(`location-row-${mover}`);
  await moverRow.getByRole("button", { name: "Edit" }).click();
  const select = moverRow.getByRole("combobox");
  const options = await select.locator("option").allTextContents();
  const parentOption = options.find((o) => o.includes(parent));
  expect(parentOption, `expected "${parent}" among the parent dropdown's options`).toBeDefined();
  await select.selectOption({ label: parentOption });
  await moverRow.getByRole("button", { name: "Save" }).click();

  // Re-parented successfully: the row now shows its full nested path. Scoped
  // to the row itself (by its stable data-testid, not the path text) since
  // that same path text also appears as an <option> elsewhere on the page.
  await expect(page.getByTestId(`location-row-${mover}`)).toContainText(`${grandparent} / ${parent} / ${mover}`);

  await deleteLocation(page, mover);
  await deleteLocation(page, parent);
  await deleteLocation(page, grandparent);
});
