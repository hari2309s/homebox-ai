alter table "public"."labels" enable row level security;

create policy "labels_select_own" on "public"."labels"
  for select using (auth.uid() = owner_id);

create policy "labels_insert_own" on "public"."labels"
  for insert with check (auth.uid() = owner_id);

create policy "labels_update_own" on "public"."labels"
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "labels_delete_own" on "public"."labels"
  for delete using (auth.uid() = owner_id);
