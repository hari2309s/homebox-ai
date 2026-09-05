"use server";

import { runPhotoToItemGraph, type ItemDraft } from "@homebox-ai/ai";
import {
  attachmentQueries,
  itemActivityQueries,
  itemLabelQueries,
  itemQueries,
  resolveEffectiveOwnerId,
} from "@homebox-ai/db";
import { createSupabaseServerClient, requireSessionUser } from "@homebox-ai/supabase/server";
import { uploadAttachment } from "@homebox-ai/supabase/storage";
import { revalidatePath } from "next/cache";

import { normalizeCurrency } from "../../../lib/currency";
import { runTracedGraph } from "../../../lib/traced-graph";

export async function analyzePhotoAction(formData: FormData): Promise<ItemDraft> {
  const user = await requireSessionUser();

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) throw new Error("A photo is required");

  const buffer = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;

  return runTracedGraph({ userId: user.id, tags: ["photo-to-item"], runName: "photo-to-item" }, (options) =>
    runPhotoToItemGraph(dataUrl, options),
  );
}

export async function createItemFromCaptureAction(formData: FormData) {
  const user = await requireSessionUser();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name is required");

  const description = String(formData.get("description") ?? "").trim() || undefined;
  const quantityRaw = String(formData.get("quantity") ?? "").trim();
  const currency = normalizeCurrency(String(formData.get("currency") ?? ""));
  const purchasePrice = String(formData.get("purchasePrice") ?? "").trim() || undefined;
  const purchaseDate = String(formData.get("purchaseDate") ?? "").trim() || undefined;
  const locationId = String(formData.get("locationId") ?? "").trim() || null;
  const labelIds = formData.getAll("labelIds").map(String).filter(Boolean);

  const [item] = await itemQueries.createItem(user.id, {
    name,
    description,
    quantity: quantityRaw ? Number(quantityRaw) : undefined,
    currency,
    purchasePrice,
    purchaseDate,
    locationId,
  });
  if (!item) throw new Error("Failed to create item");

  if (labelIds.length > 0) {
    await itemLabelQueries.setItemLabels(user.id, item.id, labelIds);
  }
  await itemActivityQueries.recordItemActivity(user.id, { itemName: item.name, action: "created", itemId: item.id });

  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    const ownerId = await resolveEffectiveOwnerId(user.id);
    const supabase = await createSupabaseServerClient();
    const path = await uploadAttachment(supabase, ownerId, item.id, photo, photo.name || "photo.jpg");
    await attachmentQueries.createAttachment(user.id, { itemId: item.id, type: "photo", storagePath: path });
  }

  revalidatePath("/items");
}
