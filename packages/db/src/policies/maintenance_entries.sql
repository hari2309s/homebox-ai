alter table "public"."maintenance_entries" enable row level security;

create policy "maintenance_entries_select_own" on "public"."maintenance_entries"
  for select using (public.has_shared_access(owner_id));

create policy "maintenance_entries_insert_own" on "public"."maintenance_entries"
  for insert with check (public.has_shared_access(owner_id));

create policy "maintenance_entries_update_own" on "public"."maintenance_entries"
  for update using (public.has_shared_access(owner_id)) with check (public.has_shared_access(owner_id));

create policy "maintenance_entries_delete_own" on "public"."maintenance_entries"
  for delete using (public.has_shared_access(owner_id));
