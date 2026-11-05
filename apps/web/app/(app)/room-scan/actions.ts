"use server";

import { itemDraftSchema, runRoomScanGraph, type RoomScanDraft } from "@homebox-ai/ai";
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

export async function analyzeRoomAction(
  formData: FormData,
): Promise<{ data: RoomScanDraft } | { error: string }> {
  try {
    const user = await requireSessionUser();

    const file = formData.get("photo");
    if (!(file instanceof File) || file.size === 0) return { error: "A room photo is required" };
    if (file.size > 10 * 1024 * 1024) return { error: "Photo too large (max 10 MB)" };
    if (!file.type.startsWith("image/")) return { error: "Only image files are accepted" };

    const buffer = Buffer.from(await file.arrayBuffer());
    const dataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;

    const draft = await runTracedGraph(
      { userId: user.id, tags: ["room-scan"], runName: "room-scan" },
      (options) => runRoomScanGraph(dataUrl, options),
    );

    return { data: draft };
  } catch (err) {
    console.error("[room-scan] analyzeRoomAction failed:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: message.length > 200 ? message.slice(0, 200) : message };
  }
}

export async function importRoomScanItemsAction(
  formData: FormData,
): Promise<{ success: true } | { error: string }> {
  try {
    const user = await requireSessionUser();

    const raw: unknown = JSON.parse(String(formData.get("items")));
    if (!Array.isArray(raw) || raw.length === 0) return { error: "No items to import" };
    if (raw.length > 50) return { error: "Too many items (max 50)" };

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
    const currency = normalizeCurrency(String(formData.get("currency") ?? ""));
    const labelIds = formData.getAll("labelIds").map(String).filter(Boolean);

    const photo = formData.get("photo");
    let photoPath: string | null = null;
    if (photo instanceof File && photo.size > 0) {
      const ownerId = await resolveEffectiveOwnerId(user.id);
      const supabase = await createSupabaseServerClient();
      const ext = (photo.name || "").split(".").pop();
      const uniqueName = ext ? `${crypto.randomUUID()}.${ext}` : `${crypto.randomUUID()}.jpg`;
      photoPath = await uploadAttachment(supabase, ownerId, crypto.randomUUID(), photo, uniqueName);
    }

    await mapWithConcurrency(items, IMPORT_CONCURRENCY, async (draft) => {
      const [item] = await itemQueries.createItem(user.id, {
        name: draft.name,
        description: draft.description,
        quantity: draft.quantity,
        currency,
        purchasePrice: draft.purchasePrice,
        locationId: draft.lineLocationId !== undefined ? draft.lineLocationId : locationId,
      });
      if (!item) return;

      await Promise.all([
        labelIds.length > 0 ? itemLabelQueries.setItemLabels(user.id, item.id, labelIds) : undefined,
        photoPath
          ? attachmentQueries.createAttachment(user.id, { itemId: item.id, type: "photo", storagePath: photoPath })
          : undefined,
        itemActivityQueries.recordItemActivity(user.id, { itemName: item.name, action: "created", itemId: item.id }),
      ]);
    });

    revalidatePath("/items");
    return { success: true };
  } catch (err) {
    console.error("[room-scan] importRoomScanItemsAction failed:", err);
    return { error: err instanceof Error ? err.message : "Couldn't add these items" };
  }
}
