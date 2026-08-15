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
import { createSupabaseServerClient, getSessionUser } from "@homebox-ai/supabase/server";
import { deleteAllUserAttachments, uploadAttachment } from "@homebox-ai/supabase/storage";
import JSZip from "jszip";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { parseCsv } from "../../../lib/csv";

export async function deleteAccountAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");

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
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a CSV file to import");

  const rows = parseCsv(await file.text());
  const [header, ...dataRows] = rows;
  if (!header || dataRows.length === 0) throw new Error("CSV has no data rows");

  const columnIndex = new Map(header.map((name, index) => [name.trim(), index]));
  const cell = (row: string[], name: string) => {
    const index = columnIndex.get(name);
    return index === undefined ? "" : (row[index] ?? "").trim();
  };

  const existingLocations = await locationQueries.listLocations(user.id);
  const locationIdByName = new Map(existingLocations.map((location) => [location.name.toLowerCase(), location.id]));
  const existingLabels = await labelQueries.listLabels(user.id);
  const labelIdByName = new Map(existingLabels.map((label) => [label.name.toLowerCase(), label.id]));

  let imported = 0;

  for (const row of dataRows) {
    if (row.every((value) => !value.trim())) continue;

    const name = cell(row, "name");
    if (!name) continue;

    let locationId: string | null = null;
    const locationName = cell(row, "location");
    if (locationName) {
      const key = locationName.toLowerCase();
      locationId = locationIdByName.get(key) ?? null;
      if (!locationId) {
        const [created] = await locationQueries.createLocation(user.id, { name: locationName });
        if (created) {
          locationId = created.id;
          locationIdByName.set(key, created.id);
        }
      }
    }

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
    if (!item) continue;
    imported += 1;

    const labelNames = cell(row, "labels")
      .split(";")
      .map((value) => value.trim())
      .filter(Boolean);
    if (labelNames.length === 0) continue;

    const labelIds: string[] = [];
    for (const labelName of labelNames) {
      const key = labelName.toLowerCase();
      let labelId = labelIdByName.get(key);
      if (!labelId) {
        const [created] = await labelQueries.createLabel(user.id, { name: labelName });
        if (created) {
          labelId = created.id;
          labelIdByName.set(key, created.id);
        }
      }
      if (labelId) labelIds.push(labelId);
    }
    if (labelIds.length > 0) await itemLabelQueries.setItemLabels(user.id, item.id, labelIds);
  }

  revalidatePath("/items");
  return { imported };
}

export async function getShareStatusAction() {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");
  return sharingQueries.getShareStatus(user.id);
}

export async function listPendingInvitesAction() {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");
  return sharingQueries.listPendingInvites(user.id);
}

export async function createInviteAction() {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");
  return sharingQueries.createInvite(user.id);
}

export async function revokeInviteAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");

  const inviteId = String(formData.get("inviteId") ?? "").trim();
  if (!inviteId) throw new Error("Missing invite id");

  await sharingQueries.revokeInvite(user.id, inviteId);
  revalidatePath("/settings");
}

export async function removeMemberAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");

  const memberUserId = String(formData.get("memberUserId") ?? "").trim();
  if (!memberUserId) throw new Error("Missing member id");

  await sharingQueries.removeMember(user.id, memberUserId);
  revalidatePath("/settings");
}

export async function leaveHouseholdAction() {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");

  await sharingQueries.leaveSharedHousehold(user.id);
  revalidatePath("/settings");
}

interface ZipManifest {
  locations?: { id: string; name: string; parentId: string | null }[];
  labels?: { id: string; name: string; color: string | null }[];
  items?: Record<string, unknown>[];
  itemLabels?: { itemId: string; labelId: string }[];
  maintenanceEntries?: { itemId: string; date: string; name: string; description: string | null; cost: string | null }[];
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
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");

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
  const existingLocations = await locationQueries.listLocations(user.id);
  const locationIdByName = new Map(existingLocations.map((location) => [location.name.toLowerCase(), location.id]));
  const locationIdMap = new Map<string, string>();
  let locationsCreated = 0;
  for (const location of manifest.locations ?? []) {
    const name = String(location.name ?? "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    let newId = locationIdByName.get(key);
    if (!newId) {
      const [created] = await locationQueries.createLocation(user.id, { name });
      if (!created) continue;
      newId = created.id;
      locationIdByName.set(key, newId);
      locationsCreated += 1;
    }
    locationIdMap.set(location.id, newId);
  }
  for (const location of manifest.locations ?? []) {
    if (!location.parentId) continue;
    const newId = locationIdMap.get(location.id);
    const newParentId = locationIdMap.get(location.parentId);
    if (newId && newParentId && newId !== newParentId) {
      await locationQueries.updateLocation(user.id, newId, { name: String(location.name ?? ""), parentId: newParentId });
    }
  }

  // --- Labels: create, deduped by name ---
  const existingLabels = await labelQueries.listLabels(user.id);
  const labelIdByName = new Map(existingLabels.map((label) => [label.name.toLowerCase(), label.id]));
  const labelIdMap = new Map<string, string>();
  let labelsCreated = 0;
  for (const label of manifest.labels ?? []) {
    const name = String(label.name ?? "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    let newId = labelIdByName.get(key);
    if (!newId) {
      const [created] = await labelQueries.createLabel(user.id, { name, color: label.color ?? null });
      if (!created) continue;
      newId = created.id;
      labelIdByName.set(key, newId);
      labelsCreated += 1;
    }
    labelIdMap.set(label.id, newId);
  }

  // --- Items: create, then wire up parentItemId (both passes need the full id map first) ---
  const itemIdMap = new Map<string, string>();
  for (const raw of manifest.items ?? []) {
    const name = String(raw.name ?? "").trim();
    if (!name) continue;
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
    if (created && oldId) itemIdMap.set(oldId, created.id);
  }
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
  for (const [newItemId, labelIds] of labelIdsByNewItem) {
    await itemLabelQueries.setItemLabels(user.id, newItemId, labelIds);
  }

  // --- Maintenance entries ---
  let maintenanceCount = 0;
  for (const entry of manifest.maintenanceEntries ?? []) {
    const newItemId = itemIdMap.get(entry.itemId);
    if (!newItemId) continue;
    const name = String(entry.name ?? "").trim();
    const date = String(entry.date ?? "").trim();
    if (!name || !date) continue;
    await maintenanceQueries.createMaintenanceEntry(user.id, {
      itemId: newItemId,
      name,
      date,
      description: entry.description ? String(entry.description) : undefined,
      cost: entry.cost ? String(entry.cost) : undefined,
    });
    maintenanceCount += 1;
  }

  // --- Attachments: re-upload the actual file bytes bundled in the zip ---
  const supabase = await createSupabaseServerClient();
  let attachmentCount = 0;
  for (const attachment of manifest.attachments ?? []) {
    if (!attachment.zipPath) continue;
    const newItemId = itemIdMap.get(attachment.itemId);
    if (!newItemId) continue;
    const entry = zip.file(attachment.zipPath);
    if (!entry) continue;

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
      attachmentCount += 1;
    } catch (error) {
      // One bad/missing file shouldn't sink the rest of the import.
      console.error("zip import: failed to restore an attachment", error);
    }
  }

  revalidatePath("/items");

  return {
    locations: locationsCreated,
    labels: labelsCreated,
    items: itemIdMap.size,
    maintenanceEntries: maintenanceCount,
    attachments: attachmentCount,
  };
}
