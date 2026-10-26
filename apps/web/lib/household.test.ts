import { describe, expect, it } from "vitest";

import { householdUserLabel } from "./household";

describe("householdUserLabel", () => {
  it("labels the caller themselves as Myself, regardless of email", () => {
    expect(
      householdUserLabel({ userId: "u1", email: "me@example.com", isSelf: true, relationship: null, name: null }),
    ).toBe("Myself");
  });

  it("labels another member by their email", () => {
    expect(
      householdUserLabel({ userId: "u2", email: "spouse@example.com", isSelf: false, relationship: null, name: null }),
    ).toBe("spouse@example.com");
  });

  it("adds the relationship after another member's email", () => {
    expect(
      householdUserLabel({
        userId: "u4",
        email: "kid@example.com",
        isSelf: false,
        relationship: "Daughter",
        name: null,
      }),
    ).toBe("kid@example.com (Daughter)");
  });

  it("prefers the member's display name over their email", () => {
    expect(
      householdUserLabel({
        userId: "u5",
        email: "dora@example.com",
        isSelf: false,
        relationship: "Wife",
        name: "Dora",
      }),
    ).toBe("Dora (Wife)");
  });

  it("falls back to 'Family member' when another member has no email on record", () => {
    expect(householdUserLabel({ userId: "u3", email: null, isSelf: false, relationship: null, name: null })).toBe(
      "Family member",
    );
  });
});
