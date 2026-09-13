import { describe, expect, it } from "vitest";

import { chunkIntoRows, columnsForWidth } from "./grid-columns";

describe("columnsForWidth", () => {
  it("returns the base column count below the smallest breakpoint", () => {
    expect(columnsForWidth(0)).toBe(2);
    expect(columnsForWidth(639)).toBe(2);
  });

  it("switches exactly at each breakpoint boundary", () => {
    expect(columnsForWidth(640)).toBe(3);
    expect(columnsForWidth(767)).toBe(3);
    expect(columnsForWidth(768)).toBe(4);
    expect(columnsForWidth(1023)).toBe(4);
    expect(columnsForWidth(1024)).toBe(5);
  });

  it("stays at the largest column count above the top breakpoint", () => {
    expect(columnsForWidth(2000)).toBe(5);
  });
});

describe("chunkIntoRows", () => {
  it("splits evenly-divisible items into full rows", () => {
    expect(chunkIntoRows([1, 2, 3, 4], 2)).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it("leaves a short final row when items don't divide evenly", () => {
    expect(chunkIntoRows([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("returns one row per item when there are fewer items than columns", () => {
    expect(chunkIntoRows([1, 2], 5)).toEqual([[1, 2]]);
  });

  it("returns an empty list of rows for no items", () => {
    expect(chunkIntoRows([], 3)).toEqual([]);
  });

  it("falls back to one item per row for a non-positive column count", () => {
    expect(chunkIntoRows([1, 2], 0)).toEqual([[1], [2]]);
  });
});
