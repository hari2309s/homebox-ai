ALTER TABLE "items" ADD COLUMN "created_by" uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE "maintenance_entries" ADD COLUMN "created_by" uuid REFERENCES auth.users(id) ON DELETE SET NULL;
