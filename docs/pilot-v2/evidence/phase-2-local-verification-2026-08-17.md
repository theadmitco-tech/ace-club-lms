# Pilot V2 Phase 2 Local Verification — 17 August 2026

Status: Passed locally; Staging migration and acceptance pending
Owner: Engineering
Last updated: 17 August 2026

## Scope

The Product Owner authorized Phase 2 local implementation from the focused handoff. Work remained local and uncommitted. No migration was applied, no remote branch was pushed, and no Preview, merge, deployment or Production action occurred.

## Implemented

- no-write batch proposal from one selected immutable template revision;
- canonical `Asia/Kolkata` event calculations and complete proposal table;
- additive batch provenance, idempotency, schedule revision and event compatibility fields;
- one Admin-only atomic confirmation function with stale-template and retry protection;
- server-authorized extra-event, eligible edit, reorder, cancellation-history and shift-subsequent functions;
- schedule-revision conflict checks and current/completed/cancelled-event protections;
- unreleased-material timestamp updates that leave already-released material unchanged;
- legacy batch preservation and continued population of `session_number` and `class_type`; and
- focused pure proposal/shift tests and migration guard assertions.

## Local checks

| Check | Result |
|---|---|
| Phase 1 template suite | 5 passed |
| Phase 2 batch-schedule suite | 4 passed |
| Touched-file ESLint | Passed |
| `npx tsc --noEmit` | Passed |
| Guarded `npm run build` | Passed; 35 routes generated |
| Migration application | Not run; not authorized |

The Node test runner emits its existing module-type performance warning because the package does not declare `type: module`; it does not affect the passing assertions.

## Remaining gate

The additive migration `20260817143000_add_batch_schedule_builder.sql` requires exact review and a separate Product Owner instruction before Staging application. Database behavior, authenticated journeys, accessibility and the full Phase 2 exit matrix remain pending until that authorized Staging step.

## Isolated Staging preflight

The exact migration was subsequently reviewed and hardened locally before application:

- cancelled events retain publication state so cancellation cannot silently withdraw already-released material;
- negative shifts and future-event edits cannot move eligible events into the past;
- batch template/revision provenance has a composite ownership foreign key;
- reorder collision avoidance derives its temporary offset from the selected batch rather than using a fixed value; and
- Admin datetime inputs and displays use canonical IST independently of the browser timezone.

Pinned Supabase CLI `2.114.0` verified the linked project as Staging `eyphkkginlgoaxflauog`. A new isolated temporary migration directory contained the 17 ledgered predecessor migrations plus only the reviewed Phase 2 migration; it omitted the three excluded repository migrations. The read-only ledger query confirmed `20260817090845` is present and `20260817143000` is absent. The isolated `db push --linked --dry-run` succeeded and listed exactly:

```text
20260817143000_add_batch_schedule_builder.sql
```

Reviewed SHA-256: `d212b87a0026a4fe08354f9d594a2712fdb4300e2e859622ecb76612f0d2d96b`.

The post-review template tests (5), Phase 2 tests (4), touched-file ESLint, TypeScript and `git diff --check` passed. The dry run made no database change. Exact Staging application remains unauthorized until the Product Owner names migration `20260817143000_add_batch_schedule_builder.sql` in a new instruction.
