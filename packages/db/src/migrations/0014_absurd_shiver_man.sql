CREATE TYPE "public"."reminder_source" AS ENUM('manual', 'suggestion');--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "source" "reminder_source" DEFAULT 'manual' NOT NULL;