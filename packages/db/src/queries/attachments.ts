import { and, eq } from "drizzle-orm";

import { getEffectiveOwnerId } from "../access";
import { attachments } from "../schema";
import { withRLS } from "../rls";

export interface CreateAttachmentInput {
  itemId: string;
  type: "photo" | "receipt" | "manual" | "warranty";
  storagePath: string;
  isPrimary?: boolean;
}

export function createAttachment(userId: string, data: CreateAttachmentInput) {
  return withRLS(userId, async (tx) => {
    const ownerId = await getEffectiveOwnerId(tx, userId);
    return tx
      .insert(attachments)
      .values({ ownerId, ...data })
      .returning();
  });
}

export function listAttachmentsForItem(userId: string, itemId: string) {
  return withRLS(userId, async (tx) => {
    const ownerId = await getEffectiveOwnerId(tx, userId);
    return tx
      .select()
      .from(attachments)
      .where(and(eq(attachments.itemId, itemId), eq(attachments.ownerId, ownerId)));
  });
}

export function listAllAttachments(userId: string) {
  return withRLS(userId, async (tx) => {
    const ownerId = await getEffectiveOwnerId(tx, userId);
    return tx.select().from(attachments).where(eq(attachments.ownerId, ownerId));
  });
}

// Only one attachment can be "primary" (cover image) per item, so setting one
// clears any other primary flag on that item's attachments first.
export function setPrimaryAttachment(userId: string, itemId: string, attachmentId: string) {
  return withRLS(userId, async (tx) => {
    const ownerId = await getEffectiveOwnerId(tx, userId);
    await tx
      .update(attachments)
      .set({ isPrimary: false })
      .where(and(eq(attachments.itemId, itemId), eq(attachments.ownerId, ownerId)));
    return tx
      .update(attachments)
      .set({ isPrimary: true })
      .where(and(eq(attachments.id, attachmentId), eq(attachments.ownerId, ownerId)))
      .returning();
  });
}

export function deleteAttachment(userId: string, attachmentId: string) {
  return withRLS(userId, async (tx) => {
    const ownerId = await getEffectiveOwnerId(tx, userId);
    return tx
      .delete(attachments)
      .where(and(eq(attachments.id, attachmentId), eq(attachments.ownerId, ownerId)))
      .returning();
  });
}
