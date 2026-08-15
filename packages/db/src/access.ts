import { eq } from "drizzle-orm";

import { sharedAccess } from "./schema";
import { withRLS, type Tx } from "./rls";

/**
 * Resolves the owner_id a user's reads/writes should be scoped to: their own
 * id, unless they've accepted an invite to share someone else's data — in
 * which case every table's owner_id boundary (and attachment storage paths)
 * should point at that owner instead, so the whole household sees the same
 * data. See schema.ts's shared_access comment for the full model.
 */
export async function getEffectiveOwnerId(tx: Tx, userId: string): Promise<string> {
  const [row] = await tx
    .select({ ownerId: sharedAccess.ownerId })
    .from(sharedAccess)
    .where(eq(sharedAccess.memberUserId, userId));
  return row?.ownerId ?? userId;
}

/**
 * Standalone version of the above for callers outside the query layer (e.g.
 * a Server Action that needs the effective owner id up front, to use the
 * *same* id for both a Storage upload path and the attachments row it then
 * creates — see apps/web's items/actions.ts).
 */
export function resolveEffectiveOwnerId(userId: string): Promise<string> {
  return withRLS(userId, (tx) => getEffectiveOwnerId(tx, userId));
}
