alter table "public"."chat_messages" enable row level security;

create policy "chat_messages_select_own" on "public"."chat_messages"
  for select using (auth.uid() = owner_id);

create policy "chat_messages_insert_own" on "public"."chat_messages"
  for insert with check (auth.uid() = owner_id);

create policy "chat_messages_delete_own" on "public"."chat_messages"
  for delete using (auth.uid() = owner_id);
