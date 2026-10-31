CREATE INDEX IF NOT EXISTS "attachments_item_primary_idx" ON "attachments" USING btree ("item_id","is_primary");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attachments_owner_id_idx" ON "attachments" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_messages_owner_id_idx" ON "chat_messages" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "item_activity_owner_id_idx" ON "item_activity" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "items_owner_archived_idx" ON "items" USING btree ("owner_id","archived");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "items_owner_location_idx" ON "items" USING btree ("owner_id","location_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "labels_owner_id_idx" ON "labels" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "locations_owner_id_idx" ON "locations" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "maintenance_entries_owner_id_idx" ON "maintenance_entries" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminders_owner_id_idx" ON "reminders" USING btree ("owner_id");