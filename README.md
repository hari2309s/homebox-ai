<div align="center">

<img src="apps/web/public/icons/icon-512.png" width="100" height="100" alt="Homebox AI icon">

# Homebox AI

### Know what you own, and where it is.

An AI-native home inventory PWA — search your stuff in plain English, snap a photo to log an item, import a receipt as a batch of items, and let a warranty assistant nudge you before things expire.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/hari2309s/homebox-ai)

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-animations-0055FF?logo=framer&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-installable-5A0FC8?logo=pwa&logoColor=white)

![LangGraph](https://img.shields.io/badge/LangGraph.js-agent_orchestration-1C3C3C?logo=langchain&logoColor=white)
![LLM Router](https://img.shields.io/badge/LLM_Router-4_providers-F55036?logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini-vision_%2B_reasoning-4285F4?logo=google&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-tool_calling-F55036?logoColor=white)

![Supabase](https://img.shields.io/badge/Supabase-Postgres_%2B_Auth_%2B_Storage-3ECF8E?logo=supabase&logoColor=white)
![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-C5F74F?logo=drizzle&logoColor=black)
![Row Level Security](https://img.shields.io/badge/RLS-Postgres_policies-4169E1?logo=postgresql&logoColor=white)
![Langfuse](https://img.shields.io/badge/Langfuse-observability-0A0A0A?logo=langfuse&logoColor=white)

![pnpm](https://img.shields.io/badge/pnpm-workspaces-F69220?logo=pnpm&logoColor=white)
![Turborepo](https://img.shields.io/badge/Turborepo-monorepo-EF4444?logo=turborepo&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-unit_tests-6E9F18?logo=vitest&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-e2e_tests-2EAD33?logo=playwright&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-deployment-000000?logo=vercel&logoColor=white)

</div>

---

## Features

- 🔍 **Natural-language inventory search** — ask "where's my passport?" or "what's in the garage?" in plain English; a LangGraph tool-calling agent looks it up for real, grounded in your actual data
- 📸 **Photo → item** — snap or upload a photo, a vision model drafts a name, description, label, and location guess for you to confirm
- 🧾 **Receipt import** — upload a receipt/invoice photo, extract every line item as a batch of draft items in one pass
- 🔔 **Proactive AI nudges** — a daily cron checks for warranties expiring soon and reminders coming up, and messages you in chat unprompted, with an unread badge on the Chat tab; idempotent by design, so re-running either check never double-sends
- 📅 **Household calendar & reminders** — turn a maintenance suggestion into a scheduled reminder (instead of a silent log entry), assign it to yourself or any family member sharing your household, and see it on a hand-rolled month calendar color-coded by assignee; a daily cron nudges the assignee in chat a few days before it's due
- 🛠️ **Maintenance & warranty tracking** — log service history per item (create/edit/delete), see warranty status at a glance
- 📦 **Homebox-parity item fields** — serial number, model number, manufacturer, purchase/sale price & date, insured, lifetime warranty, sequential asset IDs, item nesting (an item can live "inside" another item, not just a location)
- 🏷️ **Labels with color** and nested **locations** (locations can contain locations)
- 🖨️ **Printable item labels** — QR code linking straight back to the item, for sticking on a box or shelf
- 👨‍👩‍👧 **Household sharing** — invite one other person by link; they get full read/write access to your whole inventory under one shared owner scope, enforced by Postgres Row Level Security, not just app-layer checks
- 📤 **Three export formats** — plain JSON backup, a CSV spreadsheet (round-trips back in), and a full ZIP backup that bundles the real attachment files alongside the data — all imports merge additively and never delete or overwrite existing data
- 📱 **Installable PWA** — app-shell caching via Serwist for a fast, installable experience (full offline CRUD sync is an explicit non-goal for v1)
- 🌓 **Warm, custom design system** — hand-tuned color palette, Framer Motion transitions throughout, no generic component-library look

---

## How it works

```
You ask something in chat
        │
        ▼
LangGraph tool-calling agent (Groq → Cerebras → OpenRouter, first healthy wins)
        │
        ▼
Tools query YOUR data only — every query is scoped to your effective owner id
(search_items · get_item · list_locations · list_labels)
        │
        ▼
Conversational reply, grounded in what's actually in your inventory
```

Photo capture and receipt import follow the same shape but with a vision-capable chain (Gemini → OpenRouter) and structured-output extraction instead of tool calls. The maintenance assistant reasons over an item's purchase date and service history (Cerebras → Groq → OpenRouter) to suggest upcoming tasks and flag warranties expiring within 60 days.

Every provider chain is a plain ordered list in `packages/ai/src/router.ts` — one provider failing (bad key, rate limit, quota) transparently falls through to the next, per task type.

---

## Tech stack

| Layer                         | Technology                                                                                                                                                                       |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework                     | Next.js 15 (App Router) + TypeScript, React 19                                                                                                                                   |
| Styling                       | Tailwind CSS v4, hand-authored design tokens (`apps/web/app/globals.css`)                                                                                                        |
| Animation                     | Framer Motion                                                                                                                                                                    |
| PWA                           | Serwist service worker + web manifest                                                                                                                                            |
| AI orchestration              | LangGraph.js — `createReactAgent` for chat/search, single-shot structured-output calls for vision/reasoning                                                                      |
| LLM router                    | Custom task-based router (`packages/ai/src/router.ts`), one ordered fallback chain per task type                                                                                 |
| LLM — tool calling (chat)     | Groq `llama-3.3-70b-versatile` → Cerebras → OpenRouter                                                                                                                           |
| LLM — vision (photo/receipt)  | Gemini → OpenRouter free vision model                                                                                                                                            |
| LLM — reasoning (maintenance) | Cerebras → Groq → OpenRouter                                                                                                                                                     |
| Database                      | Supabase Postgres, schema/queries via Drizzle ORM                                                                                                                                |
| Access control                | Postgres Row Level Security on every table — the real security boundary, not just app-layer checks; a single `has_shared_access()` function backs the household-sharing policies |
| Auth                          | Supabase Auth (email/password)                                                                                                                                                   |
| File storage                  | Supabase Storage (`attachments` bucket)                                                                                                                                          |
| Observability                 | Langfuse via OpenTelemetry — every AI graph invocation traced with per-user/session/feature attribution                                                                          |
| Scheduled jobs                | Vercel Cron (`vercel.json`) → `Bearer $CRON_SECRET`-gated route, compared with `timingSafeEqual`                                                                                 |
| Monorepo                      | pnpm workspaces + Turborepo                                                                                                                                                      |
| Deployment                    | Vercel (`apps/web`) + Supabase (Postgres/Auth/Storage)                                                                                                                           |

---

## Project structure

```
homebox-ai/
├── apps/
│   └── web/                             # Next.js app (UI + API routes)
│       └── app/
│           ├── (auth)/login/            # Supabase Auth email/password, preserves ?redirectTo
│           ├── (app)/
│           │   ├── items/[id]/          # item detail: fields, attachments, maintenance, label/QR print
│           │   ├── locations/           # nested locations CRUD
│           │   ├── labels/              # colored labels CRUD
│           │   ├── chat/                # NL search UI, session history, unread nudges
│           │   ├── capture/             # photo → item draft review
│           │   ├── receipts/            # receipt → batch item review
│           │   ├── maintenance/         # AI maintenance suggestions → assignable calendar reminders
│           │   ├── calendar/            # household calendar: month grid, reminders, assignee color-coding
│           │   ├── join/[token]/        # accept a household-sharing invite
│           │   └── settings/            # profile, household, exports/imports, account deletion
│           └── api/
│               ├── chat/                # chat-search graph
│               ├── export/{csv,zip}/    # data export routes
│               └── notifiers/           # daily crons: proactive warranty + reminder nudges
├── packages/
│   ├── db/                              # Drizzle schema, migrations, RLS policies, query functions
│   │   ├── src/schema.ts                # items, locations, labels, attachments, maintenance_entries,
│   │   │                                #   reminders, chat_messages, shared_access, shared_access_invites
│   │   ├── src/access.ts                # resolveEffectiveOwnerId() — the sharing indirection layer
│   │   └── src/policies/                # one RLS policy file per table
│   ├── supabase/                        # server/browser Supabase clients, session middleware, storage helpers
│   ├── ai/                              # LangGraph orchestration
│   │   ├── src/providers/               # gemini · groq · cerebras · openrouter model factories
│   │   ├── src/router.ts                # task → ordered provider chain, with fallback
│   │   ├── src/graphs/                  # chat-search · photo-to-item · receipt-import · maintenance-assistant
│   │   └── src/tracing.ts               # Langfuse callback handler factory
│   ├── ui/                              # shared components, Framer Motion primitives
│   └── config/                          # shared tsconfig
└── supabase/                            # Supabase CLI project config (local dev emulation)
```

---

## Getting started

### Prerequisites

- Node.js >= 20, pnpm (`corepack enable`)
- Docker (for `supabase start`'s local emulation stack)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- At least one AI provider key per task type you want working locally — Gemini for vision, one of Groq/Cerebras/OpenRouter for chat (the router degrades gracefully if some are missing, per its fallback chains)
- A free [Langfuse](https://cloud.langfuse.com) project (optional locally, but you're flying blind on what the AI graphs are doing without it)

### Installation

```bash
git clone https://github.com/hari2309s/homebox-ai.git
cd homebox-ai
pnpm install
```

### Environment setup

```bash
cp .env.example .env.local
```

Fill in your keys:

```bash
# Supabase — from Settings > API, or `supabase status` for local dev
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
DATABASE_URL=                        # direct Postgres connection, used by Drizzle Kit + packages/db

# AI providers (all free-tier) — only providers with a key set will work
GOOGLE_API_KEY=                      # Gemini — vision
GOOGLE_MODEL=gemini-flash-latest     # optional override
GROQ_API_KEY=                        # Groq — chat tool-calling
CEREBRAS_API_KEY=                    # Cerebras — reasoning + chat fallback
CEREBRAS_MODEL=gpt-oss-120b          # optional override
OPENROUTER_API_KEY=                  # OpenRouter — catch-all fallback for every task
OPENROUTER_VISION_MODEL=google/gemma-4-31b-it:free   # fallback for the vision task specifically
OPENROUTER_MODEL=                    # fallback for text tasks (chat, reasoning); falls back to the vision model if unset

# Langfuse (optional locally, recommended)
LANGFUSE_SECRET_KEY=
LANGFUSE_PUBLIC_KEY=
LANGFUSE_BASE_URL=https://cloud.langfuse.com

# Vercel sends this as `Authorization: Bearer $CRON_SECRET` for the warranty-check cron
CRON_SECRET=                         # openssl rand -hex 32
```

### Database setup

```bash
# Local Supabase stack (Postgres, Auth, Storage, Studio) via Docker
supabase start
# Copy the printed API URL / anon key / service_role key / DB URL into .env.local

# Apply the Drizzle schema, then the RLS policies (Drizzle Kit doesn't manage
# Supabase-specific policies — see packages/db/src/policies/README.md)
pnpm db:generate
pnpm db:migrate
for f in packages/db/src/policies/*.sql; do psql "$DATABASE_URL" -f "$f"; done
```

In Supabase Studio (URL printed by `supabase start`, or your cloud project's dashboard), create an `attachments` Storage bucket **before** applying `storage_attachments.sql` — that policy references the bucket by name and fails if it doesn't exist yet.

### Run

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Testing

### Unit tests (Vitest)

Pure, dependency-free logic — no DB/network calls:

```bash
pnpm test
```

| Package       | Covered                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/db` | `wouldFormCycle` — the parent/location-chain cycle check shared by `updateLocation`/`updateItem`                                                                                                                                                                                                                                                                                             |
| `packages/ai` | `router.ts`'s task → provider chain resolution (ordering, missing-key skipping, OpenRouter's per-task model config)                                                                                                                                                                                                                                                                          |
| `apps/web`    | `lib/csv` (round-trip parse/serialize), `lib/safe-redirect` (open-redirect prevention on the post-login redirect), `lib/cron-auth` (the notifier crons' bearer-token check), `lib/reminders` (household-membership validation for a reminder's assignee), `lib/reminder-notification-groups` (the reminder cron's per-household message grouping), `lib/household` (assignee display labels) |

### E2E tests (Playwright)

Runs against the real Supabase project in `.env.local` — no mocked backend. Authenticated specs use a dedicated, persistent test account (see [`apps/web/e2e/README.md`](apps/web/e2e/README.md) for how it's set up and how to recreate it).

```bash
pnpm test:e2e          # from the repo root, or `apps/web` directly
pnpm --filter web test:e2e:ui   # interactive Playwright UI
```

| Spec                        | Auth        | Covers                                                                                                                                                                     |
| --------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth.unauth.spec.ts`       | none        | Login page rendering, mode switching, and the middleware's redirect-guard (including `/join/[token]` invite links)                                                         |
| `items.spec.ts`             | e2e account | Create → view → edit → delete an item                                                                                                                                      |
| `locations.spec.ts`         | e2e account | Regression coverage for the location-nesting cycle check — a circular re-parent is rejected inline instead of crashing the page, and a legitimate re-parent still succeeds |
| `settings-password.spec.ts` | e2e account | The password form's live strength checklist and client-side rejection of a weak new password                                                                               |
| `calendar.spec.ts`          | e2e account | Add a reminder, confirm the docked form collapses back on success, then complete/reopen/delete it; leaving a reminder unassigned                                           |
| `household-sharing.spec.ts` | e2e account | Owner-side invite lifecycle — create, see it pending, revoke it                                                                                                            |

Everything not covered by either suite — most RLS-scoped queries, AI graphs, exports/imports — is verified manually against the real Supabase project rather than automated; see the git history for the verification passes each feature went through.

---

## Sharing model

Homebox AI shares by _invite_, not by a separate "group" concept: every table keeps its original `owner_id` as the real ownership/RLS boundary. When someone accepts an invite, they're recorded in `shared_access` as a member of the _inviter's_ owner scope — from then on, every query they make resolves through `resolveEffectiveOwnerId()` to act on the shared owner's data, not their own. A single Postgres `has_shared_access()` function (SECURITY DEFINER) backs the RLS policy on every table, so a missing or wrong policy on a new table is caught the same way as everywhere else — not a special case for sharing.

Chat history is the one thing that stays personal per member even inside a shared household — everyone searches the same inventory but keeps their own conversation.

---

## Notifiers (proactive AI)

Both notifiers below run daily via Vercel Cron (`vercel.json`), gated by a `Bearer $CRON_SECRET` header compared with `timingSafeEqual` (not `===`, to avoid leaking the secret's length/prefix via response-time differences), and each writes an AI-composed, warm/conversational proactive chat message rather than a templated one.

- **`apps/web/app/api/notifiers/warranty-check`** — finds items with a warranty expiring soon that haven't already been flagged, and writes a proactive chat message per owner — deterministically keyed (`warranty:{ownerId}:{date}`) via a partial unique index on `chat_messages`, so re-running the check (retry, overlapping invocation) is a safe no-op rather than a duplicate nudge.
- **`apps/web/app/api/notifiers/reminder-check`** — finds pending calendar reminders due within the next few days that haven't already been flagged. A reminder assigned to someone specific nudges just them; an unassigned one nudges the whole household with one shared AI-composed message, not one generated per recipient. Grouped and sent per household (`apps/web/lib/reminder-notification-groups.ts`), not per recipient, so a send failure partway through a household leaves that whole group's reminders un-notified for the next run to retry — nobody in the group is marked notified while another recipient's send is still failing. Keyed `reminder:{userId}:{date}` and marked via `reminders.notified_at`, so it's idempotent the same way the warranty check is.

---

## Tracing (Langfuse)

Every AI graph invocation is traced. The pattern (see `apps/web/app/api/chat/route.ts` for a full example):

```ts
import { createLangfuseHandler } from "@homebox-ai/ai";
import { after } from "next/server";
import { langfuseSpanProcessor } from "../../../instrumentation-node";

const langfuseHandler = createLangfuseHandler({ userId, sessionId, tags: ["chat"] });
const result = await graph.invoke(input, { callbacks: [langfuseHandler], runName: "chat-search" });

// Serverless functions can be frozen right after the response — schedule the
// flush so buffered spans actually get sent before that happens.
after(async () => {
  await langfuseSpanProcessor.forceFlush();
});
```

`runName` matters — without it, traces show up unnamed in the Langfuse UI (the trace-level `name`/`input`/`output` fields are deprecated in Langfuse v4+; what you actually see and search on is the **root observation's** name/input/output, which the `CallbackHandler` sets automatically from the graph's input/output as long as `runName` is set).

---

## Deploying

- **Supabase**: create a project at supabase.com, run the same migration + policy steps above against its connection string, create the `attachments` bucket.
- **Vercel**: connect this repo, set every env var from `.env.example` in the project's dashboard (Settings → Environment Variables) using the cloud project's values — nothing in `.env.local` ships with the code, so a key that's only set locally will silently make that feature unavailable in production. Deploy `apps/web`.
