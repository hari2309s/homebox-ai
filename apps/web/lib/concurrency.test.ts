import { describe, expect, it } from "vitest";

import { mapWithConcurrency } from "./concurrency";

describe("mapWithConcurrency", () => {
  it("maps every item and preserves result order regardless of completion order", async () => {
    const delays = [30, 10, 20, 0, 15];
    const result = await mapWithConcurrency(delays, 3, async (delay, index) => {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return index;
    });
    expect(result).toEqual([0, 1, 2, 3, 4]);
  });

  it("never runs more than `concurrency` calls at once", async () => {
    let active = 0;
    let maxActive = 0;

    await mapWithConcurrency(Array.from({ length: 10 }), 3, async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
    });

    expect(maxActive).toBeLessThanOrEqual(3);
  });

  it("handles an empty input", async () => {
    expect(await mapWithConcurrency([], 5, async () => 1)).toEqual([]);
  });

  it("handles concurrency greater than the item count", async () => {
    expect(await mapWithConcurrency([1, 2], 10, async (n) => n * 2)).toEqual([2, 4]);
  });
});
