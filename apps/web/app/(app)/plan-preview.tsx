import Link from "next/link";

import { boundsOf, descendantIds, type PlacedPlace } from "../../lib/plan-layout";
import { PlaceShape } from "../../lib/plan-shape";
import { LABEL_INK } from "../../lib/plan-styles";

interface PreviewThing {
  id: string;
  name: string;
  locationId: string | null;
  planX: number | null;
  planY: number | null;
}

/**
 * Read-only drawing of one zone of the site plan with `focusId` highlighted — used beside lists (Places)
 * where the full editable canvas would be too much. Positions are percentages of the zone's bounds, so it
 * scales to whatever box it's given without distorting shapes.
 */
export function PlanPreview({
  places,
  things,
  focusId,
  className = "",
}: {
  places: PlacedPlace[];
  things: PreviewThing[];
  focusId: string;
  className?: string;
}) {
  const byId = new Map(places.map((p) => [p.id, p]));
  let root = byId.get(focusId);
  for (let guard = 0; root?.parentId && byId.has(root.parentId) && guard < 20; guard++) root = byId.get(root.parentId);
  if (!root) return null;

  const zoneIds = new Set([root.id, ...descendantIds(places, root.id)]);
  const zonePlaces = places.filter((p) => zoneIds.has(p.id)).sort((a, b) => a.depth - b.depth);
  const bounds = boundsOf(zonePlaces.map((p) => p.rect))!;
  const pad = Math.max(30, Math.max(bounds.w, bounds.h) * 0.08);
  const view = { x: bounds.x - pad, y: bounds.y - pad, w: bounds.w + pad * 2, h: bounds.h + pad * 2 };
  const pct = (x: number, y: number) => ({
    left: `${((x - view.x) / view.w) * 100}%`,
    top: `${((y - view.y) / view.h) * 100}%`,
  });

  const focusTree = new Set([focusId, ...descendantIds(places, focusId)]);
  const pins = things.filter((t) => t.planX != null && t.planY != null && t.locationId && focusTree.has(t.locationId));

  return (
    <div
      className={`relative flex justify-center overflow-hidden rounded-[18px] bg-(--plan-ground) ${className}`}
      style={{
        backgroundImage: "radial-gradient(var(--plan-dots) 1px, transparent 1.2px)",
        backgroundSize: "12px 12px",
      }}
    >
      <div className="relative h-full max-w-full" style={{ aspectRatio: `${view.w} / ${view.h}` }}>
        {zonePlaces.map((place) => {
          const focused = place.id === focusId;
          const dimmed = !focusTree.has(place.id) && place.id !== root.id;
          return (
            <div
              key={place.id}
              className={`absolute ${focused ? "rounded-[12px] outline outline-2 outline-offset-2 outline-accent" : ""}`}
              style={{
                ...pct(place.rect.x, place.rect.y),
                width: `${(place.rect.w / view.w) * 100}%`,
                height: `${(place.rect.h / view.h) * 100}%`,
                opacity: dimmed ? 0.5 : 1,
                zIndex: 1 + place.depth,
              }}
            >
              <PlaceShape kind={place.kind} shape={place.shape} w={place.rect.w} h={place.rect.h} radius={14} />
              <span
                className={`absolute left-2 top-[6px] right-2 truncate font-mono text-[10px] ${LABEL_INK[place.kind] ?? "text-body"}`}
              >
                {place.name.toUpperCase()}
              </span>
            </div>
          );
        })}
        {pins.map((pin) => (
          <span
            key={pin.id}
            title={pin.name}
            className="absolute z-30 h-[18px] w-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_0_3px_var(--color-card)]"
            style={pct(pin.planX!, pin.planY!)}
          />
        ))}
      </div>
      <Link
        href="/"
        className="absolute bottom-3 right-3 z-40 flex items-center gap-1 rounded-[9px] border border-border bg-card px-[10px] py-[6px] text-[12px] font-semibold text-ink no-underline"
      >
        <span aria-hidden className="material-symbols-rounded text-[16px]">
          map
        </span>
        Edit on plan
      </Link>
    </div>
  );
}
