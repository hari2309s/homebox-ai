import { and, eq } from "drizzle-orm";

import { attachments } from "../schema";
import { withRLS } from "../rls";

export interface CreateAttachmentInput {
  itemId: string;
  type: "photo" | "receipt" | "manual" | "warranty";
  storagePath: string;
  isPrimary?: boolean;
}

export function createAttachment(userId: string, data: CreateAttachmentInput) {
  return withRLS(userId, (tx) =>
    tx
      .insert(attachments)
      .values({ ownerId: userId, ...data })
      .returning(),
  );
}

export function listAttachmentsForItem(userId: string, itemId: string) {
  return withRLS(userId, (tx) => tx.select().from(attachments).where(eq(attachments.itemId, itemId)));
}

export function listAllAttachments(userId: string) {
  return withRLS(userId, (tx) => tx.select().from(attachments).where(eq(attachments.ownerId, userId)));
}

// Only one attachment can be "primary" (cover image) per item, so setting one
// clears any other primary flag on that item's attachments first.
export function setPrimaryAttachment(userId: string, itemId: string, attachmentId: string) {
  return withRLS(userId, async (tx) => {
    await tx
      .update(attachments)
      .set({ isPrimary: false })
      .where(and(eq(attachments.itemId, itemId), eq(attachments.ownerId, userId)));
    return tx
      .update(attachments)
      .set({ isPrimary: true })
      .where(and(eq(attachments.id, attachmentId), eq(attachments.ownerId, userId)))
      .returning();
  });
}

export function deleteAttachment(userId: string, attachmentId: string) {
  return withRLS(userId, (tx) =>
    tx.delete(attachments).where(and(eq(attachments.id, attachmentId), eq(attachments.ownerId, userId))).returning(),
  );
}
