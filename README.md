<p align="center">
  <img src="apps/web/public/icons/icon-512.png" width="120" height="120" alt="Homebox AI icon">
</p>

<h1 align="center">Homebox AI</h1>

<p align="center">
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-000000?style=flat&logo=next.js&logoColor=white" alt="Next.js"></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white" alt="TypeScript"></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black" alt="React"></a>
  <a href="https://supabase.com"><img src="https://img.shields.io/badge/Supabase-3FCF8E?style=flat&logo=supabase&logoColor=white" alt="Supabase"></a>
  <a href="https://www.postgresql.org"><img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white" alt="PostgreSQL"></a>
  <a href="https://orm.drizzle.team"><img src="https://img.shields.io/badge/Drizzle_ORM-C5F74F?style=flat&logo=drizzle&logoColor=black" alt="Drizzle ORM"></a>
  <a href="https://www.langchain.com/langgraph"><img src="https://img.shields.io/badge/LangGraph.js-1C3C3C?style=flat&logo=langchain&logoColor=white" alt="LangGraph.js"></a>
  <a href="https://www.framer.com/motion/"><img src="https://img.shields.io/badge/Framer_Motion-0055FF?style=flat&logo=framer&logoColor=white" alt="Framer Motion"></a>
  <a href="https://turbo.build/repo"><img src="https://img.shields.io/badge/Turborepo-EF4444?style=flat&logo=turborepo&logoColor=white" alt="Turborepo"></a>
  <a href="https://pnpm.io"><img src="https://img.shields.io/badge/pnpm-F69220?style=flat&logo=pnpm&logoColor=white" alt="pnpm"></a>
  <a href="https://web.dev/explore/progressive-web-apps"><img src="https://img.shields.io/badge/PWA-5A0FC8?style=flat&logo=pwa&logoColor=white" alt="PWA"></a>
  <a href="https://vercel.com"><img src="https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white" alt="Vercel"></a>
</p>

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
