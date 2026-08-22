import { describe, expect, it } from "vitest";

import { safeRedirect } from "./safe-redirect";

describe("safeRedirect", () => {
  it("passes through a same-origin relative path", () => {
    expect(safeRedirect("/join/abc123")).toBe("/join/abc123");
  });

  it("defaults to /items when null", () => {
    expect(safeRedirect(null)).toBe("/items");
  });

  it("defaults to /items for an empty string", () => {
    expect(safeRedirect("")).toBe("/items");
  });

  it("defaults to /items for a path not starting with /", () => {
    expect(safeRedirect("items")).toBe("/items");
    expect(safeRedirect("evil.com/items")).toBe("/items");
  });

  it("blocks a protocol-relative URL (//host) open-redirect attempt", () => {
    expect(safeRedirect("//evil.com")).toBe("/items");
    expect(safeRedirect("//evil.com/phishing")).toBe("/items");
  });

  it("blocks an absolute URL disguised as a path", () => {
    expect(safeRedirect("https://evil.com")).toBe("/items");
  });

  it("blocks a backslash open-redirect attempt (browsers treat \\ like / in a URL path)", () => {
    expect(safeRedirect("/\\evil.com")).toBe("/items");
    expect(safeRedirect("/\\evil.com/phishing")).toBe("/items");
  });

  it("preserves a query string and hash on an otherwise-safe path", () => {
    expect(safeRedirect("/join/abc123?ref=email#top")).toBe("/join/abc123?ref=email#top");
  });
});
