alter table "public"."items" enable row level security;

create policy "items_select_own" on "public"."items"
  for select using (public.has_shared_access(owner_id));

create policy "items_insert_own" on "public"."items"
  for insert with check (public.has_shared_access(owner_id));

create policy "items_update_own" on "public"."items"
  for update using (public.has_shared_access(owner_id)) with check (public.has_shared_access(owner_id));

create policy "items_delete_own" on "public"."items"
  for delete using (public.has_shared_access(owner_id));
