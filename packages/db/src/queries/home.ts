import { eq } from "drizzle-orm";

import { getEffectiveOwnerId } from "../access";
import { homeSettings } from "../schema";
import { withRLS } from "../rls";

export interface HomeLocation {
  placeName: string;
  latitude: number;
  longitude: number;
  timezone: string | null;
}

/** The household's home location, or null until someone sets it. */
export function getHomeLocation(userId: string): Promise<HomeLocation | null> {
  return withRLS(userId, async (tx) => {
    const ownerId = await getEffectiveOwnerId(tx, userId);
    const [row] = await tx.select().from(homeSettings).where(eq(homeSettings.ownerId, ownerId));
    if (!row || row.latitude == null || row.longitude == null) return null;
    return {
      placeName: row.placeName ?? "Home",
      latitude: row.latitude,
      longitude: row.longitude,
      timezone: row.timezone,
    };
  });
}

/** Sets (or, with null, clears) the household's home location. */
export function setHomeLocation(userId: string, location: HomeLocation | null) {
  return withRLS(userId, async (tx) => {
    const ownerId = await getEffectiveOwnerId(tx, userId);
    const values = {
      placeName: location?.placeName ?? null,
      latitude: location?.latitude ?? null,
      longitude: location?.longitude ?? null,
      timezone: location?.timezone ?? null,
      updatedAt: new Date(),
    };
    await tx
      .insert(homeSettings)
      .values({ ownerId, ...values })
      .onConflictDoUpdate({ target: homeSettings.ownerId, set: values });
  });
}
