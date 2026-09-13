import { describe, expect, it } from "vitest";

import { formatDate } from "./date";

describe("formatDate", () => {
  it("formats a YYYY-MM-DD string as a local date", () => {
    const expected = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(2026, 0, 15));
    expect(formatDate("2026-01-15")).toBe(expected);
  });

  it("returns the input unchanged if it isn't a parseable date", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date");
    expect(formatDate("")).toBe("");
  });
});
