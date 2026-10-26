"use server";

import { itemLabelQueries, labelQueries } from "@homebox-ai/db";
import { revalidatePath, revalidateTag } from "next/cache";

import { requireSessionUser } from "@homebox-ai/supabase/server";

import { labelTag } from "../../../lib/cached-queries";

export async function createLabelAction(formData: FormData) {
  const user = await requireSessionUser();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name is required");
  const color = String(formData.get("color") ?? "").trim();

  await labelQueries.createLabel(user.id, { name, color: color || null });
  revalidatePath("/labels");
  revalidateTag(labelTag(user.id));
}

export async function updateLabelAction(formData: FormData) {
  const user = await requireSessionUser();

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) throw new Error("Name is required");
  const color = String(formData.get("color") ?? "").trim();

  await labelQueries.updateLabel(user.id, id, { name, color: color || null });
  revalidatePath("/labels");
  revalidateTag(labelTag(user.id));
}

export async function deleteLabelAction(formData: FormData) {
  const user = await requireSessionUser();

  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Missing label id");

  await labelQueries.deleteLabel(user.id, id);
  revalidatePath("/labels");
  revalidateTag(labelTag(user.id));
}

/** Tags or untags one thing — the labels pane's ✕ and its Undo. */
export async function setItemTaggedAction(itemId: string, labelId: string, tagged: boolean) {
  const user = await requireSessionUser();
  if (tagged) await itemLabelQueries.addItemLabel(user.id, String(itemId), String(labelId));
  else await itemLabelQueries.removeItemLabel(user.id, String(itemId), String(labelId));
  revalidatePath("/labels");
  revalidatePath("/items", "layout");
}
