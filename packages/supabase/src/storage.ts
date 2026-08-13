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
 * `.list()` defaults to (and caps at) 100 entries per call, so any prefix
 * that might hold more than that needs to be paged through with `offset`
 * rather than trusting a single call to return everything.
 */
async function listAllEntries(supabase: SupabaseClient, prefix: string) {
  const pageSize = 1000;
  const entries: { name: string }[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.storage.from(ATTACHMENTS_BUCKET).list(prefix, { limit: pageSize, offset });
    if (error) throw error;
    if (!data?.length) break;
    entries.push(...data);
    if (data.length < pageSize) break;
  }
  return entries;
}

/**
 * Storage's `.list()` only returns one folder level at a time, so walking
 * the `{userId}/{itemId}/{filename}` convention above takes two passes.
 * Used for account deletion — the DB rows cascade on their own, but Storage
 * objects don't, so they need explicit cleanup. Errors are thrown rather than
 * swallowed so a partial failure aborts account deletion instead of silently
 * leaving orphaned objects behind with no DB row left to find them by.
 */
export async function deleteAllUserAttachments(supabase: SupabaseClient, userId: string) {
  const itemFolders = await listAllEntries(supabase, userId);

  for (const folder of itemFolders) {
    const files = await listAllEntries(supabase, `${userId}/${folder.name}`);
    if (!files.length) continue;
    const { error } = await supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .remove(files.map((file) => `${userId}/${folder.name}/${file.name}`));
    if (error) throw error;
  }
}
