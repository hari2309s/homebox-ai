import { describe, expect, it } from "vitest";

import { householdUserLabel } from "./household";

describe("householdUserLabel", () => {
  it("labels the caller themselves as Myself, regardless of email", () => {
    expect(householdUserLabel({ userId: "u1", email: "me@example.com", isSelf: true })).toBe("Myself");
  });

  it("labels another member by their email", () => {
    expect(householdUserLabel({ userId: "u2", email: "spouse@example.com", isSelf: false })).toBe("spouse@example.com");
  });

  it("falls back to 'Family member' when another member has no email on record", () => {
    expect(householdUserLabel({ userId: "u3", email: null, isSelf: false })).toBe("Family member");
  });
});
