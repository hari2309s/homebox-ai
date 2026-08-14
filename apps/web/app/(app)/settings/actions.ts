"use server";

import { itemLabelQueries, itemQueries, labelQueries, locationQueries } from "@homebox-ai/db";
import { createSupabaseAdminClient } from "@homebox-ai/supabase/admin";
import { createSupabaseServerClient, getSessionUser } from "@homebox-ai/supabase/server";
import { deleteAllUserAttachments } from "@homebox-ai/supabase/storage";
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
