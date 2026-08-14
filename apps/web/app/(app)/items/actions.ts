"use server";

import { itemLabelQueries, itemQueries } from "@homebox-ai/db";
import { redirect } from "next/navigation";
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

// Every field on the edit form is always present in `formData`, so an empty
// string means "the user cleared this field" and should null it out — unlike
// `undefined`, which Drizzle's `.set()` treats as "leave this column alone."
function nullableField(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

export async function updateItemAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");

  const itemId = String(formData.get("itemId") ?? "").trim();
  if (!itemId) throw new Error("Missing item id");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name is required");

  const quantityRaw = nullableField(formData, "quantity");
  const labelIds = formData.getAll("labelIds").map(String).filter(Boolean);

  await itemQueries.updateItem(user.id, itemId, {
    name,
    description: nullableField(formData, "description"),
    quantity: quantityRaw ? Number(quantityRaw) : 1,
    purchasePrice: nullableField(formData, "purchasePrice"),
    purchaseDate: nullableField(formData, "purchaseDate"),
    salePrice: nullableField(formData, "salePrice"),
    saleDate: nullableField(formData, "saleDate"),
    warrantyExpires: nullableField(formData, "warrantyExpires"),
    locationId: nullableField(formData, "locationId"),
    notes: nullableField(formData, "notes"),
  });
  await itemLabelQueries.setItemLabels(user.id, itemId, labelIds);

  revalidatePath("/items");
  revalidatePath(`/items/${itemId}`);
}

export async function deleteItemAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");

  const itemId = String(formData.get("itemId") ?? "").trim();
  if (!itemId) throw new Error("Missing item id");

  await itemQueries.deleteItem(user.id, itemId);
  revalidatePath("/items");
  redirect("/items");
}
