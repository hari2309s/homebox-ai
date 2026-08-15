-- Owner-only visibility: an invite's token is itself the "capability" for
-- accepting it, so the accept flow reads/updates invites through the
-- privileged admin client (packages/supabase/src/admin.ts) rather than a
-- broad SELECT policy that would let any authenticated user enumerate
-- other people's invites.
alter table "public"."shared_access_invites" enable row level security;

create policy "shared_access_invites_select_own" on "public"."shared_access_invites"
  for select using (auth.uid() = owner_id);

create policy "shared_access_invites_insert_own" on "public"."shared_access_invites"
  for insert with check (auth.uid() = owner_id);

create policy "shared_access_invites_delete_own" on "public"."shared_access_invites"
  for delete using (auth.uid() = owner_id);
