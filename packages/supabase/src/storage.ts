import type { SupabaseClient } from "@supabase/supabase-js";

const ATTACHMENTS_BUCKET = "attachments";

/**
 * Path convention the "attachments" bucket's RLS policies rely on
 * (see packages/db/src/policies/storage_attachments.sql): the first path
 * segment must be the data's owner id — NOT necessarily the uploading
 * user's own id. A member with shared access to someone else's data
 * uploads under that owner's id too, so every other member (including the
 * owner) can see it via the same has_shared_access() check. Callers must
 * pass the caller's *effective* owner id (see packages/db/src/access.ts),
 * not the raw session user id.
 */
export function attachmentPath(ownerId: string, itemId: string, filename: string) {
  return `${ownerId}/${itemId}/${filename}`;
}

export async function uploadAttachment(
  supabase: SupabaseClient,
  ownerId: string,
  itemId: string,
  file: File | Blob,
  filename: string,
) {
  const path = attachmentPath(ownerId, itemId, filename);
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
 * Batch equivalent of getAttachmentSignedUrl — one round trip for any number
 * of paths. Returns a Map from path → signed URL (only includes paths that
 * resolved successfully, so callers can safely do `urlMap.get(path) ?? null`).
 */
export async function getAttachmentSignedUrls(
  supabase: SupabaseClient,
  paths: string[],
  expiresInSeconds = 3600,
): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();
  const { data, error } = await supabase.storage.from(ATTACHMENTS_BUCKET).createSignedUrls(paths, expiresInSeconds);
  if (error || !data) return new Map();
  const result = new Map<string, string>();
  for (const entry of data) {
    if (entry.signedUrl && entry.path) result.set(entry.path, entry.signedUrl);
  }
  return result;
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
 * the `{ownerId}/{itemId}/{filename}` convention above takes two passes.
 * Used for account deletion — the DB rows cascade on their own, but Storage
 * objects don't, so they need explicit cleanup. Errors are thrown rather than
 * swallowed so a partial failure aborts account deletion instead of silently
 * leaving orphaned objects behind with no DB row left to find them by.
 *
 * Deliberately takes the deleting account's own id, not its effective owner
 * id — deleting your account should only ever remove attachments *you* own,
 * never a household you merely have shared access to.
 */
export async function deleteAllUserAttachments(supabase: SupabaseClient, ownerId: string) {
  const itemFolders = await listAllEntries(supabase, ownerId);

  for (const folder of itemFolders) {
    const files = await listAllEntries(supabase, `${ownerId}/${folder.name}`);
    if (!files.length) continue;
    const { error } = await supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .remove(files.map((file) => `${ownerId}/${folder.name}/${file.name}`));
    if (error) throw error;
  }
}
