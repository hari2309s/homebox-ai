"use server";

import { locationQueries } from "@homebox-ai/db";
import { revalidatePath } from "next/cache";

import { getSessionUser } from "@homebox-ai/supabase/server";

export async function createLocationAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name is required");

  const parentId = String(formData.get("parentId") ?? "").trim();

  await locationQueries.createLocation(user.id, { name, parentId: parentId || null });
  revalidatePath("/locations");
}

export async function updateLocationAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) throw new Error("Name is required");

  const parentId = String(formData.get("parentId") ?? "").trim();

  await locationQueries.updateLocation(user.id, id, { name, parentId: parentId || null });
  revalidatePath("/locations");
}

export async function deleteLocationAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");

  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Missing location id");

  await locationQueries.deleteLocation(user.id, id);
  revalidatePath("/locations");
}
