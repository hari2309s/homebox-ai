alter table "public"."maintenance_entries" enable row level security;

create policy "maintenance_entries_select_own" on "public"."maintenance_entries"
  for select using (auth.uid() = owner_id);

create policy "maintenance_entries_insert_own" on "public"."maintenance_entries"
  for insert with check (auth.uid() = owner_id);

create policy "maintenance_entries_update_own" on "public"."maintenance_entries"
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "maintenance_entries_delete_own" on "public"."maintenance_entries"
  for delete using (auth.uid() = owner_id);
