# Pilot V2 Phase 7 Production attempt — 20 August 2026

Status: Stopped safely; migration rolled back; no merge or deployment

## Authorization and release identity

- Product Owner authorized push/merge of frozen tip `62b769b426e53e9f0dfc704435acbf352a68a1b2`, the seven migrations below, deployment of the resulting `main`, and the specified smoke checks.
- Authorized migrations: `20260817090845`, `20260817143000`, `20260817170000`, `20260817233540`, `20260818113000`, `20260818170000`, `20260818173000`.
- No environment changes, existing-batch operations or Production fixtures were authorized.
- Production project: `owmlxsnzogfapotmjrqk`.
- Fresh encrypted backup: `2026-08-20T10:10:33Z`; SHA-256 `ddff9bd65f065813db33d1dc6fa3007e64b325174384ffbe158b3907eeacf7fc`; off-device upload confirmed by the Product Owner.

## Final gates

- Frozen source and all seven migration checksums matched the conditional release plan.
- The three excluded migration files were isolated from a detached temporary release worktree.
- Production still had the exact 16-version baseline; all seven V2 migrations and all three excluded migrations were absent.
- `db push --dry-run --skip-vault` listed exactly the seven authorized migrations, in order, with no seeds or roles.

## Attempt and hard stop

At `2026-08-20T10:26:25Z`, the identical non-dry-run command stopped during the first migration, `20260817090845_add_versioned_course_templates.sql`, before any later migration ran.

Postgres raised `P0001`: the Full Course template assertion expected exactly 31 active `mvp-2026` Master events. Production has 30. No retry, repair, history edit, merge or deployment was attempted.

Read-only comparison found:

- Production: 30 active `mvp-2026` Master events, numbered 1–30.
- Staging: 31 active `mvp-2026` Master events, numbered 1–31.
- Staging includes an orientation event and uses a materially different event ordering/curriculum-key sequence; this is not a safe one-row Production data correction.

## Rollback proof

- Production migration ledger remained at the original 16 versions; none of the seven V2 versions appeared.
- No V2 template tables remained.
- Baseline counts remained unchanged: 1 course, 30 sessions, 51 materials, 11 enrollments, 4,378 tracker rows, 26 private Storage objects and 73,792,133 Storage bytes.
- Production application remained Vercel deployment `dpl_8E58rULukrL5p4rpuR6VzsqXWXhf`, source `c3bc1851553d44aaa48c88f542e64bf9ae68da1d`, state `READY`.
- Anonymous probes remained `/` `200`, `/login` `200`, `/dashboard` `307`, `/admin` `307`.

## Decision

Phase 7 remains blocked at the migration gate. Engineering must produce and Staging-test a compatibility approach for the real 30-event Production Master curriculum. Any revised migration or Production data change requires a new frozen source, checksums, preflight, backup and explicit Product Owner authorization.
