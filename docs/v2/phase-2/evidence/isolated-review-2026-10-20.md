# Isolated Phase 2 review verification — 20 October 2026

Branch: `intern/v2-phase-2-review`.
Application/configuration commit: `26ec141561a0749dba371409273c1f1ee9906049`.
Dependency: `d3020c1c9916c17f6ced27f83ff9ee1be05479f2` (Phase 1 PR #23).

## Scope and provenance

Selected Phase 2 files were extracted from `208ceaa453049463322ff127842eec9814e6ea8a`.
Phase 1 files remain unchanged. Later payment/upgrade/content/deployment changes
were excluded. The mixed verification runner was replaced with a Phase 2-only
runner; standalone-upgrade tests were excluded with the later-phase helper.
CI includes both isolated runners and triggers on this task branch and PRs
targeting the Phase 1 task branch. The final trigger-list update changes no test
or application behavior; hosted execution remains a separate verification.

Historical mixed-scope reports remain unchanged on the preserved source branch:
`docs/v2/phase-2/evidence/approved-implementation-2026-10-20.md` and
`docs/v2/phase-2/evidence/local-hardening-2026-10-20.md`. Those reports describe
additional files absent from this isolated candidate and are not current evidence.

## Local checks

Commands run from the repository root:

```bash
env -i PATH="$PATH" NEXT_TELEMETRY_DISABLED=1 npm run test:v2:phase1
env -i PATH="$PATH" NEXT_TELEMETRY_DISABLED=1 npm run test:v2:phase2
npm run lint -- --max-warnings=0
env -i PATH="$PATH" NEXT_TELEMETRY_DISABLED=1 npm run build
./node_modules/.bin/tsc --noEmit --incremental false
git diff --check
```

| Check | Actual result |
|---|---|
| Phase 1 dependency/legacy runner | 102 tests in 11 files passed |
| Phase 2 runner | 127 tests in 10 files passed |
| Total | 229 tests; zero failures, skips or cancellations |
| Lint / TypeScript | Passed with no lint warnings |
| Build | Passed; 42 generated entries |
| Personal-name / credential-pattern scan | Zero findings in selected changes |

Database suite totals include parent tests. Disposable clusters use private Unix
sockets, TCP disabled and synthetic identities. No hosted connection string or
application server is used. The clean build environment excludes hosted Supabase
and payment variables. The local runtime is Node 26; CI uses Node 24.

Coverage: product isolation; direct-write denials; inactive/signed-out/Student
authorization; immutable history; concurrent duplicate/conflicting writes; stale
previews; retry token integrity; rollback; migration reapplication; private Meet
projection; and preserved legacy/entitlement fixtures. Navigation and publication
handler tests do not substitute for real browser, mobile or keyboard checks.

## Changed application files

The following 43 paths differ from the Phase 1 base:

- `.github/workflows/verify.yml`
- `package.json`
- `scripts/admin-draft-navigation.test.mjs`
- `scripts/helpers/disposable-postgres.mjs`
- `scripts/v2-approved-authoring.test.mjs`
- `scripts/v2-batch-authoring.test.mjs`
- `scripts/v2-batch-database.test.mjs`
- `scripts/v2-meeting-authoring.test.mjs`
- `scripts/v2-meeting-database.test.mjs`
- `scripts/v2-publication-database.test.mjs`
- `scripts/v2-schema-preflight.sql`
- `scripts/v2-schema-preflight.test.mjs`
- `scripts/v2-template-authoring.test.mjs`
- `scripts/v2-template-database.test.mjs`
- `scripts/verify-v2-phase2.mjs`
- `src/app/admin/AdminShell.tsx`
- `src/app/admin/v2/batches/BatchDraftEditor.tsx`
- `src/app/admin/v2/batches/PublicationPanel.tsx`
- `src/app/admin/v2/batches/[batchId]/meeting/MeetingDraftEditor.tsx`
- `src/app/admin/v2/batches/[batchId]/meeting/actions.ts`
- `src/app/admin/v2/batches/[batchId]/meeting/page.tsx`
- `src/app/admin/v2/batches/actions.ts`
- `src/app/admin/v2/batches/page.tsx`
- `src/app/admin/v2/templates/TemplateEditor.tsx`
- `src/app/admin/v2/templates/actions.ts`
- `src/app/admin/v2/templates/page.tsx`
- `src/app/admin/v2/templates/templates.module.css`
- `src/components/AdminDraftNavigation.tsx`
- `src/lib/server/v2BatchFeature.ts`
- `src/lib/server/v2Batches.ts`
- `src/lib/server/v2Meetings.ts`
- `src/lib/server/v2Publications.ts`
- `src/lib/server/v2TemplateFeature.ts`
- `src/lib/server/v2Templates.ts`
- `src/lib/v2Batches.ts`
- `src/lib/v2Meetings.ts`
- `src/lib/v2Publications.ts`
- `src/lib/v2Templates.ts`
- `supabase/migrations/20261019090000_add_v2_template_drafts.sql`
- `supabase/migrations/20261019100000_add_v2_batch_drafts.sql`
- `supabase/migrations/20261019110000_add_v2_private_meeting_drafts.sql`
- `supabase/migrations/20261020090000_add_v2_outline_schedules.sql`
- `supabase/migrations/20261020100000_add_v2_batch_publication.sql`

## Migration checksums

| Phase | File | SHA-256 |
|---|---|---|
| 1 (unchanged dependency) | `20261018090000_add_v2_product_entitlements.sql` | `ff5c9f0f2ae055c6c3b3e2d67fd64390a9ba4b19deaf14a103ddda71e50047b7` |
| 2 | `20261019090000_add_v2_template_drafts.sql` | `ae9729e49c76f25e43320060da2fc35c3ba94e02e48ee782c7a5023a4eac0ec2` |
| 2 | `20261019100000_add_v2_batch_drafts.sql` | `b484762434a2395435a91ab71951ff48a59726d706b1bcb2c79f4ffc2ae31aff` |
| 2 | `20261019110000_add_v2_private_meeting_drafts.sql` | `89cfe129ec70c3e0d6c9664bc1f763a50ff4a08544ecc9121ac35229e25f956d` |
| 2 | `20261020090000_add_v2_outline_schedules.sql` | `a5cc7b5588515a0d13f699031e731e9cf578d18014ca228b120607a0b6c9111b` |
| 2 | `20261020100000_add_v2_batch_publication.sql` | `b4d6ded4e51471da9b4fc64e237d3f0cdcb296fff0c55358b95a6d548dfbd9d6` |

## Limits and next step

No hosted migration, existing student/course-data operation or Production change.
Actual Supabase schema/ledger, OAuth, browser/UI behavior, final-commit CI and
Preview require separate evidence. The Student schedule reader, protected
recording/material associations and real registration allocation remain absent.

Publish the separate draft candidate and verify its exact head. Use the
[coordinated handoff](../review-and-release.md) for approved staging setup,
Phase 1 verification first, then Phase 2 verification and separate acceptance.
