alter table "public"."item_activity" enable row level security;

create policy "item_activity_select_own" on "public"."item_activity"
  for select using (public.has_shared_access(owner_id));

create policy "item_activity_insert_own" on "public"."item_activity"
  for insert with check (public.has_shared_access(owner_id));
