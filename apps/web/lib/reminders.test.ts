import { describe, expect, it } from "vitest";

import { isAssignableToHousehold } from "./reminders";
import type { HouseholdUser } from "./household";

const household: HouseholdUser[] = [
  { userId: "owner", email: "owner@example.com", isSelf: true },
  { userId: "member", email: "member@example.com", isSelf: false },
];

describe("isAssignableToHousehold", () => {
  it("allows leaving a reminder unassigned", () => {
    expect(isAssignableToHousehold(household, undefined)).toBe(true);
  });

  it("allows assigning to the caller (self)", () => {
    expect(isAssignableToHousehold(household, "owner")).toBe(true);
  });

  it("allows assigning to another member of the same household", () => {
    expect(isAssignableToHousehold(household, "member")).toBe(true);
  });

  it("rejects a user id outside the household — the tampered-assignedToUserId case", () => {
    expect(isAssignableToHousehold(household, "someone-elses-account")).toBe(false);
  });

  it("rejects everything for a household with no members", () => {
    expect(isAssignableToHousehold([], "anyone")).toBe(false);
  });
});
