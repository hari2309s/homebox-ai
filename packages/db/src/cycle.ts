/**
 * Walks up from `proposedParentId` via `getParentId`, watching for `nodeId`
 * itself — used to reject a parent-chain update (a location's parentId, an
 * item's parentItemId) that would make the chain circular. Shared between
 * locations.ts and items.ts, which otherwise had identical logic differing
 * only in which table `getParentId` queries.
 *
 * `getParentId` can be sync or async so this same algorithm is usable both
 * against a real DB lookup (one row per step) and against a plain in-memory
 * map in tests, with no mocking required.
 *
 * The `visited` guard isn't just for this call's own correctness (the walk
 * is finite by construction as long as no cycle exists yet) — it also caps
 * the walk if it runs into an *unrelated* pre-existing cycle in the data,
 * so this check itself can't hang or loop forever on bad data it didn't
 * create and isn't responsible for fixing.
 */
export async function wouldFormCycle(
  nodeId: string,
  proposedParentId: string,
  getParentId: (id: string) => string | null | Promise<string | null>,
): Promise<boolean> {
  let currentId: string | null = proposedParentId;
  const visited = new Set<string>();
  while (currentId) {
    if (currentId === nodeId) return true;
    if (visited.has(currentId)) return false;
    visited.add(currentId);
    currentId = await getParentId(currentId);
  }
  return false;
}
