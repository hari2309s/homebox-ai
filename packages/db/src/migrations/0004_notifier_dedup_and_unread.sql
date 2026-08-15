ALTER TABLE "chat_messages" ADD COLUMN "is_proactive" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "read_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "nudge_key" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "chat_messages_nudge_key_unique" ON "chat_messages" USING btree ("owner_id","nudge_key") WHERE "chat_messages"."nudge_key" is not null;