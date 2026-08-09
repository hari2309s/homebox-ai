"use server";

import { createLangfuseHandler, runPhotoToItemGraph, type ItemDraft } from "@homebox-ai/ai";
import { attachmentQueries, itemLabelQueries, itemQueries } from "@homebox-ai/db";
import { createSupabaseServerClient, getSessionUser } from "@homebox-ai/supabase/server";
import { uploadAttachment } from "@homebox-ai/supabase/storage";
import { after } from "next/server";
import { revalidatePath } from "next/cache";

import { langfuseSpanProcessor } from "../../../instrumentation-node";

export async function analyzePhotoAction(formData: FormData): Promise<ItemDraft> {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) throw new Error("A photo is required");

  const buffer = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;

  const langfuseHandler = createLangfuseHandler({ userId: user.id, tags: ["photo-to-item"] });
  const draft = await runPhotoToItemGraph(dataUrl, { callbacks: [langfuseHandler], runName: "photo-to-item" });

  after(async () => {
    await langfuseSpanProcessor.forceFlush();
  });

  return draft;
}

export async function createItemFromCaptureAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name is required");

  const description = String(formData.get("description") ?? "").trim() || undefined;
  const quantityRaw = String(formData.get("quantity") ?? "").trim();
  const purchasePrice = String(formData.get("purchasePrice") ?? "").trim() || undefined;
  const purchaseDate = String(formData.get("purchaseDate") ?? "").trim() || undefined;
  const locationId = String(formData.get("locationId") ?? "").trim() || null;
  const labelIds = formData.getAll("labelIds").map(String).filter(Boolean);

  const [item] = await itemQueries.createItem(user.id, {
    name,
    description,
    quantity: quantityRaw ? Number(quantityRaw) : undefined,
    purchasePrice,
    purchaseDate,
    locationId,
  });
  if (!item) throw new Error("Failed to create item");

  if (labelIds.length > 0) {
    await itemLabelQueries.setItemLabels(user.id, item.id, labelIds);
  }

  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    const supabase = await createSupabaseServerClient();
    const path = await uploadAttachment(supabase, user.id, item.id, photo, photo.name || "photo.jpg");
    await attachmentQueries.createAttachment(user.id, { itemId: item.id, type: "photo", storagePath: path });
  }

  revalidatePath("/items");
}
