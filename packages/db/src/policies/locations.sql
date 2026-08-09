alter table "public"."locations" enable row level security;

create policy "locations_select_own" on "public"."locations"
  for select using (auth.uid() = owner_id);

create policy "locations_insert_own" on "public"."locations"
  for insert with check (auth.uid() = owner_id);

create policy "locations_update_own" on "public"."locations"
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "locations_delete_own" on "public"."locations"
  for delete using (auth.uid() = owner_id);
