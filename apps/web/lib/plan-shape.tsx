import { shapePath, type PlanKind, type PlanShape } from "./plan-layout";
import { KIND_STYLE } from "./plan-styles";

/** Corner radius (in the drawing's own units) shared by every shape, so seeded and drawn places match. */
export const PLACE_RADIUS = 10;

/**
 * The outline of one place, filling its absolutely-positioned parent. `w`/`h` are the box size in the units
 * the radius is given in (screen pixels on the canvas, plot units in previews); strokes stay crisp at any zoom.
 * Only the painted shape takes pointer events, so clicks in the empty corners of an oval reach what's behind.
 */
export function PlaceShape({
  kind,
  shape,
  w,
  h,
  dashed = false,
  radius = PLACE_RADIUS,
}: {
  kind: PlanKind;
  shape: PlanShape;
  w: number;
  h: number;
  dashed?: boolean;
  radius?: number;
}) {
  const k = KIND_STYLE[kind];
  const sw = k.strokeWidth ?? 0;
  const iw = Math.max(1, w - sw);
  const ih = Math.max(1, h - sw);
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      viewBox={`0 0 ${Math.max(1, w)} ${Math.max(1, h)}`}
      preserveAspectRatio="none"
      style={{ filter: k.shadow }}
    >
      <path
        d={shapePath(shape, iw, ih, radius)}
        transform={`translate(${sw / 2} ${sw / 2})`}
        fill={k.fill}
        stroke={k.stroke ?? "none"}
        strokeWidth={sw}
        strokeDasharray={dashed && sw ? "5 4" : undefined}
        vectorEffect="non-scaling-stroke"
        style={{ pointerEvents: "auto" }}
      />
    </svg>
  );
}

/** Small outline of a shape for pickers. */
export function ShapeIcon({ shape, size = 18 }: { shape: PlanShape; size?: number }) {
  const w = shape === "rect" || shape === "pill" || shape === "lshape" ? 20 : 16;
  const h = shape === "pill" ? 10 : 16;
  return (
    <svg aria-hidden width={size} height={size} viewBox="-2 -2 24 20" className="block">
      <path
        d={shapePath(shape, w, h, 3)}
        transform={`translate(${(20 - w) / 2} ${(16 - h) / 2})`}
        fill="currentColor"
        fillOpacity={0.18}
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </svg>
  );
}
