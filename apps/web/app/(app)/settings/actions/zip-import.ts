"use server";

import {
  attachmentQueries,
  itemActivityQueries,
  itemLabelQueries,
  itemQueries,
  labelQueries,
  locationQueries,
  maintenanceQueries,
  resolveEffectiveOwnerId,
} from "@homebox-ai/db";
import { createSupabaseServerClient, requireSessionUser } from "@homebox-ai/supabase/server";
import { uploadAttachment } from "@homebox-ai/supabase/storage";
import JSZip from "jszip";
import { revalidatePath } from "next/cache";

import { mapWithConcurrency } from "../../../../lib/concurrency";
import { normalizeCurrency } from "../../../../lib/currency";
import { createNameResolver } from "./name-resolver";

const IMPORT_CONCURRENCY = 5;

interface ZipManifest {
  locations?: { id: string; name: string; parentId: string | null }[];
  labels?: { id: string; name: string; color: string | null }[];
  items?: Record<string, unknown>[];
  itemLabels?: { itemId: string; labelId: string }[];
  maintenanceEntries?: {
    itemId: string;
    date: string;
    name: string;
    description: string | null;
    cost: string | null;
  }[];
  attachments?: { id: string; itemId: string; type: string; isPrimary: boolean; zipPath: string | null }[];
}

interface ZipImportSummary {
  locations: number;
  labels: number;
  items: number;
  maintenanceEntries: number;
  attachments: number;
}

const ATTACHMENT_TYPES = new Set(["photo", "receipt", "manual", "warranty"]);

/**
 * Additive merge, not a destructive "restore" — matches how the CSV import
 * already behaves. Locations/labels are deduped by name against what already
 * exists; items, maintenance entries, and attachments are always created
 * fresh. Old ids in the zip only ever exist to remap parent/location/label
 * references onto the newly-created rows in this account.
 */
