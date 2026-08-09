import { eq } from "drizzle-orm";

import { locations } from "../schema";
import { withRLS } from "../rls";

export function listLocations(userId: string) {
  return withRLS(userId, (tx) => tx.select().from(locations).where(eq(locations.ownerId, userId)));
}

export function createLocation(userId: string, data: { name: string; parentId?: string | null }) {
  return withRLS(userId, (tx) =>
    tx
      .insert(locations)
      .values({ ownerId: userId, name: data.name, parentId: data.parentId ?? null })
      .returning(),
  );
}
