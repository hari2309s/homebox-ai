CREATE TABLE IF NOT EXISTS "home_settings" (
	"owner_id" uuid PRIMARY KEY NOT NULL,
	"place_name" text,
	"latitude" double precision,
	"longitude" double precision,
	"timezone" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "home_settings" ADD CONSTRAINT "home_settings_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
