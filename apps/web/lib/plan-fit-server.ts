import { itemQueries, locationQueries } from "@homebox-ai/db";

import { clampToPlot, fitSubtreeInto, layoutPlan } from "./plan-layout";

/**
 * After a place gets a new parent, keeps the site plan consistent with the hierarchy: if the place is
 * drawn outside its new parent, the place, its spots and anything pinned in them move inside it.
 */
export async function fitPlaceIntoParent(userId: string, placeId: string) {
  const locations = await locationQueries.listLocations(userId);
  const places = layoutPlan(locations);
  const place = places.find((p) => p.id === placeId);
  const parent = place?.parentId ? places.find((p) => p.id === place.parentId) : undefined;
  if (!place || !parent) return;

  const fit = fitSubtreeInto(places, placeId, parent.rect);
  if (!fit) return;

  await locationQueries.updateLocationPlans(
    userId,
    [...fit.rects].map(([id, rect]) => {
      const r = clampToPlot(rect);
      return { id, planX: Math.round(r.x), planY: Math.round(r.y), planW: Math.round(r.w), planH: Math.round(r.h) };
    }),
  );

  const items = await itemQueries.searchItems(userId, { includeArchived: true });
  for (const item of items) {
    if (!item.locationId || !fit.rects.has(item.locationId) || item.planX == null || item.planY == null) continue;
    const point = fit.movePoint(item.planX, item.planY);
    await itemQueries.updateItem(userId, item.id, { planX: Math.round(point.x), planY: Math.round(point.y) });
  }
}
