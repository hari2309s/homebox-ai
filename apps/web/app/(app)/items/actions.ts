"use server";

import { itemLabelQueries, itemQueries } from "@homebox-ai/db";
import { revalidatePath } from "next/cache";

import { getSessionUser } from "@homebox-ai/supabase/server";

export async function createItemAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name is required");

  const locationId = String(formData.get("locationId") ?? "").trim();
  const labelIds = formData.getAll("labelIds").map(String).filter(Boolean);

  const [item] = await itemQueries.createItem(user.id, { name, locationId: locationId || null });
  if (item && labelIds.length > 0) {
    await itemLabelQueries.setItemLabels(user.id, item.id, labelIds);
  }

  revalidatePath("/items");
}
