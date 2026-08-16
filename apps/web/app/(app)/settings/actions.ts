"use server";

import {
  attachmentQueries,
  itemLabelQueries,
  itemQueries,
  labelQueries,
  locationQueries,
  maintenanceQueries,
  resolveEffectiveOwnerId,
  sharingQueries,
} from "@homebox-ai/db";
import { createSupabaseAdminClient } from "@homebox-ai/supabase/admin";
import { createSupabaseServerClient, requireSessionUser } from "@homebox-ai/supabase/server";
import { deleteAllUserAttachments, uploadAttachment } from "@homebox-ai/supabase/storage";
import JSZip from "jszip";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { mapWithConcurrency } from "../../../lib/concurrency";
import { parseCsv, unescapeCsvFormula } from "../../../lib/csv";

const IMPORT_CONCURRENCY = 5;

/**
 * Builds a name -> id resolver seeded from `existing`, creating a new row
 * (and remembering it) the first time a name isn't found. Both the CSV and
 * ZIP importers below need this same "dedupe locations/labels by name,
 * create on miss" behavior, just with different underlying create calls.
 */
function createNameResolver<T extends { id: string }>(
  existing: { id: string; name: string }[],
  create: (name: string) => Promise<T | undefined>,
) {
  const idByName = new Map(existing.map((item) => [item.name.toLowerCase(), item.id]));
  return async (name: string): Promise<{ id: string; created: boolean } | null> => {
    const key = name.toLowerCase();
    const existingId = idByName.get(key);
    if (existingId) return { id: existingId, created: false };

    const created = await create(name);
    if (!created) return null;
    idByName.set(key, created.id);
    return { id: created.id, created: true };
  };
}

export async function deleteAccountAction(formData: FormData) {
  const user = await requireSessionUser();

  // Re-check the "type your email to confirm" gate server-side — the client
  // only disables the submit button, which isn't a real guard against an
  // irreversible action being triggered without it (e.g. a submitted form
  // missing its expected fields).
  const confirmation = String(formData.get("confirm") ?? "")
    .trim()
    .toLowerCase();
  const email = user.email?.trim().toLowerCase();
  if (!email || confirmation !== email) {
    throw new Error("Confirmation text does not match your account email.");
  }

  const admin = createSupabaseAdminClient();

  // Storage objects aren't covered by the DB's cascading foreign keys, so
  // they need explicit cleanup before the auth user (and everything that
  // references it) is deleted.
  await deleteAllUserAttachments(admin, user.id);

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) throw new Error(error.message);

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  redirect("/login");
}

