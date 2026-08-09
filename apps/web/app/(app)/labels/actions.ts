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
