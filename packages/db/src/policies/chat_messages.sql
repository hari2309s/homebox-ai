alter table "public"."chat_messages" enable row level security;

create policy "chat_messages_select_own" on "public"."chat_messages"
  for select using (auth.uid() = owner_id);

create policy "chat_messages_insert_own" on "public"."chat_messages"
  for insert with check (auth.uid() = owner_id);

-- Added once markSessionMessagesRead needed to set read_at on a proactive
-- (AI-initiated) message — chat_messages were otherwise insert/delete-only.
create policy "chat_messages_update_own" on "public"."chat_messages"
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "chat_messages_delete_own" on "public"."chat_messages"
  for delete using (auth.uid() = owner_id);
