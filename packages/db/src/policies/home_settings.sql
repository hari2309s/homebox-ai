alter table "public"."home_settings" enable row level security;

create policy "home_settings_select_own" on "public"."home_settings"
  for select using (public.has_shared_access(owner_id));

create policy "home_settings_insert_own" on "public"."home_settings"
  for insert with check (public.has_shared_access(owner_id));

create policy "home_settings_update_own" on "public"."home_settings"
  for update using (public.has_shared_access(owner_id)) with check (public.has_shared_access(owner_id));

create policy "home_settings_delete_own" on "public"."home_settings"
  for delete using (public.has_shared_access(owner_id));
