import { describe, expect, it } from "vitest";

import {
  containerFor,
  descendantIds,
  fitView,
  inferKind,
  innermostAt,
  intersects,
  layoutPlan,
  type PlanLocationInput,
} from "./plan-layout";

function loc(
  id: string,
  name: string,
  parentId: string | null = null,
  rect?: [number, number, number, number],
  planKind: string | null = null,
): PlanLocationInput {
  return {
    id,
    name,
    parentId,
    planKind,
    planX: rect?.[0] ?? null,
    planY: rect?.[1] ?? null,
    planW: rect?.[2] ?? null,
    planH: rect?.[3] ?? null,
  };
}

describe("inferKind", () => {
  it("recognises common zones by name", () => {
    expect(inferKind("Garage", null)).toBe("garage");
    expect(inferKind("Back garden", null)).toBe("garden");
    expect(inferKind("Garden shed", null)).toBe("shed");
    expect(inferKind("Koi pond", "garden")).toBe("pond");
    expect(inferKind("Driveway", null)).toBe("drive");
    expect(inferKind("House", null)).toBe("house");
  });

  it("uses the parent for otherwise plain names", () => {
    expect(inferKind("Kitchen", "house")).toBe("room");
    expect(inferKind("Raised beds", "garden")).toBe("bed");
    expect(inferKind("Top rack", "garage")).toBe("area");
    expect(inferKind("Storage unit", null)).toBe("area");
  });
});

describe("layoutPlan", () => {
  it("keeps stored geometry and kind", () => {
    const [p] = layoutPlan([loc("a", "Kitchen", null, [10, 20, 100, 80], "room")]);
    expect(p).toMatchObject({ kind: "room", stored: true, rect: { x: 10, y: 20, w: 100, h: 80 } });
  });

  it("suggests non-overlapping spots for unplaced top-level zones", () => {
    const places = layoutPlan([
      loc("h", "House"),
      loc("g", "Garden"),
      loc("c", "Garage"),
      loc("s", "Shed"),
      loc("x", "Storage"),
      loc("y", "Loft store"),
    ]);
    const tops = places.filter((p) => p.depth === 0);
    expect(tops.every((p) => !p.stored)).toBe(true);
    for (const a of tops) for (const b of tops) if (a !== b) expect(intersects(a.rect, b.rect)).toBe(false);
  });

  it("does not drop a suggestion on top of a stored zone", () => {
    const places = layoutPlan([loc("h", "House", null, [40, 300, 520, 330], "house"), loc("h2", "Cottage")]);
    const [stored, suggested] = [places.find((p) => p.id === "h")!, places.find((p) => p.id === "h2")!];
    expect(intersects(stored.rect, suggested.rect)).toBe(false);
  });

  it("lays children out inside their parent", () => {
    const places = layoutPlan([
      loc("h", "House", null, [0, 0, 400, 300]),
      loc("k", "Kitchen", "h"),
      loc("l", "Living", "h"),
      loc("b", "Bath", "h"),
    ]);
    const house = places.find((p) => p.id === "h")!;
    for (const id of ["k", "l", "b"]) {
      const room = places.find((p) => p.id === id)!;
      expect(room.depth).toBe(1);
      expect(room.kind).toBe("room");
      expect(room.rect.x).toBeGreaterThanOrEqual(house.rect.x);
      expect(room.rect.x + room.rect.w).toBeLessThanOrEqual(house.rect.x + house.rect.w);
      expect(room.rect.y + room.rect.h).toBeLessThanOrEqual(house.rect.y + house.rect.h);
    }
  });

  it("still draws places caught in a parent cycle", () => {
    const places = layoutPlan([loc("a", "A", "b"), loc("b", "B", "a")]);
    expect(places.map((p) => p.id).sort()).toEqual(["a", "b"]);
  });
});

describe("hit testing", () => {
  const places = layoutPlan([
    loc("h", "House", null, [0, 0, 400, 300], "house"),
    loc("k", "Kitchen", "h", [10, 10, 100, 100], "room"),
    loc("p", "Pantry", "k", [20, 20, 30, 30], "room"),
  ]);

  it("finds the deepest place under a point", () => {
    expect(innermostAt(places, 25, 25)?.id).toBe("p");
    expect(innermostAt(places, 80, 80)?.id).toBe("k");
    expect(innermostAt(places, 300, 200)?.id).toBe("h");
    expect(innermostAt(places, 500, 500)).toBeNull();
  });

  it("ignores excluded places", () => {
    expect(innermostAt(places, 25, 25, new Set(["p"]))?.id).toBe("k");
  });

  it("picks the smallest place containing a drawn rect", () => {
    expect(containerFor(places, { x: 60, y: 60, w: 20, h: 20 })?.id).toBe("k");
    expect(containerFor(places, { x: 150, y: 150, w: 50, h: 50 })?.id).toBe("h");
    expect(containerFor(places, { x: 350, y: 250, w: 100, h: 100 })).toBeNull();
  });

  it("collects all descendants", () => {
    expect([...descendantIds(places, "h")].sort()).toEqual(["k", "p"]);
  });
});

describe("fitView", () => {
  it("centres a rect in the viewport", () => {
    const v = fitView({ x: 0, y: 0, w: 100, h: 50 }, 220, 220, 10);
    expect(v.scale).toBe(2);
    expect(v.tx).toBe(10);
    expect(v.ty).toBe(60);
  });
});
