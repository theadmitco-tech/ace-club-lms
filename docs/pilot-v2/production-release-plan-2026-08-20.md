# Pilot V2 — Conditional Production Release Plan

Status: Prepared for review; Production unauthorized
Owner: Product owner, Release owner, Engineering and QA/Security
Last updated: 20 August 2026

## Boundary and identity

This plan does not authorize a merge, Production migration, deployment, environment change, fixture or data mutation. A new Product Owner instruction must name every authorized action and migration.

| Item | Exact value |
|---|---|
| Branch/base | `codex/pilot-v2`; `c3bc1851553d44aaa48c88f542e64bf9ae68da1d` |
| Accepted application | `547581efccf74300f3902df024db8bf47a27fa25` |
| Accepted Preview | `dpl_5rfTN5pyze99mCPzHnuhNyHymsDU`; `https://ace-club-91q2ijwym-theadmitco-techs-projects.vercel.app` |
| Pre-plan documentation tip | `874235fc8ee0750e25762ffb2087f96efb7ddb7d` |
| Production | `https://aceclub.theadmitco.com`; Supabase `owmlxsnzogfapotmjrqk` |
| Staging | Supabase `eyphkkginlgoaxflauog` |
| Recorded rollback target | Vercel `dpl_8E58rULukrL5p4rpuR6VzsqXWXhf`, source `c3bc1851553d44aaa48c88f542e64bf9ae68da1d` |
| Supabase CLI | `2.114.0` |

Before authorization, freeze the reviewed branch tip and prove `547581e..<tip>` is documentation-only. Resolve the currently serving Production deployment read-only; if it differs from the recorded rollback target, record and assess the new exact target.

## Exact migration set

Apply only these files, in order:

1. `20260817090845_add_versioned_course_templates.sql` — `e8f4fb8d3ccb6a50ff148395ef172619ff2b612736169967798c1c4bc249e72c`
2. `20260817143000_add_batch_schedule_builder.sql` — `d212b87a0026a4fe08354f9d594a2712fdb4300e2e859622ecb76612f0d2d96b`
3. `20260817170000_fix_batch_event_reorder.sql` — `7765916e6b627288853d20e5b4839f16d9e72fd910459b6a62bf60230f3759d9`
4. `20260817233540_fix_phase2_conflicts_and_shift_materials.sql` — `835b7887ee080d4b64ded6ea81306c6b2d800ba74ec167efafb2a7f8568e0cbb`
5. `20260818113000_add_flexible_batch_resources.sql` — `976e93fbd551ded352824915bfa2dc5e135b0846472c544e3b327f366e57f5b8`
6. `20260818170000_add_student_portal_projection.sql` — `9145a116fedcad7351cb9dee6c2f32fb0a44e8bd2a4c8924c981c82743b0f165`
7. `20260818173000_fix_student_portal_projection_compatibility.sql` — `18be0ee026e126ea2d46a8fbcd6ed2b05c6aba6f25d0d3937d026b1e36d60de5`

Never apply, repair or mark applied `20260803120000`, `20260803160000` or `20260804120000`. Never use `supabase db push --include-all`.

## Hard stops

Stop if the accepted source/Preview changed; a checksum differs; the Production ledger is not the recorded 16-version baseline; an excluded migration appears; the dry run lists anything except the seven versions above; Production configuration points at Staging; the rollback target is unknown; or any critical/high authorization, privacy, release, cross-batch or data-integrity finding is open.

## Read-only preflight

Refresh the Phase 6 Production baseline immediately before authorization:

- [ ] Fetch refs; record clean status, `origin/main` and reviewed tip; prove post-`547581e` changes are documentation-only.
- [ ] Pass `npm run test:pilot-v2` (46/46), touched-file ESLint, `npx tsc --noEmit --incremental false`, guarded Production build, `git diff --check`, link and privacy/secret checks.
- [ ] Confirm the accepted Preview is `READY`, immutable and Staging-backed.
- [ ] Confirm Production has 16 baseline migrations, the two Pilot V1 versions, and none of the three excluded or seven V2 versions.
- [ ] Recompute the seven checksums and compare with Staging.
- [ ] Capture sanitized counts/digests for courses, schedules, materials, enrollments, tracker identities, Admin-owned tracker rows, orphans, ownership violations and schedule inversions.
- [ ] Confirm the running Production batch has no template revision and record its relationship digests without identities.
- [ ] Capture affected schema, constraints, indexes, functions, triggers, grants and RLS; confirm `course-materials` is private and record object count only.
- [ ] Confirm backup/PITR capability and restore owner.
- [ ] Confirm Google Auth allow-lists and the four correctly scoped Vercel variables without exposing values.
- [ ] Resolve the current Production deployment/source/aliases as the exact rollback target and name all release owners.

