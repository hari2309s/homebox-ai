import {
  attachmentQueries,
  itemLabelQueries,
  itemQueries,
  labelQueries,
  locationQueries,
  maintenanceQueries,
} from "@homebox-ai/db";
import JSZip from "jszip";
import { NextResponse } from "next/server";

import { createSupabaseServerClient, getSessionUser } from "@homebox-ai/supabase/server";

// Bundles everything the JSON/CSV exports leave out: the actual attachment
// files, alongside a manifest that /api/import/zip can use to recreate
// items/locations/labels/attachments/maintenance entries in one pass.
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const [items, locations, labels, itemLabels, attachments, maintenanceEntries] = await Promise.all([
    itemQueries.searchItems(user.id, { includeArchived: true }),
    locationQueries.listLocations(user.id),
    labelQueries.listLabels(user.id),
    itemLabelQueries.listAllItemLabelsForUser(user.id),
    attachmentQueries.listAllAttachments(user.id),
    maintenanceQueries.listAllMaintenance(user.id),
  ]);

  const zip = new JSZip();
  const supabase = await createSupabaseServerClient();

  const attachmentManifest = await Promise.all(
    attachments.map(async (attachment) => {
      const { data, error } = await supabase.storage.from("attachments").download(attachment.storagePath);
      if (error || !data) {
        // Logged rather than silently dropped — the export still succeeds
        // (one bad file shouldn't block the rest of the backup), but this
        // attachment's metadata is recorded with zipPath: null so it's
        // visibly excluded rather than looking identical to a successful one.
        console.error(`zip export: couldn't download attachment ${attachment.id} (${attachment.storagePath}):`, error);
        return {
          id: attachment.id,
          itemId: attachment.itemId,
          type: attachment.type,
          isPrimary: attachment.isPrimary,
          zipPath: null,
        };
      }
      const lastDot = attachment.storagePath.lastIndexOf(".");
      const ext = lastDot >= 0 ? attachment.storagePath.slice(lastDot) : "";
      const zipPath = `attachments/${attachment.id}${ext}`;
      zip.file(zipPath, Buffer.from(await data.arrayBuffer()));
      return {
        id: attachment.id,
        itemId: attachment.itemId,
        type: attachment.type,
        isPrimary: attachment.isPrimary,
        zipPath,
      };
    }),
  );

  const manifest = {
    exportedAt: new Date().toISOString(),
    account: { email: user.email },
    locations,
    labels,
    items,
    itemLabels,
    maintenanceEntries,
    attachments: attachmentManifest,
  };

  zip.file("data.json", JSON.stringify(manifest, null, 2));

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
  // Buffer's underlying ArrayBufferLike type (which admits SharedArrayBuffer)
  // doesn't satisfy Response's BodyInit — Uint8Array.from() copies into a
  // fresh, plain ArrayBuffer that does.
  return new NextResponse(Uint8Array.from(zipBuffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="homebox-full-export-${new Date().toISOString().slice(0, 10)}.zip"`,
    },
  });
}
