import { unstable_cache } from "next/cache";

import { labelQueries, locationQueries } from "@homebox-ai/db";

/**
 * Cache-invalidation tag helpers — used by both the cached queries below and
 * the mutation actions that need to bust those caches.
 */
export const locationTag = (userId: string) => `locations:${userId}`;
export const labelTag = (userId: string) => `labels:${userId}`;

/**
 * Cross-request cached version of listLocations. Locations change infrequently
 * so we cache them across requests per user — navigating between pages doesn't
 * re-query the DB on each render. Cache is invalidated via revalidateTag()
 * whenever a location is created, renamed, or deleted.
 */
export function listLocationsCached(userId: string) {
  return unstable_cache(() => locationQueries.listLocations(userId), ["locations", userId], {
    tags: [locationTag(userId)],
    revalidate: 60, // 60-second TTL as a safety net in case any mutation misses revalidateTag
  })();
}

/**
 * Cross-request cached version of listLabels. Same rationale as listLocationsCached.
 */
export function listLabelsCached(userId: string) {
  return unstable_cache(() => labelQueries.listLabels(userId), ["labels", userId], {
    tags: [labelTag(userId)],
    revalidate: 60,
  })();
}
