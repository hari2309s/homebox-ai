-- Run once the "attachments" bucket exists (Supabase dashboard or `supabase storage` CLI).
-- Convention: objects are stored at "{ownerId}/{item_id}/{filename}" where ownerId is the
-- data's owner (not necessarily the uploading user), so ownership/shared-access can be
-- checked from the path alone via the same has_shared_access() helper every other table
-- uses (see policies/shared_access.sql) without a join back to our tables.

create policy "attachments_bucket_select_own" on storage.objects
  for select using (
    bucket_id = 'attachments'
    and public.has_shared_access((storage.foldername(name))[1]::uuid)
  );

create policy "attachments_bucket_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'attachments'
    and public.has_shared_access((storage.foldername(name))[1]::uuid)
  );

create policy "attachments_bucket_update_own" on storage.objects
  for update using (
    bucket_id = 'attachments'
    and public.has_shared_access((storage.foldername(name))[1]::uuid)
  ) with check (
    bucket_id = 'attachments'
    and public.has_shared_access((storage.foldername(name))[1]::uuid)
  );

create policy "attachments_bucket_delete_own" on storage.objects
  for delete using (
    bucket_id = 'attachments'
    and public.has_shared_access((storage.foldername(name))[1]::uuid)
  );
