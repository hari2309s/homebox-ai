import { itemLabelQueries, itemQueries, labelQueries, locationQueries } from "@homebox-ai/db";
import { NextResponse } from "next/server";

import { getSessionUser } from "@homebox-ai/supabase/server";

import { toCsv } from "../../../../lib/csv";

const HEADERS = [
  "name",
  "description",
  "quantity",
  "assetId",
  "serialNumber",
  "modelNumber",
  "manufacturer",
  "insured",
  "archived",
  "lifetimeWarranty",
  "currency",
  "purchasePrice",
  "purchaseDate",
  "purchaseFrom",
  "salePrice",
  "saleDate",
  "soldTo",
  "soldNotes",
  "warrantyExpires",
  "location",
  "labels",
  "notes",
];

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const [items, locations, labels, itemLabelRows] = await Promise.all([
    itemQueries.searchItems(user.id, { includeArchived: true }),
    locationQueries.listLocations(user.id),
    labelQueries.listLabels(user.id),
    itemLabelQueries.listAllItemLabelsForUser(user.id),
  ]);

  const locationNameById = new Map(locations.map((location) => [location.id, location.name]));
  const labelNameById = new Map(labels.map((label) => [label.id, label.name]));
  const labelIdsByItem = new Map<string, string[]>();
  for (const row of itemLabelRows) {
    const list = labelIdsByItem.get(row.itemId) ?? [];
    list.push(row.labelId);
    labelIdsByItem.set(row.itemId, list);
  }

  const rows = items.map((item) => [
    item.name,
    item.description ?? "",
    String(item.quantity),
    item.assetId != null ? String(item.assetId) : "",
    item.serialNumber ?? "",
    item.modelNumber ?? "",
    item.manufacturer ?? "",
    item.insured ? "true" : "false",
    item.archived ? "true" : "false",
    item.lifetimeWarranty ? "true" : "false",
    item.currency,
    item.purchasePrice ?? "",
    item.purchaseDate ?? "",
    item.purchaseFrom ?? "",
    item.salePrice ?? "",
    item.saleDate ?? "",
    item.soldTo ?? "",
    item.soldNotes ?? "",
    item.warrantyExpires ?? "",
    item.locationId ? (locationNameById.get(item.locationId) ?? "") : "",
    (labelIdsByItem.get(item.id) ?? [])
      .map((labelId) => labelNameById.get(labelId) ?? "")
      .filter(Boolean)
      .join(";"),
    item.notes ?? "",
  ]);

  const csv = toCsv(HEADERS, rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="homebox-items-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
