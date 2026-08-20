import { describe, expect, it } from "vitest";

import { isTheme, nextTheme } from "./theme";

describe("nextTheme", () => {
  it("cycles system -> light -> dark -> system", () => {
    expect(nextTheme("system")).toBe("light");
    expect(nextTheme("light")).toBe("dark");
    expect(nextTheme("dark")).toBe("system");
  });
});

describe("isTheme", () => {
  it("accepts the three valid theme values", () => {
    expect(isTheme("system")).toBe(true);
    expect(isTheme("light")).toBe(true);
    expect(isTheme("dark")).toBe(true);
  });

  it("rejects anything else, including null/undefined", () => {
    expect(isTheme("auto")).toBe(false);
    expect(isTheme("")).toBe(false);
    expect(isTheme(null)).toBe(false);
    expect(isTheme(undefined)).toBe(false);
  });
});
