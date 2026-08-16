"use server";

import { labelQueries } from "@homebox-ai/db";
import { revalidatePath } from "next/cache";

import { requireSessionUser } from "@homebox-ai/supabase/server";

export async function createLabelAction(formData: FormData) {
  const user = await requireSessionUser();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name is required");
  const color = String(formData.get("color") ?? "").trim();

  await labelQueries.createLabel(user.id, { name, color: color || null });
  revalidatePath("/labels");
}

export async function updateLabelAction(formData: FormData) {
  const user = await requireSessionUser();

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) throw new Error("Name is required");
  const color = String(formData.get("color") ?? "").trim();

  await labelQueries.updateLabel(user.id, id, { name, color: color || null });
  revalidatePath("/labels");
}

export async function deleteLabelAction(formData: FormData) {
  const user = await requireSessionUser();

  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Missing label id");

  await labelQueries.deleteLabel(user.id, id);
  revalidatePath("/labels");
}
