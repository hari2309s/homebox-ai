import { and, asc, eq } from "drizzle-orm";

import { getEffectiveOwnerId } from "../access";
import { items, reminders } from "../schema";
import { withRLS } from "../rls";

export interface CreateReminderInput {
  itemId?: string;
  title: string;
  description?: string;
  dueDate: string;
  assignedToUserId?: string;
}

/** All reminders for the household, joined with the linked item's name (if any), soonest first. */
export function listReminders(userId: string) {
  return withRLS(userId, async (tx) => {
    const ownerId = await getEffectiveOwnerId(tx, userId);
    return tx
      .select({
        id: reminders.id,
        itemId: reminders.itemId,
        itemName: items.name,
        title: reminders.title,
        description: reminders.description,
        dueDate: reminders.dueDate,
        assignedToUserId: reminders.assignedToUserId,
        status: reminders.status,
        completedAt: reminders.completedAt,
        createdBy: reminders.createdBy,
        createdAt: reminders.createdAt,
      })
      .from(reminders)
      .leftJoin(items, eq(reminders.itemId, items.id))
      .where(eq(reminders.ownerId, ownerId))
      .orderBy(asc(reminders.dueDate));
  });
}

export function createReminder(userId: string, data: CreateReminderInput) {
  return withRLS(userId, async (tx) => {
    const ownerId = await getEffectiveOwnerId(tx, userId);
    return tx
      .insert(reminders)
      .values({ ownerId, createdBy: userId, ...data })
      .returning();
  });
}

export function completeReminder(userId: string, reminderId: string) {
  return withRLS(userId, async (tx) => {
    const ownerId = await getEffectiveOwnerId(tx, userId);
    return tx
      .update(reminders)
      .set({ status: "done", completedAt: new Date() })
      .where(and(eq(reminders.id, reminderId), eq(reminders.ownerId, ownerId)))
      .returning();
  });
}

export function reopenReminder(userId: string, reminderId: string) {
  return withRLS(userId, async (tx) => {
    const ownerId = await getEffectiveOwnerId(tx, userId);
    return tx
      .update(reminders)
      .set({ status: "pending", completedAt: null })
      .where(and(eq(reminders.id, reminderId), eq(reminders.ownerId, ownerId)))
      .returning();
  });
}

export function deleteReminder(userId: string, reminderId: string) {
  return withRLS(userId, async (tx) => {
    const ownerId = await getEffectiveOwnerId(tx, userId);
    return tx
      .delete(reminders)
      .where(and(eq(reminders.id, reminderId), eq(reminders.ownerId, ownerId)))
      .returning();
  });
}
