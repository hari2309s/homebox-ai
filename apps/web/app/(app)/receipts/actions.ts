"use server";

import { itemDraftSchema, runReceiptImportGraph, type ReceiptDraft } from "@homebox-ai/ai";
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

import { mapWithConcurrency } from "../../../lib/concurrency";
import { normalizeCurrency } from "../../../lib/currency";
import { runTracedGraph } from "../../../lib/traced-graph";

const IMPORT_CONCURRENCY = 5;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function analyzeReceiptAction(formData: FormData): Promise<ReceiptDraft> {
  const user = await requireSessionUser();

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) throw new Error("A receipt photo is required");

  const buffer = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;

  return runTracedGraph({ userId: user.id, tags: ["receipt-import"], runName: "receipt-import" }, (options) =>
    runReceiptImportGraph(dataUrl, options),
  );
}

export async function importReceiptItemsAction(formData: FormData) {
  const user = await requireSessionUser();

  const raw: unknown = JSON.parse(String(formData.get("items")));
  if (!Array.isArray(raw) || raw.length === 0) throw new Error("No items to import");
  // Each line may carry its own location (desktop table); lines without one use the shared "put everything in".
  const items = raw.map((entry) => {
    const lineLocation = (entry as { locationId?: unknown } | null)?.locationId;
    return {
      ...itemDraftSchema.parse(entry),
      lineLocationId:
        lineLocation === null
          ? null
          : typeof lineLocation === "string" && UUID.test(lineLocation)
            ? lineLocation
            : undefined,
    };
  });

  const locationId = String(formData.get("locationId") ?? "").trim() || null;
  const purchaseDate = String(formData.get("purchaseDate") ?? "").trim() || undefined;
  const currency = normalizeCurrency(String(formData.get("currency") ?? ""));
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

  // Each draft's item/labels/attachment are independent of every other
  // draft's, so these can run several at a time instead of one full DB
  // round-trip per line item.
  await mapWithConcurrency(items, IMPORT_CONCURRENCY, async (draft) => {
    const [item] = await itemQueries.createItem(user.id, {
      name: draft.name,
      description: draft.description,
      quantity: draft.quantity,
      currency,
      purchasePrice: draft.purchasePrice,
      purchaseDate: draft.purchaseDate ?? purchaseDate,
      locationId: draft.lineLocationId !== undefined ? draft.lineLocationId : locationId,
    });
    if (!item) return;

    await Promise.all([
      labelIds.length > 0 ? itemLabelQueries.setItemLabels(user.id, item.id, labelIds) : undefined,
      photoPath
        ? attachmentQueries.createAttachment(user.id, { itemId: item.id, type: "receipt", storagePath: photoPath })
        : undefined,
      itemActivityQueries.recordItemActivity(user.id, { itemName: item.name, action: "created", itemId: item.id }),
    ]);
  });

  revalidatePath("/items");
}
