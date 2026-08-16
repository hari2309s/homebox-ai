import { describe, expect, it } from "vitest";

import { wouldFormCycle } from "./cycle";

/** Builds a sync getParentId lookup from a plain id -> parentId map, so these tests need no DB/mocking. */
function chainOf(edges: Record<string, string | null>) {
  return (id: string) => edges[id] ?? null;
}

describe("wouldFormCycle", () => {
  it("allows re-parenting under an unrelated top-level node", async () => {
    const getParentId = chainOf({ home: null, kitchen: null });
    expect(await wouldFormCycle("kitchen", "home", getParentId)).toBe(false);
  });

  it("allows re-parenting deeper into a valid, non-overlapping chain", async () => {
    // home -> ground floor -> pantry; moving "kitchen" under "pantry" doesn't touch kitchen's own subtree.
    const getParentId = chainOf({ home: null, "ground floor": "home", pantry: "ground floor", kitchen: null });
    expect(await wouldFormCycle("kitchen", "pantry", getParentId)).toBe(false);
  });

  it("rejects a direct self-parent", async () => {
    const getParentId = chainOf({ home: null });
    expect(await wouldFormCycle("home", "home", getParentId)).toBe(true);
  });

  it("rejects a 2-node cycle (parent is already this node's child)", async () => {
    // home -> ground floor. Re-parenting home under ground floor would close the loop.
    const getParentId = chainOf({ home: null, "ground floor": "home" });
    expect(await wouldFormCycle("home", "ground floor", getParentId)).toBe(true);
  });

  it("rejects an indirect cycle through a grandchild", async () => {
    // home -> ground floor -> pantry. Re-parenting home under pantry would close a 3-node loop.
    const getParentId = chainOf({ home: null, "ground floor": "home", pantry: "ground floor" });
    expect(await wouldFormCycle("home", "pantry", getParentId)).toBe(true);
  });

  it("doesn't hang on a pre-existing cycle unrelated to the node being moved", async () => {
    // a <-> b already form a cycle (bad data from before this check existed).
    // Moving unrelated node "c" under "a" should resolve without looping forever.
    const getParentId = chainOf({ a: "b", b: "a", c: null });
    expect(await wouldFormCycle("c", "a", getParentId)).toBe(false);
  });

  it("supports an async getParentId (real DB lookups)", async () => {
    const edges: Record<string, string | null> = { home: null, "ground floor": "home" };
    const getParentId = async (id: string) => edges[id] ?? null;
    expect(await wouldFormCycle("kitchen", "ground floor", getParentId)).toBe(false);
    expect(await wouldFormCycle("home", "ground floor", getParentId)).toBe(true);
  });
});
