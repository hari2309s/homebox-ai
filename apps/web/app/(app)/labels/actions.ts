"use server";

import { labelQueries } from "@homebox-ai/db";
import { revalidatePath } from "next/cache";

import { getSessionUser } from "@homebox-ai/supabase/server";

export async function createLabelAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name is required");

  await labelQueries.createLabel(user.id, { name });
  revalidatePath("/labels");
}

export async function updateLabelAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) throw new Error("Name is required");

  await labelQueries.updateLabel(user.id, id, { name });
  revalidatePath("/labels");
}

export async function deleteLabelAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");

  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Missing label id");

  await labelQueries.deleteLabel(user.id, id);
  revalidatePath("/labels");
}
