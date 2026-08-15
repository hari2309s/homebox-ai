alter table "public"."attachments" enable row level security;

create policy "attachments_select_own" on "public"."attachments"
  for select using (public.has_shared_access(owner_id));

create policy "attachments_insert_own" on "public"."attachments"
  for insert with check (public.has_shared_access(owner_id));

-- Attachments were originally insert-once/immutable (matching chat_messages'
-- pattern) — this update policy was added once setPrimaryAttachment made
-- editing (toggling the cover-image flag) a real operation.
create policy "attachments_update_own" on "public"."attachments"
  for update using (public.has_shared_access(owner_id)) with check (public.has_shared_access(owner_id));

create policy "attachments_delete_own" on "public"."attachments"
  for delete using (public.has_shared_access(owner_id));
