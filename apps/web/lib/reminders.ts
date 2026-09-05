import { sharingQueries } from "@homebox-ai/db";

import type { HouseholdUser } from "./household";

/** Pure predicate, injected household list — see cycle.ts's wouldFormCycle for the same shape, kept unit-testable without a DB. */
export function isAssignableToHousehold(
  householdUsers: HouseholdUser[],
  assignedToUserId: string | undefined,
): boolean {
  if (!assignedToUserId) return true;
  return householdUsers.some((person) => person.userId === assignedToUserId);
}

/**
 * Reminders can only be assigned to someone with access to the caller's
 * household. Without this check, a tampered `assignedToUserId` still passes
 * the DB's FK (any real auth.users id satisfies it) and the reminder-check
 * cron would later write a proactive chat message straight into an unrelated
 * user's chat history about a household they have nothing to do with.
 */
export async function assertAssignableToHousehold(userId: string, assignedToUserId: string | undefined): Promise<void> {
  if (!assignedToUserId) return;
  const householdUsers = await sharingQueries.listHouseholdUsers(userId);
  if (!isAssignableToHousehold(householdUsers, assignedToUserId)) {
    throw new Error("Can't assign a reminder to someone outside your household");
  }
}
