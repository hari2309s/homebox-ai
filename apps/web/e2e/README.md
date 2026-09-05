# E2E tests (Playwright)

```bash
pnpm test:e2e        # headless
pnpm test:e2e:ui     # interactive Playwright UI
```

Run from `apps/web`, or `pnpm test:e2e` from the repo root. Starts its own `next dev` on port 3100 (separate from your normal dev server on 3000) against the **real** Supabase project configured in `.env.local` — there's no local/mocked backend.

## Specs

| File                        | Auth        | Covers                                                                                                                                                                                                                     |
| --------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth.unauth.spec.ts`       | none        | Login page rendering, mode switching, client-side validation, and the middleware's redirect-guard (unauthenticated visits to protected routes redirect to `/login?redirectTo=...`, including `/join/[token]` invite links) |
| `items.spec.ts`             | e2e account | Create → view → edit → delete an item                                                                                                                                                                                      |
| `locations.spec.ts`         | e2e account | Regression coverage for the location-nesting cycle check (`packages/db/src/cycle.ts`): a circular re-parent is rejected with an inline error instead of crashing the page, and a legitimate re-parent still succeeds       |
| `settings-password.spec.ts` | e2e account | The password form's live strength checklist and client-side rejection of a weak new password (never submits a real password change for the shared account)                                                                 |
| `calendar.spec.ts`          | e2e account | Add a reminder and confirm the docked form collapses back (regression coverage for a bug where it stayed open after a successful submit), then complete/reopen/delete it; also that a reminder can be left unassigned      |
| `household-sharing.spec.ts` | e2e account | Owner-side invite lifecycle: creating an invite shows it as pending, revoking it removes it. Accepting an invite as a second member needs a second real account and isn't covered here                                     |

Every authenticated spec creates data with a `uniqueName()`-style timestamped name and deletes what it created — the shared e2e account should be empty of items/locations/labels between runs. If a run fails partway through (before its own cleanup step), it can leave test data behind on that account; that's expected and safe to delete manually since nothing on it is real.

## The e2e test account

Authenticated specs run against a dedicated, persistent Supabase Auth user — not anyone's real account — logged in once by `auth.setup.ts` (the `setup` project in `playwright.config.ts`) and reused via a saved storage state (`e2e/.auth/user.json`, gitignored) for every spec in the `authenticated` project.

Credentials live in `.env.local` only (never committed):

```bash
E2E_TEST_EMAIL=e2e-test@homebox-ai.test
E2E_TEST_PASSWORD=<a generated password>
```

If this account is ever deleted or the password is lost, recreate it via the Supabase admin API (needs `SUPABASE_SECRET_KEY`):

```ts
import { createClient } from "@supabase/supabase-js";

const admin = createClient(supabaseUrl, supabaseSecretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

await admin.auth.admin.createUser({
  email: "e2e-test@homebox-ai.test",
  password: "<generate a strong one>",
  email_confirm: true, // skips the email-confirmation step
  user_metadata: { full_name: "E2E Test" },
});
```

Then update `E2E_TEST_EMAIL`/`E2E_TEST_PASSWORD` in `.env.local` (and wherever CI secrets are configured, if this suite runs there) to match.
