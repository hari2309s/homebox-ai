/** Plot space for the site plan. Stored geometry (locations.plan_*, items.plan_*) uses these units. */
export const PLOT_W = 1200;
export const PLOT_H = 760;

export const PLAN_KINDS = [
  { kind: "house", label: "House", icon: "home" },
  { kind: "room", label: "Room", icon: "meeting_room" },
  { kind: "garden", label: "Garden", icon: "yard" },
  { kind: "bed", label: "Bed", icon: "grass" },
  { kind: "pond", label: "Pond", icon: "water" },
  { kind: "tree", label: "Tree", icon: "park" },
  { kind: "garage", label: "Garage", icon: "garage" },
  { kind: "shed", label: "Shed", icon: "cottage" },
  { kind: "drive", label: "Drive", icon: "directions_car" },
  { kind: "area", label: "Area", icon: "crop_square" },
] as const;

export type PlanKind = (typeof PLAN_KINDS)[number]["kind"];

export function isPlanKind(value: string | null | undefined): value is PlanKind {
  return PLAN_KINDS.some((k) => k.kind === value);
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PlanLocationInput {
  id: string;
  name: string;
  parentId: string | null;
  planKind: string | null;
  planX: number | null;
  planY: number | null;
  planW: number | null;
  planH: number | null;
}

export interface PlacedPlace {
  id: string;
  name: string;
  parentId: string | null;
  kind: PlanKind;
  rect: Rect;
  /** False when the rect is a suggestion the user hasn't saved yet (drawn with dashed walls). */
  stored: boolean;
  depth: number;
}

const has = (name: string, words: string[]) => words.some((w) => new RegExp(`\\b${w}`, "i").test(name));

export function inferKind(name: string, parentKind: PlanKind | null): PlanKind {
  if (has(name, ["garage", "carport"])) return "garage";
  if (has(name, ["shed", "workshop", "greenhouse", "outbuilding", "summerhouse"])) return "shed";
  if (has(name, ["pond", "pool", "fountain"])) return "pond";
  if (has(name, ["tree", "orchard", "oak", "hedge"])) return "tree";
  if (has(name, ["drive", "parking", "porch", "front"])) return "drive";
  if (has(name, ["bed", "border", "veg", "allotment", "planter"]) && parentKind !== "house" && parentKind !== "room")
    return "bed";
  if (has(name, ["garden", "yard", "lawn", "patio", "terrace", "backyard"]))
    return parentKind === "garden" ? "bed" : "garden";
  if (has(name, ["house", "home", "flat", "apartment", "cottage", "bungalow"])) return parentKind ? "room" : "house";
  if (parentKind === "house" || parentKind === "room") return "room";
  if (parentKind === "garden") return "bed";
  return parentKind ? "area" : "area";
}

export function intersects(a: Rect, b: Rect, gap = 0): boolean {
  return a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;
}

export function containsPoint(r: Rect, x: number, y: number): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function containsRect(outer: Rect, inner: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.w <= outer.x + outer.w &&
    inner.y + inner.h <= outer.y + outer.h
  );
}

export function rectFromPoints(ax: number, ay: number, bx: number, by: number): Rect {
  return { x: Math.min(ax, bx), y: Math.min(ay, by), w: Math.abs(bx - ax), h: Math.abs(by - ay) };
}

export function clampToPlot(r: Rect): Rect {
  const w = Math.min(r.w, PLOT_W);
  const h = Math.min(r.h, PLOT_H);
  return { x: Math.max(0, Math.min(PLOT_W - w, r.x)), y: Math.max(0, Math.min(PLOT_H - h, r.y)), w, h };
}

const TOP_SLOTS: Partial<Record<PlanKind, Rect>> = {
  house: { x: 40, y: 300, w: 520, h: 330 },
  garden: { x: 40, y: 40, w: 760, h: 220 },
  garage: { x: 590, y: 300, w: 190, h: 330 },
  shed: { x: 960, y: 60, w: 200, h: 150 },
  drive: { x: 820, y: 470, w: 340, h: 160 },
};

