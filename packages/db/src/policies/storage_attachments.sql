-- Run once the "attachments" bucket exists (Supabase dashboard or `supabase storage` CLI).
-- Convention: objects are stored at "{auth.uid()}/{item_id}/{filename}" so ownership
-- can be checked from the path alone without a join back to our tables.

create policy "attachments_bucket_select_own" on storage.objects
  for select using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "attachments_bucket_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "attachments_bucket_delete_own" on storage.objects
  for delete using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
