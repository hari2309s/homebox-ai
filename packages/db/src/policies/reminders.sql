alter table "public"."reminders" enable row level security;

create policy "reminders_select_own" on "public"."reminders"
  for select using (public.has_shared_access(owner_id));

create policy "reminders_insert_own" on "public"."reminders"
  for insert with check (public.has_shared_access(owner_id));

create policy "reminders_update_own" on "public"."reminders"
  for update using (public.has_shared_access(owner_id)) with check (public.has_shared_access(owner_id));

create policy "reminders_delete_own" on "public"."reminders"
  for delete using (public.has_shared_access(owner_id));
