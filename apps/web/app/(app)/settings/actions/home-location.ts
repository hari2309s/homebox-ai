"use server";

import { homeQueries } from "@homebox-ai/db";
import { requireSessionUser } from "@homebox-ai/supabase/server";
import { revalidatePath } from "next/cache";

import { searchPlaces, type GeocodedPlace } from "../../../../lib/weather";

export async function searchPlacesAction(query: string): Promise<GeocodedPlace[]> {
  await requireSessionUser();
  return searchPlaces(String(query ?? "").slice(0, 80));
}

export async function setHomeLocationAction(place: GeocodedPlace | null) {
  const user = await requireSessionUser();
  if (place) {
    const latitude = Number(place.latitude);
    const longitude = Number(place.longitude);
    if (
      !Number.isFinite(latitude) ||
      Math.abs(latitude) > 90 ||
      !Number.isFinite(longitude) ||
      Math.abs(longitude) > 180
    )
      throw new Error("That place doesn't have a valid position");
    const placeName =
      String(place.name ?? "")
        .trim()
        .slice(0, 160) || "Home";
    const timezone = typeof place.timezone === "string" && place.timezone.length < 64 ? place.timezone : null;
    await homeQueries.setHomeLocation(user.id, { placeName, latitude, longitude, timezone });
  } else {
    await homeQueries.setHomeLocation(user.id, null);
  }
  revalidatePath("/maintenance");
  revalidatePath("/settings", "layout");
}
