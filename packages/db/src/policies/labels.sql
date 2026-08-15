alter table "public"."labels" enable row level security;

create policy "labels_select_own" on "public"."labels"
  for select using (public.has_shared_access(owner_id));

create policy "labels_insert_own" on "public"."labels"
  for insert with check (public.has_shared_access(owner_id));

create policy "labels_update_own" on "public"."labels"
  for update using (public.has_shared_access(owner_id)) with check (public.has_shared_access(owner_id));

create policy "labels_delete_own" on "public"."labels"
  for delete using (public.has_shared_access(owner_id));
