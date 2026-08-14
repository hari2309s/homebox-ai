ALTER TYPE "public"."attachment_type" ADD VALUE 'warranty';--> statement-breakpoint
ALTER TABLE "attachments" ADD COLUMN "is_primary" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "asset_id" integer;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "serial_number" text;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "model_number" text;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "manufacturer" text;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "insured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "archived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "lifetime_warranty" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "purchase_from" text;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "sold_to" text;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "sold_notes" text;--> statement-breakpoint
ALTER TABLE "labels" ADD COLUMN "color" text;--> statement-breakpoint
-- Backfill asset IDs for items created before this column existed, numbered
-- per-owner in creation order (matches how itemQueries.createItem assigns
-- new ones going forward: max(asset_id) + 1 per owner).
UPDATE "items" SET "asset_id" = "backfill"."rn" FROM (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "owner_id" ORDER BY "created_at") AS "rn"
  FROM "items"
  WHERE "asset_id" IS NULL
) AS "backfill"
WHERE "items"."id" = "backfill"."id";