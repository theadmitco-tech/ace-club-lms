# Pilot V2 Phase 2 Correction — Local Verification — 17 August 2026

Status: Passed locally; exact Staging application not authorized
Owner: Engineering
Production impact: None

## Authorization and scope

The Product Owner authorized local, uncommitted implementation of one additive correction migration for the two blockers found by the authenticated Phase 2 Staging matrix. The instruction prohibited Staging or Production application, push, Preview, merge and deployment.

Engineering added only the new migration `20260817233540_fix_phase2_conflicts_and_shift_materials.sql`; neither applied Phase 2 migration was amended.

## Corrections

The migration:

1. replaces the deliberate stale-template and stale-schedule SQLSTATE `40001` in all five Phase 2 mutation functions with non-retryable `P0001`, preserving each actionable message;
2. resolves each exact function signature from the applied schema and refuses to proceed unless its definition contains exactly one `40001` occurrence; and
3. replaces `shift_batch_schedule` so shifted events are updated first and unreleased material timestamps are synchronized in a later statement that can read the new event timestamps. Already-released material remains excluded by `available_from > statement_timestamp()`.

The five guarded signatures are:

- `confirm_template_batch(text,uuid,uuid,date,text,uuid)`;
- `shift_batch_schedule(uuid,uuid,integer,integer)`;
- `cancel_batch_event(uuid,uuid,text,integer)`;
- `save_batch_event(uuid,uuid,integer,text,text,text,timestamptz,integer,text,text,time,text,boolean)`; and
- `reorder_batch_events(uuid,uuid[],integer)`.

The migration contains no table drop, truncation, ledger repair, excluded migration, backfill or Production action.

## Local verification

| Check | Result |
|---|---|
| Phase 1 template suite | 5 passed |
| Phase 2 batch/schedule suite | 6 passed |
| Probe/test targeted ESLint | Passed |
| `npx tsc --noEmit` | Passed |
| Guarded `npm run build` | Passed; 35 routes generated |
| `git diff --check` | Passed |

The added regression test requires all five conflict paths, the exact-one-occurrence precondition, a non-retryable stale-shift code, a separate material-update statement after the event update and the absence of the defective sibling `material_changes` CTE. It also rejects destructive SQL and `include-all`.

Reviewed SHA-256:

```text
835b7887ee080d4b64ded6ea81306c6b2d800ba74ec167efafb2a7f8568e0cbb
```

## Remaining gate

The migration has not been applied or dry-run against Staging or Production. The next action is Product Owner review and a separate exact Staging-only application instruction naming `20260817233540_fix_phase2_conflicts_and_shift_materials.sql`. After an authorized application, rerun the authenticated probe without either stale-conflict skip and require the stale-template, stale-schedule and release-boundary checks to pass.

No commit, push, Preview, merge, deployment or Production change occurred.
