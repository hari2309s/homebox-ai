"use server";

import { pendingActionSchema } from "@homebox-ai/ai";
import {
  chatQueries,
  itemLabelQueries,
  itemQueries,
  labelQueries,
  locationQueries,
  maintenanceQueries,
} from "@homebox-ai/db";
import { revalidatePath } from "next/cache";

import { getSessionUser } from "@homebox-ai/supabase/server";

/**
 * The only place that actually performs a chat-proposed mutation. `rawAction`
 * arrives back from the client, which held it in React state since the API
 * response that created it — an untrusted round-trip, so it's re-validated
 * against the same schema the tool built it against rather than trusted as
 * server-originated. Every query call below is still scoped to `user.id`
 * (RLS/effective-owner resolution happens inside those, same as everywhere
 * else in the app), so a tampered id just fails to match rather than
 * touching another user's data.
 */
export async function confirmChatActionAction(sessionId: string, rawAction: unknown): Promise<{ message: string }> {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");

  const parsed = pendingActionSchema.safeParse(rawAction);
  if (!parsed.success) throw new Error("That action looks malformed — please try asking again.");
  const action = parsed.data;

  let message: string;
  switch (action.type) {
    case "create_location": {
      const [created] = await locationQueries.createLocation(user.id, {
        name: action.name,
        parentId: action.parentLocationId ?? null,
      });
      if (!created) throw new Error("Couldn't create the location.");
      revalidatePath("/locations");
      message = `Added the "${created.name}" location.`;
      break;
    }
    case "create_label": {
      const [created] = await labelQueries.createLabel(user.id, { name: action.name, color: action.color ?? null });
      if (!created) throw new Error("Couldn't create the label.");
      revalidatePath("/labels");
      message = `Added the "${created.name}" label.`;
      break;
    }
    case "create_item": {
      const [created] = await itemQueries.createItem(user.id, {
        name: action.name,
        description: action.description,
        quantity: action.quantity,
        locationId: action.locationId ?? null,
        purchasePrice: action.purchasePrice,
        purchaseDate: action.purchaseDate,
        warrantyExpires: action.warrantyExpires,
      });
      if (!created) throw new Error("Couldn't create the item.");
      if (action.labelNames && action.labelNames.length > 0) {
        const labelIds = await labelQueries.resolveOrCreateLabelIds(user.id, action.labelNames);
        if (labelIds.length > 0) await itemLabelQueries.setItemLabels(user.id, created.id, labelIds);
      }
      revalidatePath("/items");
      message = `Added "${created.name}".`;
      break;
    }
    case "update_item": {
      const [updated] = await itemQueries.updateItem(user.id, action.itemId, {
        name: action.name,
        description: action.description,
        quantity: action.quantity,
        locationId: action.locationId,
        purchasePrice: action.purchasePrice,
        purchaseDate: action.purchaseDate,
        warrantyExpires: action.warrantyExpires,
      });
      if (!updated) throw new Error("Couldn't update the item — it may no longer exist.");
      revalidatePath("/items");
      revalidatePath(`/items/${updated.id}`);
      message = `Updated "${updated.name}".`;
      break;
    }
    case "add_maintenance_entry": {
      const [created] = await maintenanceQueries.createMaintenanceEntry(user.id, {
        itemId: action.itemId,
        name: action.name,
        date: action.date,
        description: action.description,
        cost: action.cost,
      });
      if (!created) throw new Error("Couldn't log the entry — the item may no longer exist.");
      revalidatePath(`/items/${action.itemId}`);
      message = `Logged "${created.name}".`;
      break;
    }
  }

  await chatQueries.createChatMessage(user.id, { sessionId, role: "assistant", content: message });
  return { message };
}

export async function listChatSessionsAction() {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");

  const sessions = await chatQueries.listChatSessions(user.id);
  return sessions.map((session) => ({
    sessionId: session.sessionId,
    title: session.firstMessage.length > 60 ? `${session.firstMessage.slice(0, 60)}…` : session.firstMessage,
    lastMessageAt: new Date(session.lastMessageAt).toISOString(),
    hasUnread: session.hasUnread,
  }));
}

export async function loadChatSessionAction(sessionId: string) {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");

  const messages = await chatQueries.listChatMessages(user.id, sessionId);
  await chatQueries.markSessionMessagesRead(user.id, sessionId);
  return messages.map((message) => ({ id: message.id, role: message.role, content: message.content }));
}
