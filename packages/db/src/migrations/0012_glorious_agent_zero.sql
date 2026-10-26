ALTER TABLE "items" ADD COLUMN "plan_x" double precision;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "plan_y" double precision;--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "plan_kind" text;--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "plan_x" double precision;--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "plan_y" double precision;--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "plan_w" double precision;--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "plan_h" double precision;