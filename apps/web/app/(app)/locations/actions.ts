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
