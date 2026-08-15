alter table "public"."locations" enable row level security;

create policy "locations_select_own" on "public"."locations"
  for select using (public.has_shared_access(owner_id));

create policy "locations_insert_own" on "public"."locations"
  for insert with check (public.has_shared_access(owner_id));

create policy "locations_update_own" on "public"."locations"
  for update using (public.has_shared_access(owner_id)) with check (public.has_shared_access(owner_id));

create policy "locations_delete_own" on "public"."locations"
  for delete using (public.has_shared_access(owner_id));