const FALLBACK_SIZE: Record<PlanKind, { w: number; h: number }> = {
  house: { w: 420, h: 280 },
  room: { w: 140, h: 110 },
  garden: { w: 420, h: 200 },
  bed: { w: 140, h: 70 },
  pond: { w: 160, h: 100 },
  tree: { w: 90, h: 90 },
  garage: { w: 190, h: 260 },
  shed: { w: 180, h: 130 },
  drive: { w: 300, h: 140 },
  area: { w: 200, h: 150 },
};

function findFreeSpot(size: { w: number; h: number }, taken: Rect[], bounds: Rect, step = 20): Rect | null {
  for (let y = bounds.y; y + size.h <= bounds.y + bounds.h; y += step) {
    for (let x = bounds.x; x + size.w <= bounds.x + bounds.w; x += step) {
      const candidate = { x, y, ...size };
      if (!taken.some((t) => intersects(t, candidate, 16))) return candidate;
    }
  }
  return null;
}

function hasStoredRect(l: PlanLocationInput): boolean {
  return l.planX != null && l.planY != null && l.planW != null && l.planH != null && l.planW > 0 && l.planH > 0;
}

/**
 * Turns the flat location list into drawable places. Places with saved geometry keep it; the rest get a
 * suggested spot — top-level zones in a typical plot arrangement, sub-places in a grid inside their parent.
 */
export function layoutPlan(locations: PlanLocationInput[]): PlacedPlace[] {
  const byId = new Map(locations.map((l) => [l.id, l]));
  const childrenOf = new Map<string | null, PlanLocationInput[]>();
  for (const l of locations) {
    const parent = l.parentId && byId.has(l.parentId) ? l.parentId : null;
    childrenOf.set(parent, [...(childrenOf.get(parent) ?? []), l]);
  }

  const placed = new Map<string, PlacedPlace>();
  const result: PlacedPlace[] = [];

  function place(l: PlanLocationInput, parent: PlacedPlace | null, rect: Rect, stored: boolean) {
    const kind = isPlanKind(l.planKind) ? l.planKind : inferKind(l.name, parent?.kind ?? null);
    const p: PlacedPlace = {
      id: l.id,
      name: l.name,
      parentId: parent?.id ?? null,
      kind,
      rect,
      stored,
      depth: parent ? parent.depth + 1 : 0,
    };
    placed.set(l.id, p);
    result.push(p);
    return p;
  }

  function layoutLevel(parent: PlacedPlace | null, depthGuard: number) {
    if (depthGuard > 12) return;
    const kids = childrenOf.get(parent?.id ?? null) ?? [];
    const storedKids = kids.filter(hasStoredRect);
    const looseKids = kids.filter((k) => !hasStoredRect(k));
    const taken: Rect[] = storedKids.map((k) => ({ x: k.planX!, y: k.planY!, w: k.planW!, h: k.planH! }));

    for (const k of storedKids) place(k, parent, { x: k.planX!, y: k.planY!, w: k.planW!, h: k.planH! }, true);

    if (!parent) {
      const plot = { x: 20, y: 20, w: PLOT_W - 40, h: PLOT_H - 40 };
      for (const k of looseKids) {
        const kind = isPlanKind(k.planKind) ? k.planKind : inferKind(k.name, null);
        const slot = TOP_SLOTS[kind];
        const rect =
          slot && !taken.some((t) => intersects(t, slot, 8))
            ? slot
            : (findFreeSpot(FALLBACK_SIZE[kind], taken, plot) ??
              findFreeSpot({ w: 140, h: 100 }, taken, plot) ?? { x: 20, y: 20, w: 140, h: 100 });
        taken.push(rect);
        place(k, null, rect, false);
      }
    } else if (looseKids.length > 0) {
      const inner = {
        x: parent.rect.x + 12,
        y: parent.rect.y + 30,
        w: Math.max(40, parent.rect.w - 24),
        h: Math.max(40, parent.rect.h - 42),
      };
      const cols = Math.ceil(Math.sqrt(looseKids.length * (inner.w / inner.h)));
      const rows = Math.ceil(looseKids.length / cols);
      const cellW = inner.w / cols;
      const cellH = inner.h / rows;
      looseKids.forEach((k, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        let rect = { x: inner.x + col * cellW + 4, y: inner.y + row * cellH + 4, w: cellW - 8, h: cellH - 8 };
        const kind = isPlanKind(k.planKind) ? k.planKind : inferKind(k.name, parent.kind);
        if (kind === "tree") {
          const d = Math.min(rect.w, rect.h, 110);
          rect = { x: rect.x + (rect.w - d) / 2, y: rect.y + (rect.h - d) / 2, w: d, h: d };
        }
        place(k, parent, rect, false);
      });
    }

    for (const k of kids) {
      const p = placed.get(k.id);
      if (p) layoutLevel(p, depthGuard + 1);
    }
  }

  layoutLevel(null, 0);

  // Anything unreachable from the roots (a parentId cycle in old data) still gets drawn as a top-level place.
  for (const l of locations) {
    if (!placed.has(l.id)) {
      const rect = hasStoredRect(l)
        ? { x: l.planX!, y: l.planY!, w: l.planW!, h: l.planH! }
        : { x: 20, y: 20, w: 140, h: 100 };
      place(l, null, rect, hasStoredRect(l));
    }
  }

  return result;
}