export async function importItemsCsvAction(formData: FormData): Promise<{ imported: number }> {
  const user = await requireSessionUser();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a CSV file to import");

  const rows = parseCsv(await file.text());
  const [header, ...dataRows] = rows;
  if (!header || dataRows.length === 0) throw new Error("CSV has no data rows");

  const columnIndex = new Map(header.map((name, index) => [name.trim(), index]));
  const cell = (row: string[], name: string) => {
    const index = columnIndex.get(name);
    if (index === undefined) return "";
    // Undoes the safety prefix toCsv() adds to formula-trigger characters —
    // without this, re-importing our own export would grow a stray leading
    // apostrophe on any field that needed it (e.g. a name starting with "-").
    return unescapeCsvFormula((row[index] ?? "").trim());
  };

  const resolveLocationId = createNameResolver(await locationQueries.listLocations(user.id), async (name) => {
    const [created] = await locationQueries.createLocation(user.id, { name });
    return created;
  });
  const resolveLabelId = createNameResolver(await labelQueries.listLabels(user.id), async (name) => {
    const [created] = await labelQueries.createLabel(user.id, { name });
    return created;
  });

  const parsedRows = dataRows
    .filter((row) => !row.every((value) => !value.trim()))
    .map((row) => ({
      row,
      name: cell(row, "name"),
      locationName: cell(row, "location"),
      labelNames: cell(row, "labels")
        .split(";")
        .map((value) => value.trim())
        .filter(Boolean),
    }))
    .filter((record) => record.name);

  // Resolve every distinct location/label name up front, sequentially — the
  // resolver's create-on-miss cache isn't safe to call concurrently for the
  // same new name (two rows could both miss and both create one), so this
  // has to finish before the parallel item-creation pass below starts.
  for (const record of parsedRows) {
    if (record.locationName) await resolveLocationId(record.locationName);
    for (const labelName of record.labelNames) await resolveLabelId(labelName);
  }

  // Every row's item/labels are independent of every other row's now that
  // locations/labels are already resolved, so several can be created at once
  // instead of paying one full DB round-trip per row.
  const created = await mapWithConcurrency(
    parsedRows,
    IMPORT_CONCURRENCY,
    async ({ row, name, locationName, labelNames }) => {
      const locationId = locationName ? ((await resolveLocationId(locationName))?.id ?? null) : null;

      const [item] = await itemQueries.createItem(user.id, {
        name,
        description: cell(row, "description") || undefined,
        quantity: cell(row, "quantity") ? Number(cell(row, "quantity")) : undefined,
        serialNumber: cell(row, "serialNumber") || undefined,
        modelNumber: cell(row, "modelNumber") || undefined,
        manufacturer: cell(row, "manufacturer") || undefined,
        insured: cell(row, "insured").toLowerCase() === "true",
        lifetimeWarranty: cell(row, "lifetimeWarranty").toLowerCase() === "true",
        purchasePrice: cell(row, "purchasePrice") || undefined,
        purchaseDate: cell(row, "purchaseDate") || undefined,
        purchaseFrom: cell(row, "purchaseFrom") || undefined,
        salePrice: cell(row, "salePrice") || undefined,
        saleDate: cell(row, "saleDate") || undefined,
        warrantyExpires: cell(row, "warrantyExpires") || undefined,
        locationId,
        notes: cell(row, "notes") || undefined,
      });
      if (!item) return false;

      if (labelNames.length > 0) {
        const labelIds: string[] = [];
        for (const labelName of labelNames) {
          const resolved = await resolveLabelId(labelName);
          if (resolved) labelIds.push(resolved.id);
        }
        if (labelIds.length > 0) await itemLabelQueries.setItemLabels(user.id, item.id, labelIds);
      }

      return true;
    },
  );

  revalidatePath("/items");
  return { imported: created.filter(Boolean).length };
}

export async function getShareStatusAction() {
  const user = await requireSessionUser();
  return sharingQueries.getShareStatus(user.id);
}

export async function listPendingInvitesAction() {
  const user = await requireSessionUser();
  return sharingQueries.listPendingInvites(user.id);
}

export async function createInviteAction() {
  const user = await requireSessionUser();
  return sharingQueries.createInvite(user.id);
}

export async function revokeInviteAction(formData: FormData) {
  const user = await requireSessionUser();

  const inviteId = String(formData.get("inviteId") ?? "").trim();
  if (!inviteId) throw new Error("Missing invite id");

  await sharingQueries.revokeInvite(user.id, inviteId);
  revalidatePath("/settings");
}

export async function removeMemberAction(formData: FormData) {
  const user = await requireSessionUser();

  const memberUserId = String(formData.get("memberUserId") ?? "").trim();
  if (!memberUserId) throw new Error("Missing member id");

  await sharingQueries.removeMember(user.id, memberUserId);
  revalidatePath("/settings");
}

export async function leaveHouseholdAction() {
  const user = await requireSessionUser();

  await sharingQueries.leaveSharedHousehold(user.id);
  revalidatePath("/settings");
}

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
      purchasePrice: raw.purchasePrice ? String(raw.purchasePrice) : undefined,
      purchaseDate: raw.purchaseDate ? String(raw.purchaseDate) : undefined,
      purchaseFrom: raw.purchaseFrom ? String(raw.purchaseFrom) : undefined,
      salePrice: raw.salePrice ? String(raw.salePrice) : undefined,
      saleDate: raw.saleDate ? String(raw.saleDate) : undefined,
      warrantyExpires: raw.warrantyExpires ? String(raw.warrantyExpires) : undefined,
      locationId: oldLocationId ? (locationIdMap.get(oldLocationId) ?? null) : null,
      notes: raw.notes ? String(raw.notes) : undefined,
    });
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