The current Supabase changelog has no breaking change affecting this hosted migration path. Because new public tables may not be automatically exposed, explicitly verify RLS and intended `authenticated` grants on all five template tables; do not rely on Data API defaults.

## Required authorization

The Product Owner instruction must separately name: merge of the frozen tip; all seven Production migrations; deployment of the resulting reviewed `main` merge; the smoke checks below; any environment change (default none); any existing-batch operation (default none); and any Production fixture (default none). Partial authority stops at the next gate.

## Ordered execution

1. Freeze and record the reviewed tip, accepted application, Preview and checksums in dated evidence.
2. Create a detached temporary release worktree. Only there, move the three excluded files outside `supabase/migrations`.
3. Run `npx --yes supabase@2.114.0 migration list --project-ref owmlxsnzogfapotmjrqk`.
4. Run `npx --yes supabase@2.114.0 db push --project-ref owmlxsnzogfapotmjrqk --dry-run --skip-vault`; require exactly the seven ordered versions.
5. Reconfirm authorization/project/output, then run the identical command without `--dry-run`. Do not add `--include-all`, seed or role flags.
6. Verify all seven versions once; excluded versions absent; schema/grants/RLS match Staging; five new tables have RLS; `anon` has no access; privileged functions internally authorize.
7. Verify four seeded templates read-only. Confirm no course, session, material, enrollment, tracker row, private object or existing-batch relationship changed.
8. Merge only the frozen branch through the protected path; record the resulting `main` merge commit.
9. Deploy that exact merge to Vercel Production; require the environment guard, `READY` state and Production alias.
10. Run anonymous probes: `/` and `/login` return `200`; protected routes redirect without content exposure.

If migration or verification fails, stop with the old application serving. Do not retry blindly, edit an applied migration, repair history or deploy the application.

## Authenticated non-mutating smoke

Student: Google role routing; Home recommendations; Full Course Week Schedule; instant Resources filters; one released worksheet/tracker read with unchanged refresh totals; one authorized private PDF; locked/unpublished/cross-batch denial where a safe existing case exists; sign-out denial.

Admin: role routing; exactly four templates and read-only preview; existing batch/schedule load without mutation; Resources load without upload/edit/sync; recording/Session-material isolation; read-only Admin-progress parity with zero Admin-owned tracker rows; sign-out denial.

Repeat ledger, grants/RLS, sanitized aggregates/digests and private-object count afterward. Confirm the excluded versions remain absent.

## Fixture, rollback and evidence

No Production fixture or running-batch compatibility mutation is authorized by default. Any such action needs separate exact scope, a non-live target, cleanup owner and zero-residue proof.

Before application promotion, a failed migration should roll back transactionally; inspect schema/ledger before any retry. After promotion, roll back an application defect by redeploying the exact preflight-recorded deployment and restoring aliases while leaving additive schema intact. Authorization/privacy exposure is critical/high: stop V2 Admin mutations, roll back the app and preserve sanitized evidence. Never drop the V2 schema, rewrite migration history, withdraw released material, delete private objects or rewrite tracker rows. Schema recovery requires a new Staging-tested compensating migration.

After an authorized attempt, create immutable dated evidence under `docs/pilot-v2/evidence/` recording authorization, frozen/merge/deployment identities, dry run and ledger/schema results, smoke checks, sanitized before/after aggregates, findings and rollback/decision. Record no secrets, identities, Student rows, signed URLs or private paths.

## Review gate

- [ ] Release owner confirms sequence, environment separation and current rollback target.
- [ ] Engineering confirms exact source, checksums, dry run and compatibility.
- [ ] QA/Security confirms authorization, RLS/privacy/release/isolation coverage.
- [ ] Product Owner approves this plan.
- [ ] Product Owner separately authorizes every Production-changing action.

Phase 7 remains prepared, not authorized, until these gates are recorded.

## Preflight result — 20 August 2026

The authorized read-only preflight, exact seven-migration dry run and tested encrypted manual snapshot recovery are recorded in [Phase 7 Production preflight evidence](evidence/phase-7-production-preflight-2026-08-20.md). Technical and snapshot-recovery checks pass. Production remains unauthorized until the documentation-only tip is frozen, volatile checks are refreshed, a fresh snapshot is taken immediately before migration and the Product Owner names every Production-changing action.
