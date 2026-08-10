import path from "node:path";
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs with this package's directory as cwd, but the shared
// .env.local (also loaded by apps/web/next.config.ts) lives at the monorepo
// root — Next auto-loads .env.local from an app's own directory, but nothing
// does that for plain Node CLIs like drizzle-kit.
config({ path: path.join(process.cwd(), "..", "..", ".env.local") });

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./src/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // schema.ts declares `auth.users` only so our tables can type-safely
  // reference its `id` column via FKs — Supabase owns that table already.
  // Without this filter, drizzle-kit tries to diff/manage it too and could
  // eventually generate statements that touch Supabase's real auth schema.
  schemaFilter: ["public"],
});
