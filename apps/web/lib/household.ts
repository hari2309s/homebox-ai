import type { sharingQueries } from "@homebox-ai/db";

export type HouseholdUser = sharingQueries.HouseholdUser;

/** Display label for a household member in assignee pickers/legends, shared by every reminder/maintenance UI that lists them. */
export function householdUserLabel(person: HouseholdUser): string {
  if (person.isSelf) return "Myself";
  const who = person.email ?? "Family member";
  return person.relationship ? `${who} (${person.relationship})` : who;
}
