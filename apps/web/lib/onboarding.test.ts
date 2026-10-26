import { describe, expect, it } from "vitest";

import { needsOnboarding } from "./onboarding";

const empty = { places: 0, things: 0, householdSize: 1 };

describe("needsOnboarding", () => {
  it("sends a brand-new owner through onboarding", () => {
    expect(needsOnboarding({}, empty)).toBe(true);
    expect(needsOnboarding(undefined, empty)).toBe(true);
  });

  it("skips anyone who finished or skipped it", () => {
    expect(needsOnboarding({ onboarded_at: "2026-10-26T10:00:00Z" }, empty)).toBe(false);
  });

  it("skips someone on their way into a household via an invite", () => {
    expect(needsOnboarding({ pending_join: "/join/abc" }, empty)).toBe(false);
  });

  it("skips accounts that already have places, things or household members", () => {
    expect(needsOnboarding({}, { ...empty, places: 1 })).toBe(false);
    expect(needsOnboarding({}, { ...empty, things: 3 })).toBe(false);
    expect(needsOnboarding({}, { ...empty, householdSize: 2 })).toBe(false);
  });
});
