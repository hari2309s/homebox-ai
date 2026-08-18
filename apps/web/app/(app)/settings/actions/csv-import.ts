"use server";

import { itemLabelQueries, itemQueries, labelQueries, locationQueries } from "@homebox-ai/db";
import { requireSessionUser } from "@homebox-ai/supabase/server";
import { revalidatePath } from "next/cache";

import { mapWithConcurrency } from "../../../../lib/concurrency";
import { parseCsv, unescapeCsvFormula } from "../../../../lib/csv";
import { createNameResolver } from "./name-resolver";

const IMPORT_CONCURRENCY = 5;

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
