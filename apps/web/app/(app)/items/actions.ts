"use server";

import {
  attachmentQueries,
  itemLabelQueries,
  itemQueries,
  maintenanceQueries,
  resolveEffectiveOwnerId,
} from "@homebox-ai/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createSupabaseServerClient, requireSessionUser } from "@homebox-ai/supabase/server";
import { uploadAttachment } from "@homebox-ai/supabase/storage";

export async function createItemAction(formData: FormData) {
  const user = await requireSessionUser();

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
  const user = await requireSessionUser();

  const itemId = String(formData.get("itemId") ?? "").trim();
  if (!itemId) throw new Error("Missing item id");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name is required");

  const quantityRaw = nullableField(formData, "quantity");
  const labelIds = formData.getAll("labelIds").map(String).filter(Boolean);
  const parentItemId = nullableField(formData, "parentItemId");
  if (parentItemId === itemId) throw new Error("An item can't be part of itself");

  await itemQueries.updateItem(user.id, itemId, {
    name,
    description: nullableField(formData, "description"),
    quantity: quantityRaw ? Number(quantityRaw) : 1,
    serialNumber: nullableField(formData, "serialNumber"),
    modelNumber: nullableField(formData, "modelNumber"),
    manufacturer: nullableField(formData, "manufacturer"),
    insured: formData.get("insured") === "on",
    archived: formData.get("archived") === "on",
    lifetimeWarranty: formData.get("lifetimeWarranty") === "on",
    purchasePrice: nullableField(formData, "purchasePrice"),
    purchaseDate: nullableField(formData, "purchaseDate"),
    purchaseFrom: nullableField(formData, "purchaseFrom"),
    salePrice: nullableField(formData, "salePrice"),
    saleDate: nullableField(formData, "saleDate"),
    soldTo: nullableField(formData, "soldTo"),
    soldNotes: nullableField(formData, "soldNotes"),
    warrantyExpires: nullableField(formData, "warrantyExpires"),
    locationId: nullableField(formData, "locationId"),
    parentItemId,
    notes: nullableField(formData, "notes"),
  });
  await itemLabelQueries.setItemLabels(user.id, itemId, labelIds);

  revalidatePath("/items");
  revalidatePath(`/items/${itemId}`);
}

export async function deleteItemAction(formData: FormData) {
  const user = await requireSessionUser();

  const itemId = String(formData.get("itemId") ?? "").trim();
  if (!itemId) throw new Error("Missing item id");

  await itemQueries.deleteItem(user.id, itemId);
  revalidatePath("/items");
  redirect("/items");
}

const ATTACHMENT_TYPES = new Set(["photo", "receipt", "manual", "warranty"]);

export async function uploadItemAttachmentAction(formData: FormData) {
  const user = await requireSessionUser();

  const itemId = String(formData.get("itemId") ?? "").trim();
  if (!itemId) throw new Error("Missing item id");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a file to upload");

  const typeRaw = String(formData.get("type") ?? "manual");
  const type = ATTACHMENT_TYPES.has(typeRaw) ? (typeRaw as "photo" | "receipt" | "manual" | "warranty") : "manual";

  const ownerId = await resolveEffectiveOwnerId(user.id);
  const supabase = await createSupabaseServerClient();
  const path = await uploadAttachment(supabase, ownerId, itemId, file, file.name || "attachment");
  await attachmentQueries.createAttachment(user.id, { itemId, type, storagePath: path });

  revalidatePath(`/items/${itemId}`);
}

export async function deleteAttachmentAction(formData: FormData) {
  const user = await requireSessionUser();

  const itemId = String(formData.get("itemId") ?? "").trim();
  const attachmentId = String(formData.get("attachmentId") ?? "").trim();
  if (!itemId || !attachmentId) throw new Error("Missing attachment id");

  // Use the storagePath the DB actually had for this attachment, not a
  // client-supplied one — a hidden form field can be edited before submit,
  // and removing whatever path it names (rather than the row that was just
  // deleted) would let one authorized delete request take out an unrelated
  // Storage object within the same owner scope.
  const [deleted] = await attachmentQueries.deleteAttachment(user.id, attachmentId);
  if (deleted?.storagePath) {
    const supabase = await createSupabaseServerClient();
    await supabase.storage.from("attachments").remove([deleted.storagePath]);
  }

  revalidatePath(`/items/${itemId}`);
}

export async function setPrimaryAttachmentAction(formData: FormData) {
  const user = await requireSessionUser();

  const itemId = String(formData.get("itemId") ?? "").trim();
  const attachmentId = String(formData.get("attachmentId") ?? "").trim();
  if (!itemId || !attachmentId) throw new Error("Missing attachment id");

  await attachmentQueries.setPrimaryAttachment(user.id, itemId, attachmentId);
  revalidatePath(`/items/${itemId}`);
}

export async function addMaintenanceEntryAction(formData: FormData) {
  const user = await requireSessionUser();

  const itemId = String(formData.get("itemId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  if (!itemId || !name || !date) throw new Error("Name and date are required");

  await maintenanceQueries.createMaintenanceEntry(user.id, {
    itemId,
    name,
    date,
    description: String(formData.get("description") ?? "").trim() || undefined,
    cost: String(formData.get("cost") ?? "").trim() || undefined,
  });

  revalidatePath(`/items/${itemId}`);
}

export async function updateMaintenanceEntryAction(formData: FormData) {
  const user = await requireSessionUser();

  const itemId = String(formData.get("itemId") ?? "").trim();
  const entryId = String(formData.get("entryId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  if (!itemId || !entryId || !name || !date) throw new Error("Name and date are required");

  await maintenanceQueries.updateMaintenanceEntry(user.id, entryId, {
    name,
    date,
    description: String(formData.get("description") ?? "").trim() || null,
    cost: String(formData.get("cost") ?? "").trim() || null,
  });

  revalidatePath(`/items/${itemId}`);
}

export async function deleteMaintenanceEntryAction(formData: FormData) {
  const user = await requireSessionUser();

  const itemId = String(formData.get("itemId") ?? "").trim();
  const entryId = String(formData.get("entryId") ?? "").trim();
  if (!itemId || !entryId) throw new Error("Missing entry id");

  await maintenanceQueries.deleteMaintenanceEntry(user.id, entryId);
  revalidatePath(`/items/${itemId}`);
}
