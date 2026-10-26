"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import {
  boundsOf,
  clampToPlot,
  containerFor,
  descendantIds,
  fitView,
  innermostAt,
  layoutPlan,
  PLAN_KINDS,
  PLOT_H,
  PLOT_W,
  rectFromPoints,
  suggestedKinds,
  type PlacedPlace,
  type PlanKind,
  type PlanLocationInput,
  type Rect,
  type View,
} from "../../lib/plan-layout";
import {
  createPlaceAction,
  createThingAction,
  deletePlaceAction,
  moveThingAction,
  savePlacesAction,
  unpinThingAction,
  updatePlaceAction,
} from "./plan-actions";
import { PlanPanel } from "./plan-panel";

export interface PlanThing {
  id: string;
  name: string;
  locationId: string | null;
  planX: number | null;
  planY: number | null;
}

type Tool = "select" | "place" | "thing";
export type PlanSelection = { type: "place"; id: string } | { type: "thing"; id: string } | null;

type Draft =
  | { type: "place"; rect: Rect; parentId: string | null; kind: PlanKind }
  | { type: "thing"; x: number; y: number; locationId: string | null };

type Corner = "nw" | "ne" | "sw" | "se";

type Gesture =
  | { type: "pan"; sx: number; sy: number; view: View; moved: boolean; clickPlaceId: string | null }
  | {
      type: "move";
      sx: number;
      sy: number;
      ids: Set<string>;
      rects: Map<string, Rect>;
      pins: Map<string, { x: number; y: number }>;
      moved: boolean;
    }
  | { type: "resize"; id: string; corner: Corner; sx: number; sy: number; rect: Rect }
  | { type: "draw"; wx: number; wy: number; current: Rect; moved: boolean }
  | { type: "thing"; id: string; sx: number; sy: number; x: number; y: number; moved: boolean }
  | { type: "pinch"; dist: number; mid: { x: number; y: number }; view: View };

const MIN_SCALE = 0.15;
const MAX_SCALE = 6;
const FRONT_H = 56;
const FIT_MAX_SCALE = 2.5;

function centredAt(rect: Rect, size: { w: number; h: number }, scale: number): View {
  return { scale, tx: size.w / 2 - (rect.x + rect.w / 2) * scale, ty: size.h / 2 - (rect.y + rect.h / 2) * scale };
}

const KIND_STYLE: Record<
  PlanKind,
  { className: string; style?: CSSProperties; label: "inside" | "above" | "below" | "center" }
> = {
  house: {
    className:
      "border-2 border-(--plan-house-line) bg-(--plan-house) rounded-[4px] shadow-[14px_18px_28px_-14px_rgba(31,38,34,.4)]",
    label: "above",
  },
  room: { className: "border border-(--plan-room-line) bg-(--plan-house)", label: "inside" },
  garden: { className: "border border-(--plan-bed-line) bg-(--plan-garden) rounded-[10px]", label: "inside" },
  bed: { className: "border border-(--plan-bed-line) bg-(--plan-bed) rounded-md", label: "below" },
  pond: { className: "bg-[#9fc3c9] text-[#1f4a4a]", style: { borderRadius: "50% 45% 55% 40%" }, label: "center" },
  tree: { className: "rounded-full bg-[#7fa572] shadow-[8px_10px_14px_-6px_rgba(31,38,34,.35)]", label: "below" },
  garage: {
    className:
      "border-2 border-(--plan-garage-line) bg-(--plan-garage) rounded-[4px] shadow-[14px_18px_28px_-14px_rgba(31,38,34,.4)]",
    label: "inside",
  },
  shed: {
    className:
      "border border-(--plan-shed-line) bg-(--plan-shed) rounded-md shadow-[8px_10px_18px_-10px_rgba(31,38,34,.35)]",
    label: "inside",
  },
  drive: { className: "bg-(--plan-drive) rounded-[4px]", label: "inside" },
  area: { className: "border border-(--plan-room-line) bg-(--plan-area) rounded-md", label: "inside" },
};

const LABEL_INK: Partial<Record<PlanKind, string>> = {
  garden: "text-(--plan-ink)",
  bed: "text-(--plan-ink)",
  tree: "text-(--plan-ink)",
  garage: "text-(--plan-garage-line)",
  shed: "text-(--plan-shed-ink)",
  house: "text-(--plan-ink)",
};

interface PlanCanvasProps {
  locations: PlanLocationInput[];
  things: PlanThing[];
  alertPlaceIds: string[];
  defaultAside: ReactNode;
}

