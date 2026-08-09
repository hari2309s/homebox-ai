import type { SupabaseClient } from "@supabase/supabase-js";

const ATTACHMENTS_BUCKET = "attachments";

/**
 * Path convention the "attachments" bucket's RLS policies rely on
 * (see packages/db/src/policies/storage_attachments.sql): the first path
 * segment must be the owning user's id.
 */
export function attachmentPath(userId: string, itemId: string, filename: string) {
  return `${userId}/${itemId}/${filename}`;
}

export async function uploadAttachment(
  supabase: SupabaseClient,
  userId: string,
  itemId: string,
  file: File | Blob,
  filename: string,
) {
  const path = attachmentPath(userId, itemId, filename);
  const { error } = await supabase.storage.from(ATTACHMENTS_BUCKET).upload(path, file, {
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export function getAttachmentSignedUrl(supabase: SupabaseClient, path: string, expiresInSeconds = 3600) {
  return supabase.storage.from(ATTACHMENTS_BUCKET).createSignedUrl(path, expiresInSeconds);
}
