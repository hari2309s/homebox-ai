import { defineConfig } from "drizzle-kit";

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
