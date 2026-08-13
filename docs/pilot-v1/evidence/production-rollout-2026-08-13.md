# Pilot V1 — Production Rollout Evidence

Status: Passed
Owner: Product owner, Release owner, Engineering and QA/Security
Date: 13 August 2026

## Decision and scope

The Product Owner explicitly authorized applying only Production migrations `20260811170000` and `20260813081141` to Supabase project `owmlxsnzogfapotmjrqk`, merging the reviewed Pilot V1 pull request, allowing its Vercel Production deployment, and performing non-mutating authenticated smoke checks.

The authorization explicitly excluded `20260804120000_realign_weekly_course_schedule.sql`, both older tracker migrations, every other pending migration and any Production test fixture. No excluded migration was applied or ledgered, and no fixture or live-data mutation was performed.

## Release identity

| Item | Verified value |
|---|---|
| Reviewed source branch | `codex/pilot-v1` |
| Frozen reviewed source tip | `2ab175788cd037984399f14a0fc4a900c380067d` |
| Accepted application commit | `8fb7cf6` |
| GitHub pull request | [#16](https://github.com/theadmitco-tech/ace-club-lms/pull/16) |
| `main` merge commit | `7c35466a34d20726945544ae98d2e368ca277b01` |
| Vercel Production deployment ID | `5886517926` |
| Vercel deployment | `https://ace-club-1xro6ku54-theadmitco-techs-projects.vercel.app` |
| Production origin | `https://aceclub.theadmitco.com` |
| Pre-release rollback deployment ID | `5774570512` |
| Pre-release rollback commit | `0e7be4d40f7a47d34fe1c9441ffa5834eaf12ef2` |

The pull request was mergeable and its Vercel and Preview Comments checks passed at the frozen source tip. GitHub recorded the new Production deployment as successful for the exact merge commit.

## Database migration

Production preflight confirmed the expected healthy project, a private `course-materials` bucket and no Pilot V1 migration in the ledger. An isolated temporary worktree excluded the two historical tracker migrations and the weekly-schedule migration from its migrations directory.

The pinned Supabase CLI `2.114.0` dry run listed exactly, in this order:

1. `20260811170000_add_batch_session_materials.sql`
2. `20260813081141_revoke_session_material_trigger_rpc_access.sql`

The reviewed SHA-256 checksums were:

- `20260811170000`: `a8b2bf36f9f6a69bcd86682b1d7fa514acb61af3542ee184ca5a57eaa9bc9c68`
- `20260813081141`: `5095bd9dd72eccac898a19f31f0e1c08a8f658155e43d19f1a1b77b83df54524`

The tracked push applied exactly those two migrations. The final ledger contains both authorized versions and contains none of `20260803120000`, `20260803160000` or `20260804120000`.

Post-application schema checks passed:

- all three expected material constraints are present and validated;
- the material policies retain Admin management and release-gated Student reads;
- the trigger-only helper is not executable by `anon` or `authenticated`;
- the save/remove Admin entry points are unavailable to `anon` and available to `authenticated`; and
- the private bucket remains private with its 50 MB limit unchanged.

The CLI reported a non-blocking local catalog-cache warning because Docker was unavailable. The remote migration transaction and ledger verification succeeded.

## Sanitized before/after comparison

| Aggregate | Before | After smoke | Result |
|---|---:|---:|---|
| Courses | 1 | 1 | Unchanged |
| Sessions | 30 | 30 | Unchanged |
| Enrollments | 10 | 10 | Unchanged |
| Materials | 36 | 36 | Unchanged |
| Student question logs | 2,480 | 2,480 | Unchanged |
| Admin-owned Student question logs | 0 | 0 | Unchanged |
| Tracker: Done | 92 | 92 | Unchanged |
| Tracker: Review | 70 | 70 | Unchanged |
| Tracker: Not updated | 2,318 | 2,318 | Unchanged |
| Tracker latest update | `2026-08-13T08:15:30.409298+00:00` | Same | Unchanged |
| Videos | 4 | 4 | Unchanged |
| Pre-reads | 22 | 22 | Unchanged |
| Worksheets | 10 | 10 | Unchanged |
| Private bucket objects | 14 | 14 | Unchanged |
| Worksheet objects | 14 | 14 | Unchanged |
| Session-material objects | 0 | 0 | Unchanged |

No Production Session-material row or object was created. No tracker value, session, enrollment, material or private object changed during the release checks.

## Application and smoke checks

Anonymous checks passed on the Production origin: `/` and `/login` returned `200`; `/dashboard` and `/admin/recordings` redirected signed-out requests to Login.

Using approved existing accounts without retaining identities or authentication artifacts:

- Student Google sign-in reached the Production Student dashboard.
- Student navigation exposed Practice and did not expose Admin navigation.
- A direct Student request to `/admin` was denied by role routing.
- `/practice` loaded worksheet and tracker-status content, remained functional through navigation, and no value was changed.
- The currently available non-mutating Production state did not expose a separate eligible worksheet link suitable for a deeper protected-file open; the already-passed staging protected-file and release probes remain the positive coverage because a Production fixture was not authorized.
- Student sign-out returned to Login.
- Admin Google sign-in reached the Production Admin landing.
- Session Resources loaded batch/session and resource content without an application error or mutation.
- Admin Progress loaded with progress content and exposed no editable input or save/update control.
- A direct Admin request to `/practice` was denied by role routing.
- Admin sign-out returned to Login.

The authenticated checks were deliberately non-mutating. Cross-batch and unreleased positive/negative lifecycle coverage remains carried by the complete staging authorization and lifecycle evidence; creating Production data to repeat it was explicitly excluded.

## Findings and recovery

No critical, high or release-blocking finding occurred. No rollback was required. The pre-release Vercel deployment and commit above remain the recorded application rollback target; the additive database schema would remain in place if an application rollback were later required.

## Production decision

Pilot V1 is deployed to Production. Phase 7 and the Pilot V1 Production release are complete. Weekly-schedule work remains explicitly deferred and must be planned and authorized separately.
