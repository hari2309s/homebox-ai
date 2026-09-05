import { test, expect } from "@playwright/test";

// Only one persistent e2e account exists, so this covers the owner-side
// invite lifecycle (create → visible as pending → revoke). Accepting an
// invite as a second household member would need a second real account and
// isn't covered here.
test("creating an invite shows it as pending, and revoking it removes it", async ({ page }) => {
  await page.goto("/settings");

  // Counts relative to whatever's already pending, rather than assuming a
  // clean slate — a prior run that failed before its own cleanup can leave
  // invites behind (see e2e/README's note on this), and this should still
  // pass rather than flake on that leftover state.
  const inviteRows = page.locator("li").filter({ hasText: "Pending invite" });
  const before = await inviteRows.count();

  await page.getByRole("button", { name: "Invite a family member" }).click();
  await expect(inviteRows).toHaveCount(before + 1);

  await inviteRows.last().getByRole("button", { name: "Revoke" }).click();
  await expect(inviteRows).toHaveCount(before);
});
