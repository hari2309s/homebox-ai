alter table "public"."items" enable row level security;

create policy "items_select_own" on "public"."items"
  for select using (auth.uid() = owner_id);

create policy "items_insert_own" on "public"."items"
  for insert with check (auth.uid() = owner_id);

create policy "items_update_own" on "public"."items"
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "items_delete_own" on "public"."items"
  for delete using (auth.uid() = owner_id);
