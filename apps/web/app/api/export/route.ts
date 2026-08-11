import {
  attachmentQueries,
  chatQueries,
  itemLabelQueries,
  itemQueries,
  labelQueries,
  locationQueries,
  maintenanceQueries,
} from "@homebox-ai/db";
import { NextResponse } from "next/server";

import { getSessionUser } from "@homebox-ai/supabase/server";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const [items, locations, labels, itemLabels, attachments, maintenanceEntries, chatMessages] = await Promise.all([
    itemQueries.searchItems(user.id),
    locationQueries.listLocations(user.id),
    labelQueries.listLabels(user.id),
    itemLabelQueries.listAllItemLabelsForUser(user.id),
    attachmentQueries.listAllAttachments(user.id),
    maintenanceQueries.listAllMaintenance(user.id),
    chatQueries.listAllChatMessages(user.id),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    account: { email: user.email },
    locations,
    labels,
    items,
    itemLabels,
    attachments,
    maintenanceEntries,
    chatMessages,
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="homebox-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
