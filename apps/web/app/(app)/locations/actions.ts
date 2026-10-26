"use server";

import { locationQueries } from "@homebox-ai/db";
import { revalidatePath, revalidateTag } from "next/cache";

import { requireSessionUser } from "@homebox-ai/supabase/server";

import { locationTag } from "../../../lib/cached-queries";
import { fitPlaceIntoParent } from "../../../lib/plan-fit-server";

export async function createLocationAction(formData: FormData) {
  const user = await requireSessionUser();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name is required");

  const parentId = String(formData.get("parentId") ?? "").trim();

  await locationQueries.createLocation(user.id, { name, parentId: parentId || null });
  revalidatePath("/", "layout");
  revalidateTag(locationTag(user.id));
}

export async function updateLocationAction(formData: FormData) {
  const user = await requireSessionUser();

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) throw new Error("Name is required");

  const parentId = String(formData.get("parentId") ?? "").trim();

  const [before] = (await locationQueries.listLocations(user.id)).filter((l) => l.id === id);
  await locationQueries.updateLocation(user.id, id, { name, parentId: parentId || null });
  if (parentId && before?.parentId !== parentId) await fitPlaceIntoParent(user.id, id);
  revalidatePath("/", "layout");
  revalidateTag(locationTag(user.id));
}

export async function deleteLocationAction(formData: FormData) {
  const user = await requireSessionUser();

  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Missing location id");

  await locationQueries.deleteLocation(user.id, id);
  revalidatePath("/", "layout");
  revalidateTag(locationTag(user.id));
}
