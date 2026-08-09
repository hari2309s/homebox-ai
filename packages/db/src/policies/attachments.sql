alter table "public"."attachments" enable row level security;

create policy "attachments_select_own" on "public"."attachments"
  for select using (auth.uid() = owner_id);

create policy "attachments_insert_own" on "public"."attachments"
  for insert with check (auth.uid() = owner_id);

create policy "attachments_delete_own" on "public"."attachments"
  for delete using (auth.uid() = owner_id);
