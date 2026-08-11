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

/**
 * Storage's `.list()` only returns one folder level at a time, so walking
 * the `{userId}/{itemId}/{filename}` convention above takes two passes.
 * Used for account deletion — the DB rows cascade on their own, but Storage
 * objects don't, so they need explicit cleanup.
 */
export async function deleteAllUserAttachments(supabase: SupabaseClient, userId: string) {
  const { data: itemFolders } = await supabase.storage.from(ATTACHMENTS_BUCKET).list(userId);
  if (!itemFolders?.length) return;

  for (const folder of itemFolders) {
    const { data: files } = await supabase.storage.from(ATTACHMENTS_BUCKET).list(`${userId}/${folder.name}`);
    if (!files?.length) continue;
    await supabase.storage.from(ATTACHMENTS_BUCKET).remove(files.map((file) => `${userId}/${folder.name}/${file.name}`));
  }
}
