"use server";

import { locationQueries } from "@homebox-ai/db";
import { revalidatePath, revalidateTag } from "next/cache";

import { requireSessionUser } from "@homebox-ai/supabase/server";

import { locationTag } from "../../../lib/cached-queries";

export async function createLocationAction(formData: FormData) {
  const user = await requireSessionUser();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name is required");

  const parentId = String(formData.get("parentId") ?? "").trim();

  await locationQueries.createLocation(user.id, { name, parentId: parentId || null });
  revalidatePath("/locations");
  revalidateTag(locationTag(user.id));
}

export async function updateLocationAction(formData: FormData) {
  const user = await requireSessionUser();

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) throw new Error("Name is required");

  const parentId = String(formData.get("parentId") ?? "").trim();

  await locationQueries.updateLocation(user.id, id, { name, parentId: parentId || null });
  revalidatePath("/locations");
  revalidateTag(locationTag(user.id));
}

export async function deleteLocationAction(formData: FormData) {
  const user = await requireSessionUser();

  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Missing location id");

  await locationQueries.deleteLocation(user.id, id);
  revalidatePath("/locations");
  revalidateTag(locationTag(user.id));
}
