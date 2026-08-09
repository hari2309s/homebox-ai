# Homebox AI

An AI-native home inventory PWA — natural-language search, photo-to-item entry, receipt import, and a maintenance/warranty assistant, built on Next.js + Supabase (Postgres/Auth/Storage) + LangGraph.

See the full architecture and milestone plan in this session's plan file; this README covers day-to-day setup.

## Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **App**: Next.js (App Router), deployed to Vercel
- **Data**: Supabase Postgres, schema/queries via Drizzle ORM (`packages/db`), access controlled by Postgres Row Level Security — not just app-layer checks
- **Auth**: Supabase Auth (email/password)
- **Files**: Supabase Storage (`attachments` bucket)
- **AI**: LangGraph.js orchestration (`packages/ai`) routing across four free-tier providers (Gemini, Groq, Cerebras, OpenRouter) with task-based fallback chains

## Prerequisites

- Node >= 20, pnpm (`corepack enable`)
- Docker (for `supabase start`'s local emulation stack)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- API keys for whichever of Gemini / Groq / Cerebras / OpenRouter you want working locally (the AI features degrade gracefully if some are missing, per the router's fallback chains — but at least one per task type is needed for that feature to work at all)

## First-time setup

```bash
pnpm install

# Local Supabase stack (Postgres, Auth, Storage, Studio) via Docker
supabase start
# Copy the printed API URL / anon key / service_role key / DB URL into .env.local (copy .env.example first)

cp .env.example .env.local

# Apply the Drizzle schema, then the RLS policies (Drizzle Kit doesn't manage
# Supabase-specific policies — see packages/db/src/policies/README.md)
pnpm db:generate
pnpm db:migrate
for f in packages/db/src/policies/*.sql; do psql "$DATABASE_URL" -f "$f"; done
```

Then in the Supabase Studio (URL printed by `supabase start`, or your cloud project's dashboard), create an `attachments` Storage bucket before applying `storage_attachments.sql` — that policy references the bucket by name and will fail if it doesn't exist yet.

## Running the app

```bash
pnpm dev
```

## Deploying

- **Supabase**: create a project at supabase.com, run the same migration + policy steps above against its connection string, create the `attachments` bucket.
- **Vercel**: connect this repo, set the env vars from `.env.example` (using the cloud project's values, not the local ones), deploy `apps/web`.

## Project layout

```
apps/web       Next.js app (UI + API routes)
packages/db    Drizzle schema, migrations, RLS policies, query functions
packages/supabase  Server/browser Supabase clients, session middleware, storage helpers
packages/ai    LangGraph orchestration: provider factories, task router, one graph per AI feature
packages/ui    Shared components (Framer Motion primitives)
packages/config  Shared tsconfig
supabase/      Supabase CLI project config (local dev emulation)
```
