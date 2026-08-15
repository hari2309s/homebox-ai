"use server";

import { createLangfuseHandler, itemDraftSchema, runReceiptImportGraph, type ReceiptDraft } from "@homebox-ai/ai";
import { attachmentQueries, itemLabelQueries, itemQueries, resolveEffectiveOwnerId } from "@homebox-ai/db";
import { createSupabaseServerClient, getSessionUser } from "@homebox-ai/supabase/server";
import { uploadAttachment } from "@homebox-ai/supabase/storage";
import { after } from "next/server";
import { revalidatePath } from "next/cache";

import { langfuseSpanProcessor } from "../../../instrumentation-node";

export async function analyzeReceiptAction(formData: FormData): Promise<ReceiptDraft> {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) throw new Error("A receipt photo is required");

  const buffer = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;

  const langfuseHandler = createLangfuseHandler({ userId: user.id, tags: ["receipt-import"] });
  const draft = await runReceiptImportGraph(dataUrl, { callbacks: [langfuseHandler], runName: "receipt-import" });

  after(async () => {
    await langfuseSpanProcessor.forceFlush();
  });

  return draft;
}

export async function importReceiptItemsAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");

  const items = itemDraftSchema
    .array()
    .min(1, "No items to import")
    .parse(JSON.parse(String(formData.get("items"))));

  const locationId = String(formData.get("locationId") ?? "").trim() || null;
  const purchaseDate = String(formData.get("purchaseDate") ?? "").trim() || undefined;
  const labelIds = formData.getAll("labelIds").map(String).filter(Boolean);

  const photo = formData.get("photo");
  let photoPath: string | null = null;
  if (photo instanceof File && photo.size > 0) {
    const ownerId = await resolveEffectiveOwnerId(user.id);
    const supabase = await createSupabaseServerClient();
    // One shared upload for the whole receipt — the path's second segment
    // just needs to be a unique folder, not a real item id (storage RLS only
    // checks the leading owner-id segment via has_shared_access(); each
    // created item below gets its own `attachments` row pointing at this
    // same object).
    photoPath = await uploadAttachment(supabase, ownerId, crypto.randomUUID(), photo, photo.name || "receipt.jpg");
  }

  for (const draft of items) {
    const [item] = await itemQueries.createItem(user.id, {
      name: draft.name,
      description: draft.description,
      quantity: draft.quantity,
      purchasePrice: draft.purchasePrice,
      purchaseDate: draft.purchaseDate ?? purchaseDate,
      locationId,
    });
    if (!item) continue;

    if (labelIds.length > 0) {
      await itemLabelQueries.setItemLabels(user.id, item.id, labelIds);
    }
    if (photoPath) {
      await attachmentQueries.createAttachment(user.id, { itemId: item.id, type: "receipt", storagePath: photoPath });
    }
  }

  revalidatePath("/items");
}
