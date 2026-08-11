import { eq } from "drizzle-orm";

import { attachments } from "../schema";
import { withRLS } from "../rls";

export interface CreateAttachmentInput {
  itemId: string;
  type: "photo" | "receipt" | "manual";
  storagePath: string;
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