/** Deepest place under a point — where a dropped thing belongs. */
export function innermostAt(
  places: PlacedPlace[],
  x: number,
  y: number,
  excludeIds: Set<string> = new Set(),
): PlacedPlace | null {
  let best: PlacedPlace | null = null;
  for (const p of places) {
    if (excludeIds.has(p.id) || !containsPoint(p.rect, x, y)) continue;
    if (!best || p.depth > best.depth || (p.depth === best.depth && p.rect.w * p.rect.h < best.rect.w * best.rect.h))
      best = p;
  }
  return best;
}

/** Smallest place that fully contains a rect — the parent for a newly drawn place. */
export function containerFor(
  places: PlacedPlace[],
  rect: Rect,
  excludeIds: Set<string> = new Set(),
): PlacedPlace | null {
  let best: PlacedPlace | null = null;
  for (const p of places) {
    if (excludeIds.has(p.id) || !containsRect(p.rect, rect)) continue;
    if (!best || p.rect.w * p.rect.h < best.rect.w * best.rect.h) best = p;
  }
  return best;
}

export function descendantIds(places: PlacedPlace[], id: string): Set<string> {
  const out = new Set<string>();
  const queue = [id];
  while (queue.length) {
    const current = queue.shift()!;
    for (const p of places) {
      if (p.parentId === current && !out.has(p.id)) {
        out.add(p.id);
        queue.push(p.id);
      }
    }
  }
  return out;
}

export interface View {
  scale: number;
  tx: number;
  ty: number;
}

export function fitView(rect: Rect, viewportW: number, viewportH: number, padding = 24): View {
  const scale = Math.min((viewportW - padding * 2) / rect.w, (viewportH - padding * 2) / rect.h);
  return {
    scale,
    tx: (viewportW - rect.w * scale) / 2 - rect.x * scale,
    ty: (viewportH - rect.h * scale) / 2 - rect.y * scale,
  };
}

export function boundsOf(rects: Rect[]): Rect | null {
  if (rects.length === 0) return null;
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  const x2 = Math.max(...rects.map((r) => r.x + r.w));
  const y2 = Math.max(...rects.map((r) => r.y + r.h));
  return { x, y, w: x2 - x, h: y2 - y };
}

/** Kind suggestions for a place drawn inside `parentKind` — first entry is the default. */
export function suggestedKinds(parentKind: PlanKind | null): PlanKind[] {
  switch (parentKind) {
    case "house":
    case "room":
      return ["room", "area"];
    case "garden":
      return ["bed", "pond", "tree", "shed", "area"];
    case "garage":
    case "shed":
      return ["area", "room"];
    case null:
      return ["house", "garden", "garage", "shed", "drive", "area"];
    default:
      return ["area", "bed", "room"];
  }
}