export function PlanWorkspace({ locations, things: initialThings, alertPlaceIds, defaultAside }: PlanCanvasProps) {
  const [places, setPlaces] = useState<PlacedPlace[]>(() => layoutPlan(locations));
  const [things, setThings] = useState<PlanThing[]>(initialThings);
  const [tool, setTool] = useState<Tool>("select");
  const [selection, setSelection] = useState<PlanSelection>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftName, setDraftName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [drawRect, setDrawRect] = useState<Rect | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const viewRef = useRef<View | null>(null);
  viewRef.current = view;

  useEffect(() => setPlaces(layoutPlan(locations)), [locations]);
  useEffect(() => setThings(initialThings), [initialThings]);

  const alertIds = useMemo(() => new Set(alertPlaceIds), [alertPlaceIds]);
  const placeById = useMemo(() => new Map(places.map((p) => [p.id, p])), [places]);

  const counts = useMemo(() => {
    const direct = new Map<string, number>();
    for (const t of things) if (t.locationId) direct.set(t.locationId, (direct.get(t.locationId) ?? 0) + 1);
    const total = new Map<string, number>();
    for (const p of places) {
      let sum = direct.get(p.id) ?? 0;
      for (const d of descendantIds(places, p.id)) sum += direct.get(d) ?? 0;
      total.set(p.id, sum);
    }
    return total;
  }, [things, places]);

  const contentBounds = useCallback(() => {
    const drawn = boundsOf(places.map((p) => p.rect));
    if (!drawn) return { x: 0, y: 0, w: PLOT_W, h: PLOT_H + FRONT_H };
    const margin = 40;
    const w = Math.max(drawn.w + margin * 2, 240);
    const h = Math.max(drawn.h + margin * 2, 160);
    return { x: drawn.x + drawn.w / 2 - w / 2, y: drawn.y + drawn.h / 2 - h / 2, w, h };
  }, [places]);

  // Until the user pans or zooms, the view keeps re-fitting so the drawing fills the canvas at any window size.
  const viewTouchedRef = useRef(false);

  const fitAll = useCallback(() => {
    if (!size.w || !size.h) return;
    viewTouchedRef.current = false;
    const v = fitView(contentBounds(), size.w, size.h, 16);
    setView(v.scale > FIT_MAX_SCALE ? centredAt(contentBounds(), size, FIT_MAX_SCALE) : v);
  }, [contentBounds, size]);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry!.contentRect;
      setSize({ w: width, h: height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (size.w && size.h && (!viewRef.current || !viewTouchedRef.current)) fitAll();
  }, [size, fitAll]);

  const toWorld = useCallback((clientX: number, clientY: number) => {
    const box = containerRef.current!.getBoundingClientRect();
    const v = viewRef.current!;
    return { x: (clientX - box.left - v.tx) / v.scale, y: (clientY - box.top - v.ty) / v.scale };
  }, []);

  const zoomAt = useCallback((factor: number, sx: number, sy: number, base?: View) => {
    viewTouchedRef.current = true;
    setView((current) => {
      const v = base ?? current;
      if (!v) return v;
      const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * factor));
      const k = scale / v.scale;
      return { scale, tx: sx - (sx - v.tx) * k, ty: sy - (sy - v.ty) * k };
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onWheel(event: WheelEvent) {
      event.preventDefault();
      const box = el!.getBoundingClientRect();
      const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
      zoomAt(Math.exp(-delta * (event.ctrlKey ? 0.01 : 0.0015)), event.clientX - box.left, event.clientY - box.top);
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  function zoomTo(rect: Rect) {
    if (!size.w) return;
    viewTouchedRef.current = true;
    const v = fitView(rect, size.w, size.h, 48);
    setView(v.scale > 4 ? fitView(rect, size.w, size.h, Math.max(48, (size.w - rect.w * 4) / 2)) : v);
  }

  async function run<T>(work: () => Promise<T>, failure: string): Promise<{ ok: true; value: T } | { ok: false }> {
    setError(null);
    try {
      return { ok: true, value: await work() };
    } catch (err) {
      setError(err instanceof Error ? err.message : failure);
      return { ok: false };
    }
  }

  // ── Pointer gestures ───────────────────────────────────────────────

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!view || draft) return;
    const target = event.target as HTMLElement;
    if (target.closest("[data-plan-ui]")) return;
    containerRef.current!.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()] as [{ x: number; y: number }, { x: number; y: number }];
      const box = containerRef.current!.getBoundingClientRect();
      gestureRef.current = {
        type: "pinch",
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        mid: { x: (a.x + b.x) / 2 - box.left, y: (a.y + b.y) / 2 - box.top },
        view,
      };
      return;
    }

    const world = toWorld(event.clientX, event.clientY);
    const handle = target.closest<HTMLElement>("[data-handle]");
    const thingEl = target.closest<HTMLElement>("[data-thing-id]");
    const placeEl = target.closest<HTMLElement>("[data-place-id]");
    const panInstead = event.button === 1 || event.shiftKey;

    if (tool === "place" && !panInstead) {
      gestureRef.current = {
        type: "draw",
        wx: world.x,
        wy: world.y,
        current: { x: world.x, y: world.y, w: 0, h: 0 },
        moved: false,
      };
      return;
    }

    if (tool === "select" && handle && selection?.type === "place" && !panInstead) {
      const place = placeById.get(selection.id)!;
      gestureRef.current = {
        type: "resize",
        id: place.id,
        corner: handle.dataset.handle as Corner,
        sx: event.clientX,
        sy: event.clientY,
        rect: place.rect,
      };
      return;
    }

    if (tool === "select" && thingEl && !panInstead) {
      const thing = things.find((t) => t.id === thingEl.dataset.thingId)!;
      setSelection({ type: "thing", id: thing.id });
      gestureRef.current = {
        type: "thing",
        id: thing.id,
        sx: event.clientX,
        sy: event.clientY,
        x: thing.planX ?? world.x,
        y: thing.planY ?? world.y,
        moved: false,
      };
      return;
    }

    const placeId = placeEl?.dataset.placeId ?? null;
    if (tool === "select" && placeId && selection?.type === "place" && selection.id === placeId && !panInstead) {
      const ids = new Set([placeId, ...descendantIds(places, placeId)]);
      gestureRef.current = {
        type: "move",
        sx: event.clientX,
        sy: event.clientY,
        ids,
        rects: new Map(places.filter((p) => ids.has(p.id)).map((p) => [p.id, p.rect])),
        pins: new Map(
          things
            .filter((t) => t.locationId && ids.has(t.locationId) && t.planX != null && t.planY != null)
            .map((t) => [t.id, { x: t.planX!, y: t.planY! }]),
        ),
        moved: false,
      };
      return;
    }

    gestureRef.current = {
      type: "pan",
      sx: event.clientX,
      sy: event.clientY,
      view,
      moved: false,
      clickPlaceId: tool === "select" ? placeId : null,
    };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (pointersRef.current.has(event.pointerId))
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const g = gestureRef.current;
    if (!g) {
      const placeEl = (event.target as HTMLElement).closest<HTMLElement>("[data-place-id]");
      setHoverId(placeEl?.dataset.placeId ?? null);
      return;
    }
    const v = viewRef.current!;

    if (g.type === "pinch") {
      const pts = [...pointersRef.current.values()];
      if (pts.length < 2) return;
      const [a, b] = pts as [{ x: number; y: number }, { x: number; y: number }];
      const box = containerRef.current!.getBoundingClientRect();
      const mid = { x: (a.x + b.x) / 2 - box.left, y: (a.y + b.y) / 2 - box.top };
      const factor = Math.hypot(a.x - b.x, a.y - b.y) / g.dist;
      const panned = { ...g.view, tx: g.view.tx + (mid.x - g.mid.x), ty: g.view.ty + (mid.y - g.mid.y) };
      zoomAt(factor, mid.x, mid.y, panned);
      return;
    }

    const dx = event.clientX - ("sx" in g ? g.sx : 0);
    const dy = event.clientY - ("sy" in g ? g.sy : 0);
    const movedEnough = Math.abs(dx) + Math.abs(dy) > 3;

    if (g.type === "pan") {
      if (!movedEnough && !g.moved) return;
      g.moved = true;
      viewTouchedRef.current = true;
      setView({ ...g.view, tx: g.view.tx + dx, ty: g.view.ty + dy });
    } else if (g.type === "move") {
      if (!movedEnough && !g.moved) return;
      g.moved = true;
      const wdx = dx / v.scale;
      const wdy = dy / v.scale;
      setPlaces((prev) =>
        prev.map((p) =>
          g.ids.has(p.id)
            ? { ...p, rect: { ...g.rects.get(p.id)!, x: g.rects.get(p.id)!.x + wdx, y: g.rects.get(p.id)!.y + wdy } }
            : p,
        ),
      );
      setThings((prev) =>
        prev.map((t) =>
          g.pins.has(t.id) ? { ...t, planX: g.pins.get(t.id)!.x + wdx, planY: g.pins.get(t.id)!.y + wdy } : t,
        ),
      );
    } else if (g.type === "resize") {
      const wdx = dx / v.scale;
      const wdy = dy / v.scale;
      const r = g.rect;
      let { x, y, w, h } = r;
      if (g.corner.includes("e")) w = Math.max(24, r.w + wdx);
      if (g.corner.includes("s")) h = Math.max(24, r.h + wdy);
      if (g.corner.includes("w")) {
        w = Math.max(24, r.w - wdx);
        x = r.x + r.w - w;
      }
      if (g.corner.includes("n")) {
        h = Math.max(24, r.h - wdy);
        y = r.y + r.h - h;
      }
      setPlaces((prev) => prev.map((p) => (p.id === g.id ? { ...p, rect: { x, y, w, h } } : p)));
    } else if (g.type === "draw") {
      const world = toWorld(event.clientX, event.clientY);
      g.current = rectFromPoints(g.wx, g.wy, world.x, world.y);
      g.moved = g.moved || g.current.w * v.scale > 4 || g.current.h * v.scale > 4;
      setDrawRect(g.current);
    } else if (g.type === "thing") {
      if (!movedEnough && !g.moved) return;
      g.moved = true;
      setThings((prev) =>
        prev.map((t) => (t.id === g.id ? { ...t, planX: g.x + dx / v.scale, planY: g.y + dy / v.scale } : t)),
      );
    }
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    pointersRef.current.delete(event.pointerId);
    const g = gestureRef.current;
    if (!g) return;
    if (g.type === "pinch") {
      if (pointersRef.current.size < 2) gestureRef.current = null;
      return;
    }
    gestureRef.current = null;
    const world = toWorld(event.clientX, event.clientY);

    if (g.type === "pan") {
      if (!g.moved) {
        if (tool === "thing") {
          openThingDraft(world.x, world.y);
        } else {
          setSelection(g.clickPlaceId ? { type: "place", id: g.clickPlaceId } : null);
        }
      }
    } else if (g.type === "move" && g.moved) {
      const moved = places.filter((p) => g.ids.has(p.id));
      const updates = moved.map((p) => ({ id: p.id, rect: clampToPlot(p.rect), kind: p.kind }));
      setPlaces((prev) => prev.map((p) => (g.ids.has(p.id) ? { ...p, rect: clampToPlot(p.rect), stored: true } : p)));
      const pins = things.filter((t) => g.pins.has(t.id)).map((t) => ({ id: t.id, x: t.planX!, y: t.planY! }));
      void run(() => savePlacesAction(updates, pins), "Couldn't save that move");
    } else if (g.type === "resize") {
      const place = placeById.get(g.id);
      if (place) {
        const rect = clampToPlot(place.rect);
        setPlaces((prev) => prev.map((p) => (p.id === g.id ? { ...p, rect, stored: true } : p)));
        void run(() => savePlacesAction([{ id: place.id, rect, kind: place.kind }]), "Couldn't save that size");
      }
    } else if (g.type === "draw") {
      setDrawRect(null);
      if (!g.moved) return;
      const rect = clampToPlot(g.current);
      if (rect.w < 16 || rect.h < 16) return;
      const parent = containerFor(places, rect);
      setDraft({ type: "place", rect, parentId: parent?.id ?? null, kind: suggestedKinds(parent?.kind ?? null)[0]! });
      setDraftName("");
    } else if (g.type === "thing" && g.moved) {
      const thing = things.find((t) => t.id === g.id);
      if (!thing || thing.planX == null || thing.planY == null) return;
      const x = Math.max(0, Math.min(PLOT_W, thing.planX));
      const y = Math.max(0, Math.min(PLOT_H, thing.planY));
      const target = innermostAt(places, x, y);
      const locationId = target?.id ?? null;
      setThings((prev) => prev.map((t) => (t.id === thing.id ? { ...t, planX: x, planY: y, locationId } : t)));
      void run(() => moveThingAction({ id: thing.id, locationId, x, y }), "Couldn't move that thing");
    }
  }

  function openThingDraft(rawX: number, rawY: number) {
    const x = Math.max(0, Math.min(PLOT_W, rawX));
    const y = Math.max(0, Math.min(PLOT_H, rawY));
    setDraft({ type: "thing", x, y, locationId: innermostAt(places, x, y)?.id ?? null });
    setDraftName("");
  }

  // ── Mutations ───────────────────────────────────────────────────────

  async function submitDraft() {
    if (!draft || busy) return;
    const name = draftName.trim();
    if (!name) {
      setError("Give it a name first");
      return;
    }
    setBusy(true);
    if (draft.type === "place") {
      const created = await run(
        () => createPlaceAction({ name, parentId: draft.parentId, kind: draft.kind, rect: draft.rect }),
        "Couldn't add that place",
      );
      if (created.ok) {
        const id = created.value.id;
        const parent = draft.parentId ? placeById.get(draft.parentId) : undefined;
        setPlaces((prev) => [
          ...prev,
          {
            id,
            name,
            parentId: draft.parentId,
            kind: draft.kind,
            rect: draft.rect,
            stored: true,
            depth: parent ? parent.depth + 1 : 0,
          },
        ]);
        setSelection({ type: "place", id });
        setDraft(null);
        setTool("select");
      }
    } else {
      const created = await run(
        () => createThingAction({ name, locationId: draft.locationId, x: draft.x, y: draft.y }),
        "Couldn't add that thing",
      );
      if (created.ok) {
        const id = created.value.id;
        setThings((prev) => [...prev, { id, name, locationId: draft.locationId, planX: draft.x, planY: draft.y }]);
        setSelection({ type: "thing", id });
        setDraft(null);
      }
    }
    setBusy(false);
  }

  async function keepLayout() {
    const unsaved = places.filter((p) => !p.stored);
    if (!unsaved.length) return;
    setPlaces((prev) => prev.map((p) => ({ ...p, stored: true })));
    await run(
      () => savePlacesAction(unsaved.map((p) => ({ id: p.id, rect: clampToPlot(p.rect), kind: p.kind }))),
      "Couldn't save the layout",
    );
  }

  async function renamePlace(id: string, name: string, kind: PlanKind) {
    const place = placeById.get(id);
    if (!place) return;
    setPlaces((prev) => prev.map((p) => (p.id === id ? { ...p, name, kind } : p)));
    await run(() => updatePlaceAction({ id, name, parentId: place.parentId, kind }), "Couldn't rename that place");
  }

  async function deletePlace(id: string) {
    const result = await run(() => deletePlaceAction(id), "Couldn't delete that place");
    if (!result.ok) return;
    setPlaces((prev) =>
      prev.filter((p) => p.id !== id).map((p) => (p.parentId === id ? { ...p, parentId: null, depth: 0 } : p)),
    );
    setThings((prev) => prev.map((t) => (t.locationId === id ? { ...t, locationId: null } : t)));
    setSelection(null);
  }

  async function pinThing(thingId: string, placeId: string) {
    const place = placeById.get(placeId);
    if (!place) return;
    const siblings = things.filter((t) => t.locationId === placeId && t.planX != null).length;
    const x = place.rect.x + place.rect.w / 2 + ((siblings % 5) - 2) * 14;
    const y = place.rect.y + place.rect.h / 2 + Math.floor(siblings / 5) * 14;
    setThings((prev) => prev.map((t) => (t.id === thingId ? { ...t, planX: x, planY: y } : t)));
    await run(() => moveThingAction({ id: thingId, locationId: placeId, x, y }), "Couldn't pin that thing");
  }

  async function unpinThing(thingId: string) {
    setThings((prev) => prev.map((t) => (t.id === thingId ? { ...t, planX: null, planY: null } : t)));
    setSelection(null);
    await run(() => unpinThingAction(thingId), "Couldn't remove that pin");
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("input, textarea, select")) return;
    if (event.key === "Escape") {
      if (draft) setDraft(null);
      else if (tool !== "select") setTool("select");
      else setSelection(null);
    } else if (event.key === "v") setTool("select");
    else if (event.key === "p" || event.key === "t") {
      setTool(event.key === "p" ? "place" : "thing");
      setSelection(null);
    } else if (event.key === "+" || event.key === "=") zoomAt(1.25, size.w / 2, size.h / 2);
    else if (event.key === "-") zoomAt(0.8, size.w / 2, size.h / 2);
    else if (event.key === "0") fitAll();
  }

  // ── Rendering ───────────────────────────────────────────────────────

  const unsavedCount = places.filter((p) => !p.stored).length;
  const sorted = [...places].sort((a, b) => a.depth - b.depth);
  const s = view?.scale ?? 1;
  const screen = (r: Rect) => ({
    left: r.x * s + (view?.tx ?? 0),
    top: r.y * s + (view?.ty ?? 0),
    width: r.w * s,
    height: r.h * s,
  });
  const selectedPlace = selection?.type === "place" ? placeById.get(selection.id) : undefined;
  const selectedThing = selection?.type === "thing" ? things.find((t) => t.id === selection.id) : undefined;

  const draftAnchor = draft
    ? draft.type === "place"
      ? screen(draft.rect)
      : { left: draft.x * s + (view?.tx ?? 0), top: draft.y * s + (view?.ty ?? 0), width: 0, height: 0 }
    : null;
  const draftParent =
    draft?.type === "place"
      ? draft.parentId
        ? placeById.get(draft.parentId)
        : undefined
      : draft
        ? draft.locationId
          ? placeById.get(draft.locationId)
          : undefined
        : undefined;

  return (
    <div className="flex flex-col gap-[14px] lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-5">
      <div
        ref={containerRef}
        tabIndex={0}
        role="application"
        aria-label="Site plan. Drag to pan, scroll to zoom. V select, P draw a place, T add a thing."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => setHoverId(null)}
        onDoubleClick={(event) => {
          const id = (event.target as HTMLElement).closest<HTMLElement>("[data-place-id]")?.dataset.placeId;
          const place = id ? placeById.get(id) : undefined;
          if (place && tool === "select") zoomTo(place.rect);
        }}
        onKeyDown={onKeyDown}
        className={`relative h-[440px] touch-none select-none overflow-hidden rounded-[18px] bg-(--plan-ground) outline-none focus-visible:ring-2 focus-visible:ring-accent lg:h-full lg:min-h-[460px] ${
          tool === "select" ? "cursor-grab active:cursor-grabbing" : "cursor-crosshair"
        }`}
        style={{
          backgroundImage: "radial-gradient(var(--plan-dots) 1px, transparent 1.2px)",
          backgroundSize: `${12 * s}px ${12 * s}px`,
          backgroundPosition: `${view?.tx ?? 0}px ${view?.ty ?? 0}px`,
        }}
      >
        {view && (
          <>
            {/* Plot boundary + front strip */}
            <div
              className="pointer-events-none absolute rounded-[6px] border border-dashed border-(--plan-bed-line)"
              style={screen({ x: 0, y: 0, w: PLOT_W, h: PLOT_H })}
            />
            <div
              className="pointer-events-none absolute flex items-center border-t border-border bg-(--plan-front) px-[18px] font-mono text-[10px] text-muted"
              style={screen({ x: 0, y: PLOT_H, w: PLOT_W, h: FRONT_H })}
            >
              FRONT · STREET
            </div>

            {sorted.map((place) => {
              const box = screen(place.rect);
              const k = KIND_STYLE[place.kind];
              const count = counts.get(place.id) ?? 0;
              const empty = count === 0 && !places.some((p) => p.parentId === place.id);
              const selected = selectedPlace?.id === place.id;
              const hovered = hoverId === place.id && !selected;
              const showLabel = box.width > 34 && box.height > 18;
              const label = place.name.toUpperCase();
              const ink = LABEL_INK[place.kind] ?? "text-body";
              return (
                <div
                  key={place.id}
                  data-place-id={place.id}
                  title={`${place.name} · ${count} ${count === 1 ? "thing" : "things"}`}
                  className={`absolute ${k.className} ${empty ? "!border-dashed" : ""} ${!place.stored ? "opacity-80" : ""} ${
                    selected || hovered ? "outline outline-2 outline-offset-2 outline-accent" : ""
                  }`}
                  style={{ ...box, ...k.style, zIndex: 10 + place.depth }}
                >
                  {place.kind === "garage" && box.width > 40 && (
                    <span className="pointer-events-none absolute -bottom-[3px] left-[13%] right-[13%] h-[7px] bg-(--plan-garage-door)" />
                  )}
                  {showLabel && k.label === "inside" && (
                    <span
                      className={`pointer-events-none absolute left-[10px] top-2 right-2 font-mono text-[10px] leading-tight ${ink}`}
                    >
                      <span className="block truncate">{label}</span>
                      {box.height > 48 && box.width > 50 && <b className="font-sans text-[18px] text-ink">{count}</b>}
                    </span>
                  )}
                  {showLabel && k.label === "center" && (
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center px-2 text-center font-mono text-[10px] text-[#1f4a4a]">
                      <span className="truncate">
                        {label} · {count}
                      </span>
                    </span>
                  )}
                  {k.label === "above" && (
                    <span
                      className={`pointer-events-none absolute -top-[18px] left-0 max-w-full truncate font-mono text-[10px] ${ink}`}
                    >
                      {label} · {count}
                    </span>
                  )}
                  {k.label === "below" && box.width > 24 && (
                    <span
                      className={`pointer-events-none absolute left-0 top-full mt-[6px] w-max max-w-[160px] truncate font-mono text-[10px] ${ink}`}
                    >
                      {label} · {count}
                    </span>
                  )}
                  {alertIds.has(place.id) && (
                    <span className="pointer-events-none absolute -right-[13px] top-1/3 flex h-[26px] w-[26px] items-center justify-center rounded-full bg-[#b0643f] font-mono text-[12px] text-white shadow-[0_0_0_3px_var(--color-card)]">
                      !
                    </span>
                  )}
                  {selected &&
                    tool === "select" &&
                    (["nw", "ne", "sw", "se"] as const).map((corner) => (
                      <span
                        key={corner}
                        data-handle={corner}
                        className="absolute h-[10px] w-[10px] rounded-[2px] border-2 border-accent bg-card"
                        style={{
                          left: corner.includes("w") ? -7 : undefined,
                          right: corner.includes("e") ? -7 : undefined,
                          top: corner.includes("n") ? -7 : undefined,
                          bottom: corner.includes("s") ? -7 : undefined,
                          cursor: corner === "nw" || corner === "se" ? "nwse-resize" : "nesw-resize",
                        }}
                      />
                    ))}
                </div>
              );
            })}

            {things
              .filter((t) => t.planX != null && t.planY != null)
              .map((thing) => {
                const left = thing.planX! * s + view.tx;
                const top = thing.planY! * s + view.ty;
                const selected = selectedThing?.id === thing.id;
                return (
                  <div
                    key={thing.id}
                    data-thing-id={thing.id}
                    title={thing.name}
                    className="group absolute z-[60] -translate-x-1/2 -translate-y-1/2"
                    style={{ left, top }}
                  >
                    <span
                      className={`block h-[18px] w-[18px] cursor-pointer rounded-full bg-accent shadow-[0_0_0_3px_var(--color-card)] ${selected ? "outline outline-2 outline-offset-[5px] outline-accent" : ""}`}
                    />
                    <span
                      className={`pointer-events-none absolute left-[14px] top-[-22px] w-max max-w-[180px] truncate rounded-md bg-card px-[6px] py-[2px] text-[11px] font-semibold text-ink shadow-[0_1px_3px_rgba(31,38,34,.2)] ${
                        selected || s > 1.4 ? "block" : "hidden group-hover:block"
                      }`}
                    >
                      {thing.name}
                    </span>
                  </div>
                );
              })}

            {(drawRect || draft?.type === "place") && (
              <div
                className="pointer-events-none absolute z-[70] rounded-[4px] border-2 border-dashed border-accent bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)]"
                style={screen(drawRect ?? (draft as { rect: Rect }).rect)}
              />
            )}
            {draft?.type === "thing" && (
              <span
                className="pointer-events-none absolute z-[70] h-[18px] w-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-accent"
                style={{ left: draft.x * s + view.tx, top: draft.y * s + view.ty }}
              />
            )}
          </>
        )}

        {/* Toolbar */}
        <div
          data-plan-ui
          className="absolute left-3 top-3 z-[80] flex rounded-[10px] border border-border bg-card p-[3px] shadow-[0_1px_3px_rgba(31,38,34,.12)]"
        >
          {(
            [
              ["select", "near_me", "Select", "V"],
              ["place", "add_location_alt", "Place", "P"],
              ["thing", "add_circle", "Thing", "T"],
            ] as const
          ).map(([value, icon, label, key]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setTool(value);
                setDraft(null);
                if (value !== "select") setSelection(null);
              }}
              aria-pressed={tool === value}
              title={`${label} (${key})`}
              className={`flex cursor-pointer items-center gap-1 rounded-[8px] border-none px-[9px] py-[5px] text-[12px] font-semibold ${
                tool === value ? "bg-selected text-ink" : "bg-transparent text-muted hover:text-ink"
              }`}
            >
              <span
                aria-hidden
                className="material-symbols-rounded text-[18px]"
                style={{ fontVariationSettings: tool === value ? "'FILL' 1" : undefined }}
              >
                {icon}
              </span>
              {label}
            </button>
          ))}
        </div>

        {unsavedCount > 0 && (
          <div
            data-plan-ui
            className="absolute left-3 top-[54px] z-[80] flex items-center gap-2 sm:left-auto sm:right-3 sm:top-3 rounded-[10px] border border-border bg-card py-[5px] pl-3 pr-[5px] text-[12px] text-body shadow-[0_1px_3px_rgba(31,38,34,.12)]"
          >
            <span className="hidden sm:inline">
              {unsavedCount} {unsavedCount === 1 ? "place" : "places"} in a suggested spot
            </span>
            <button
              type="button"
              onClick={keepLayout}
              className="cursor-pointer rounded-[8px] border-none bg-accent px-[10px] py-[5px] text-[12px] font-semibold text-white"
            >
              Keep layout
            </button>
          </div>
        )}

        {(tool !== "select" || places.length === 0) && !draft && (
          <div
            data-plan-ui
            className="pointer-events-none absolute bottom-3 left-3 z-[80] max-w-[70%] rounded-[10px] bg-ink px-3 py-2 text-[12px] leading-snug text-surface"
          >
            {tool === "place"
              ? "Drag to draw a place. Draw inside a zone to nest it there."
              : tool === "thing"
                ? "Click where it lives. It joins your inventory in that place."
                : "Pick Place and drag out your house, garden or garage to start the plan."}
          </div>
        )}

        {error && (
          <div
            data-plan-ui
            role="alert"
            className="absolute bottom-3 left-3 z-[90] flex items-center gap-2 rounded-[10px] bg-[#ecdccd] py-2 pl-3 pr-2 text-[12px] text-[#5a2e18]"
          >
            {error}
            <button
              type="button"
              onClick={() => setError(null)}
              aria-label="Dismiss"
              className="flex cursor-pointer border-none bg-transparent p-0 text-[#7a3f22]"
            >
              <span aria-hidden className="material-symbols-rounded text-[16px]">
                close
              </span>
            </button>
          </div>
        )}

        {/* Zoom */}
        <div
          data-plan-ui
          className="absolute bottom-3 right-3 z-[80] flex flex-col overflow-hidden rounded-[10px] border border-border bg-card"
        >
          {(
            [
              ["add", "Zoom in", () => zoomAt(1.25, size.w / 2, size.h / 2)],
              ["remove", "Zoom out", () => zoomAt(0.8, size.w / 2, size.h / 2)],
              ["fit_screen", "Fit plan", fitAll],
            ] as const
          ).map(([icon, label, action], i) => (
            <button
              key={icon}
              type="button"
              onClick={action}
              aria-label={label}
              title={label}
              className={`flex h-9 w-9 cursor-pointer items-center justify-center border-none bg-transparent text-ink hover:bg-surface-soft ${i > 0 ? "border-t border-solid border-border/60" : ""}`}
            >
              <span aria-hidden className="material-symbols-rounded text-[20px]">
                {icon}
              </span>
            </button>
          ))}
        </div>

        {/* Draft popover */}
        {draft && draftAnchor && (
          <form
            data-plan-ui
            onSubmit={(event) => {
              event.preventDefault();
              void submitDraft();
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") setDraft(null);
            }}
            className="absolute z-[90] flex w-[260px] flex-col gap-[10px] rounded-[14px] border border-border bg-card p-3 shadow-[8px_12px_24px_-10px_rgba(31,38,34,.4)]"
            style={{
              left: Math.max(8, Math.min(size.w - 268, draftAnchor.left + draftAnchor.width + 12)),
              top: Math.max(8, Math.min(size.h - (draft.type === "place" ? 230 : 150), draftAnchor.top)),
            }}
          >
            <div>
              <div className="font-serif text-[18px] leading-tight text-ink">
                {draft.type === "place" ? "New place" : "New thing"}
              </div>
              <div className="truncate font-mono text-[10px] text-accent">
                {draftParent
                  ? `${draft.type === "place" ? "INSIDE" : "IN"} ${draftParent.name.toUpperCase()}`
                  : draft.type === "place"
                    ? "ON THE PLOT"
                    : "NOT IN A PLACE YET"}
              </div>
            </div>
            <input
              autoFocus
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              placeholder={draft.type === "place" ? "e.g. Greenhouse" : "e.g. Hedge trimmer"}
              aria-label={draft.type === "place" ? "Place name" : "Thing name"}
              className="h-10 rounded-[10px] border border-border bg-card px-3 text-[14px] text-ink outline-none focus:border-2 focus:border-accent"
            />
            {draft.type === "place" && (
              <div className="flex flex-wrap gap-[6px]" role="radiogroup" aria-label="Kind of place">
                {suggestedKinds(draftParent?.kind ?? null).map((kind) => {
                  const meta = PLAN_KINDS.find((k) => k.kind === kind)!;
                  const active = draft.kind === kind;
                  return (
                    <button
                      key={kind}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setDraft({ ...draft, kind })}
                      className={`flex cursor-pointer items-center gap-1 rounded-full px-[10px] py-1 text-[12px] font-semibold ${
                        active
                          ? "border border-transparent bg-selected text-ink"
                          : "border border-border bg-card text-body"
                      }`}
                    >
                      <span aria-hidden className="material-symbols-rounded text-[14px]">
                        {meta.icon}
                      </span>
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={busy}
                className="flex-1 cursor-pointer rounded-[10px] border-none bg-accent py-[9px] text-[13px] font-semibold text-white disabled:opacity-60"
              >
                {busy ? "Adding…" : draft.type === "place" ? "Add place" : "Add to inventory"}
              </button>
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="cursor-pointer rounded-[10px] border border-border bg-card px-3 text-[13px] font-semibold text-ink"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="flex min-h-0 flex-col gap-[14px] lg:overflow-y-auto">
        {selectedPlace || selectedThing ? (
          <PlanPanel
            place={selectedPlace}
            thing={selectedThing}
            places={places}
            things={things}
            counts={counts}
            onClose={() => setSelection(null)}
            onZoom={(rect) => zoomTo(rect)}
            onRename={renamePlace}
            onDelete={deletePlace}
            onAddThingHere={() => {
              setTool("thing");
              setSelection(null);
            }}
            onAddPlaceInside={() => {
              setTool("place");
              setSelection(null);
            }}
            onPin={pinThing}
            onUnpin={unpinThing}
            onSelectThing={(id) => setSelection({ type: "thing", id })}
            onSelectPlace={(id) => setSelection({ type: "place", id })}
          />
        ) : (
          <div className="hidden min-h-0 flex-col gap-[14px] lg:flex">{defaultAside}</div>
        )}
      </div>
    </div>
  );
}
