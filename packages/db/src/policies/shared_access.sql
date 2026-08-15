-- Central helper every other table's policies call: true if the requesting
-- user either owns target_owner_id's data outright, or has been granted
-- shared access to it. SECURITY DEFINER so it can read "shared_access"
-- regardless of that table's own (more restrictive) RLS policies below.
create or replace function public.has_shared_access(target_owner_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select auth.uid() = target_owner_id
    or auth.uid() in (
      select member_user_id from public.shared_access where owner_id = target_owner_id
    );
$$;

alter table "public"."shared_access" enable row level security;

-- Both sides of a share can see the relationship: the owner (to know who
-- they've shared with) and the member (to know whose data they're in).
create policy "shared_access_select_own" on "public"."shared_access"
  for select using (auth.uid() = owner_id or auth.uid() = member_user_id);

-- Rows are only ever inserted by the accept-invite server action, as the
-- accepting user themselves — never on the owner's behalf.
create policy "shared_access_insert_self" on "public"."shared_access"
  for insert with check (auth.uid() = member_user_id);

-- Either the owner (revoking someone) or the member (leaving voluntarily)
-- can remove the row.
create policy "shared_access_delete_own" on "public"."shared_access"
  for delete using (auth.uid() = owner_id or auth.uid() = member_user_id);
