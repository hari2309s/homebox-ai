RLS policies for tables Drizzle Kit creates. Drizzle migrations own table shape; these SQL files own access control and are applied separately since Drizzle Kit doesn't manage Supabase-specific policies.

Apply after running migrations, in this order (foreign keys mean `items`/`labels` must exist before `item_labels`):

```
psql "$DATABASE_URL" -f locations.sql
psql "$DATABASE_URL" -f labels.sql
psql "$DATABASE_URL" -f items.sql
psql "$DATABASE_URL" -f item_labels.sql
psql "$DATABASE_URL" -f attachments.sql
psql "$DATABASE_URL" -f maintenance_entries.sql
psql "$DATABASE_URL" -f chat_messages.sql
psql "$DATABASE_URL" -f reminders.sql
```

`storage_attachments.sql` is separate: it applies to `storage.objects`, not a table from `schema.ts`, and requires the `attachments` Storage bucket to already exist (create it first via the Supabase dashboard or CLI).
