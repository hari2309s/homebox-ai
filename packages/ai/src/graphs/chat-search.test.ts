import { describe, expect, it } from "vitest";

import { looksLikeLeakedToolCall } from "./chat-search";

const TOOL_NAMES = [
  "search_items",
  "get_item",
  "list_locations",
  "list_labels",
  "create_location",
  "create_item",
  "update_item",
];

describe("looksLikeLeakedToolCall", () => {
  it("passes through an ordinary conversational reply", () => {
    expect(looksLikeLeakedToolCall("Here's what I found in your kitchen: a Fridge and a Toaster.", TOOL_NAMES)).toBe(
      false,
    );
  });

  it("passes through a reply that mentions a tool-ish word in prose", () => {
    expect(looksLikeLeakedToolCall("I've added the Garage location for you.", TOOL_NAMES)).toBe(false);
  });

  it("catches a real-world leaked pseudo-XML function call", () => {
    const leaked = '<function:update_item>{"itemId": "abc123", "locationName": "Shed"}</function>';
    expect(looksLikeLeakedToolCall(leaked, TOOL_NAMES)).toBe(true);
  });

  it("catches other common leaked tool-call markup styles", () => {
    expect(looksLikeLeakedToolCall('<tool_call>{"name": "create_item"}</tool_call>', TOOL_NAMES)).toBe(true);
    expect(looksLikeLeakedToolCall("<|tool_use|>create_item({...})", TOOL_NAMES)).toBe(true);
  });

  it("catches a bare function-call-looking invocation of a real tool name", () => {
    expect(looksLikeLeakedToolCall('create_item({"name": "Lawnmower"})', TOOL_NAMES)).toBe(true);
    expect(looksLikeLeakedToolCall('update_item(itemId="abc123")', TOOL_NAMES)).toBe(true);
  });

  it("does not false-positive on a tool name followed by punctuation that isn't a call", () => {
    expect(looksLikeLeakedToolCall("You can use create_item to add things, or ask me directly.", TOOL_NAMES)).toBe(
      false,
    );
  });
});
