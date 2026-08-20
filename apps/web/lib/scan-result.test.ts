import { describe, expect, it } from "vitest";

import { parseScanResult } from "./scan-result";

const ORIGIN = "https://homebox-ai.example";

describe("parseScanResult", () => {
  it("recognizes a same-origin item URL", () => {
    const itemId = "1a2b3c4d-5e6f-7890-abcd-ef1234567890";
    expect(parseScanResult(`${ORIGIN}/items/${itemId}`, ORIGIN)).toEqual({ type: "item", itemId });
  });

  it("recognizes a same-origin item URL with a trailing slash", () => {
    const itemId = "1a2b3c4d-5e6f-7890-abcd-ef1234567890";
    expect(parseScanResult(`${ORIGIN}/items/${itemId}/`, ORIGIN)).toEqual({ type: "item", itemId });
  });

  it("falls back to search for a same-origin URL that isn't an item page", () => {
    expect(parseScanResult(`${ORIGIN}/settings`, ORIGIN)).toEqual({ type: "search", query: `${ORIGIN}/settings` });
  });

  it("falls back to search for a URL from a different origin", () => {
    const url = "https://evil.example/items/1a2b3c4d-5e6f-7890-abcd-ef1234567890";
    expect(parseScanResult(url, ORIGIN)).toEqual({ type: "search", query: url });
  });

  it("falls back to search for a plain (non-URL) barcode payload", () => {
    expect(parseScanResult("012345678905", ORIGIN)).toEqual({ type: "search", query: "012345678905" });
  });
});
