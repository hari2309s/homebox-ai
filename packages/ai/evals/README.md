# Eval layer

## `homebox-golden` — maintenance assistant quality

- **Source of truth**: `dataset-items.ts` (git-diffable, reviewable) — 12
  maintenance-assistant cases against synthetic household inventory fixtures.
  Each case feeds a fixture item (with maintenance history, location, and
  optional weather forecast) through the same model + schema + prompt pipeline
  that the production `runMaintenanceAssistantGraph` uses, just with
  pre-built data instead of DB-fetched data.
- **Fixtures**: `fixtures.ts` — 12 synthetic items (washing machine, lawn
  mower, HVAC, blender, drill, gas grill, fridge, pressure washer, smoke
  detector, vacuum, garage door opener, coffee machine). Dates are computed
  relative to "today" so warranty evaluator expectations never drift.
- **Sync to Langfuse**: `pnpm eval:sync-dataset` upserts `dataset-items.ts`
  into the Langfuse dataset `homebox-golden` (idempotent — items upsert on
  their `id`). Run this after editing dataset-items.ts.
- **Run locally**: `pnpm eval` — fetches the dataset from Langfuse and runs
  `task.ts` (dispatches each item to the structured-output model with
  fixture data) through the evaluators in `evaluators.ts`:
  - `warrantyDetection` — deterministic: does `warrantyExpiringSoon` match
    the expected boolean? Items with warranty expiring within 60 days should
    be `true`, all others `false`.
  - `dateValidity` — deterministic: are all `recommendedDate` values ≥ today?
    The prompt instructs the model to never suggest past dates.
  - `responseQualityJudge` — LLM-as-judge, all items: scores 1-5 for
    relevance, specificity, and contextual awareness (considers item age,
    maintenance history, location, weather when applicable).
- **CI gate**: `gate.ts` + `.github/workflows/langfuse-eval.yml`, via
  [`langfuse/experiment-action`](https://github.com/langfuse/experiment-action).
  Runs on every push to `main` and fails the job if any aggregate drops
  below its threshold.

### Re-baselining thresholds

The quality judge and structured-output model are both non-deterministic,
so don't chase the exact baseline number. After a prompt, model, or schema
change:

1. `pnpm eval` locally a couple of times to see the new steady-state range.
2. Update the comments + values in `gate.ts`'s `THRESHOLDS`, leaving the
   same kind of margin (roughly one item's worth) the current values have.
3. Note the new baseline run's Langfuse URL in the comment above `THRESHOLDS`
   for the next person to re-baseline.

Concurrency in both `run-golden.ts` and `gate.ts` is capped at 2 — free-tier
provider quotas are easy to blow through at higher concurrency.

### Future: vision and chat-search evals

The vision graphs (photo-to-item, room-scan, receipt-import) require fixture
images — these can be added as base64 data URLs in `fixtures.ts` or as
committed test image files. The chat-search graph requires DB access for its
tools; testing it would need either a test database or extracted pure-function
wrappers. Both are natural next extensions of this suite.