export async function importZipAction(formData: FormData): Promise<ZipImportSummary> {
  const user = await requireSessionUser();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a ZIP file to import");

  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const dataEntry = zip.file("data.json");
  if (!dataEntry) throw new Error("This doesn't look like a Homebox AI export (missing data.json)");

  let manifest: ZipManifest;
  try {
    manifest = JSON.parse(await dataEntry.async("string"));
  } catch {
    throw new Error("Couldn't read data.json in this ZIP");
  }

  const ownerId = await resolveEffectiveOwnerId(user.id);

  // --- Locations: create (deduped by name), then wire up parents ---
  const resolveLocationId = createNameResolver(await locationQueries.listLocations(user.id), async (name) => {
    const [created] = await locationQueries.createLocation(user.id, { name });
    return created;
  });
  const locationIdMap = new Map<string, string>();
  let locationsCreated = 0;
  for (const location of manifest.locations ?? []) {
    const name = String(location.name ?? "").trim();
    if (!name) continue;
    const resolved = await resolveLocationId(name);
    if (!resolved) continue;
    if (resolved.created) locationsCreated += 1;
    locationIdMap.set(location.id, resolved.id);
  }
  for (const location of manifest.locations ?? []) {
    if (!location.parentId) continue;
    const newId = locationIdMap.get(location.id);
    const newParentId = locationIdMap.get(location.parentId);
    if (newId && newParentId && newId !== newParentId) {
      await locationQueries.updateLocation(user.id, newId, {
        name: String(location.name ?? ""),
        parentId: newParentId,
      });
    }
  }

  // --- Labels: create, deduped by name ---
  const colorByLabelName = new Map(
    (manifest.labels ?? []).map((label) => [
      String(label.name ?? "")
        .trim()
        .toLowerCase(),
      label.color ?? null,
    ]),
  );
  const resolveLabelId = createNameResolver(await labelQueries.listLabels(user.id), async (name) => {
    const [created] = await labelQueries.createLabel(user.id, {
      name,
      color: colorByLabelName.get(name.toLowerCase()) ?? null,
    });
    return created;
  });
  const labelIdMap = new Map<string, string>();
  let labelsCreated = 0;
  for (const label of manifest.labels ?? []) {
    const name = String(label.name ?? "").trim();
    if (!name) continue;
    const resolved = await resolveLabelId(name);
    if (!resolved) continue;
    if (resolved.created) labelsCreated += 1;
    labelIdMap.set(label.id, resolved.id);
  }

  // --- Items: create, then wire up parentItemId (both passes need the full id map first) ---
  // Every row's create call only depends on locationIdMap, which is already
  // fully resolved above, so this pass can run several rows at a time
  // instead of one full DB round-trip per item.
  const itemIdPairs = await mapWithConcurrency(manifest.items ?? [], IMPORT_CONCURRENCY, async (raw) => {
    const name = String(raw.name ?? "").trim();
    if (!name) return null;
    const oldId = String(raw.id ?? "");
    const oldLocationId = raw.locationId ? String(raw.locationId) : null;

    const [created] = await itemQueries.createItem(user.id, {
      name,
      description: raw.description ? String(raw.description) : undefined,
      quantity: Number(raw.quantity) || undefined,
      serialNumber: raw.serialNumber ? String(raw.serialNumber) : undefined,
      modelNumber: raw.modelNumber ? String(raw.modelNumber) : undefined,
      manufacturer: raw.manufacturer ? String(raw.manufacturer) : undefined,
      insured: Boolean(raw.insured),
      lifetimeWarranty: Boolean(raw.lifetimeWarranty),
      currency: normalizeCurrency(raw.currency ? String(raw.currency) : undefined),
      purchasePrice: raw.purchasePrice ? String(raw.purchasePrice) : undefined,
      purchaseDate: raw.purchaseDate ? String(raw.purchaseDate) : undefined,
      purchaseFrom: raw.purchaseFrom ? String(raw.purchaseFrom) : undefined,
      salePrice: raw.salePrice ? String(raw.salePrice) : undefined,
      saleDate: raw.saleDate ? String(raw.saleDate) : undefined,
      warrantyExpires: raw.warrantyExpires ? String(raw.warrantyExpires) : undefined,
      locationId: oldLocationId ? (locationIdMap.get(oldLocationId) ?? null) : null,
      notes: raw.notes ? String(raw.notes) : undefined,
    });
    if (created) {
      await itemActivityQueries.recordItemActivity(user.id, {
        itemName: created.name,
        action: "created",
        itemId: created.id,
      });
    }
    return created && oldId ? ([oldId, created.id] as const) : null;
  });
  const itemIdMap = new Map<string, string>(itemIdPairs.filter((pair) => pair !== null));
  for (const raw of manifest.items ?? []) {
    const oldId = String(raw.id ?? "");
    const oldParentItemId = raw.parentItemId ? String(raw.parentItemId) : null;
    if (!oldParentItemId) continue;
    const newId = itemIdMap.get(oldId);
    const newParentId = itemIdMap.get(oldParentItemId);
    if (newId && newParentId && newId !== newParentId) {
      await itemQueries.updateItem(user.id, newId, { parentItemId: newParentId });
    }
  }

  // --- Item labels: group by new item, one setItemLabels call each ---
  const labelIdsByNewItem = new Map<string, string[]>();
  for (const link of manifest.itemLabels ?? []) {
    const newItemId = itemIdMap.get(link.itemId);
    const newLabelId = labelIdMap.get(link.labelId);
    if (!newItemId || !newLabelId) continue;
    const list = labelIdsByNewItem.get(newItemId) ?? [];
    list.push(newLabelId);
    labelIdsByNewItem.set(newItemId, list);
  }
  await mapWithConcurrency(Array.from(labelIdsByNewItem), IMPORT_CONCURRENCY, ([newItemId, labelIds]) =>
    itemLabelQueries.setItemLabels(user.id, newItemId, labelIds),
  );

  // --- Maintenance entries ---
  const maintenanceResults = await mapWithConcurrency(
    manifest.maintenanceEntries ?? [],
    IMPORT_CONCURRENCY,
    async (entry) => {
      const newItemId = itemIdMap.get(entry.itemId);
      if (!newItemId) return false;
      const name = String(entry.name ?? "").trim();
      const date = String(entry.date ?? "").trim();
      if (!name || !date) return false;
      await maintenanceQueries.createMaintenanceEntry(user.id, {
        itemId: newItemId,
        name,
        date,
        description: entry.description ? String(entry.description) : undefined,
        cost: entry.cost ? String(entry.cost) : undefined,
      });
      return true;
    },
  );
  const maintenanceCount = maintenanceResults.filter(Boolean).length;

  // --- Attachments: re-upload the actual file bytes bundled in the zip ---
  // Each attachment's Storage upload + row create is independent of the
  // others, and the upload itself is the slow part (network I/O) — worth
  // running several at a time rather than one at a time.
  const supabase = await createSupabaseServerClient();
  const attachmentResults = await mapWithConcurrency(
    manifest.attachments ?? [],
    IMPORT_CONCURRENCY,
    async (attachment) => {
      if (!attachment.zipPath) return false;
      const newItemId = itemIdMap.get(attachment.itemId);
      if (!newItemId) return false;
      const entry = zip.file(attachment.zipPath);
      if (!entry) return false;

      try {
        const bytes = await entry.async("uint8array");
        const filename = attachment.zipPath.split("/").pop() ?? "attachment";
        const type = ATTACHMENT_TYPES.has(attachment.type)
          ? (attachment.type as "photo" | "receipt" | "manual" | "warranty")
          : "manual";
        // Uint8Array.from() copies into a fresh, plain ArrayBuffer — Blob's
        // BlobPart type doesn't accept the wider ArrayBufferLike JSZip returns.
        const path = await uploadAttachment(supabase, ownerId, newItemId, new Blob([Uint8Array.from(bytes)]), filename);
        await attachmentQueries.createAttachment(user.id, {
          itemId: newItemId,
          type,
          storagePath: path,
          isPrimary: Boolean(attachment.isPrimary),
        });
        return true;
      } catch (error) {
        // One bad/missing file shouldn't sink the rest of the import.
        console.error("zip import: failed to restore an attachment", error);
        return false;
      }
    },
  );

  revalidatePath("/items");

  return {
    locations: locationsCreated,
    labels: labelsCreated,
    items: itemIdMap.size,
    maintenanceEntries: maintenanceCount,
    attachments: attachmentResults.filter(Boolean).length,
  };
}
