# Pilot V1 — Conditional Production Release Plan

Status: Draft
Owner: Product owner, Release owner, Engineering and QA/Security
Last updated: 13 August 2026

## Decision boundary

Pilot V1 passed staging acceptance on 13 August 2026. This plan is ready for release review, but it does not authorize a merge, Production SQL, a Production deployment, an environment change, or a live-data mutation.

Before any Production-changing action, the Product Owner must approve this plan and explicitly authorize the exact release actions. A successful review without that instruction remains planning only.

## Release identity

| Item | Release value |
|---|---|
| Source branch | `codex/pilot-v1` |
| Branch base | `origin/main` at `0e7be4d40f7a47d34fe1c9441ffa5834eaf12ef2` |
| Accepted application commit | `8fb7cf6` |
| Accepted immutable Preview | `https://ace-club-2w3ekxg2n-theadmitco-techs-projects.vercel.app` |
| Planning baseline before this document | `c54391c984ff9a7672b60e0616f4019f98f943a4` |
| Production URL | `https://aceclub.theadmitco.com` |
| Expected Production Supabase project | `owmlxsnzogfapotmjrqk` |
| Expected staging Supabase project | `eyphkkginlgoaxflauog` |

`8fb7cf6` is the final accepted application state. Later commits through the planning baseline are documentation-only. Before requesting promotion authority, record the reviewed branch tip and confirm that the application and migration diff after `8fb7cf6` is empty. If `origin/main` or the application diff moves, stop and rerun the integration and staging gates before using this plan.

## Release invariants

The release must preserve:

- separate staging/Preview and Production Supabase projects;
- Google-only access for controlled, pre-provisioned Admin and Student accounts;
- server-side Admin authorization, RLS, active-account and enrollment checks;
- Student ownership and privacy of `student_question_logs`;
- read-only Admin progress over the canonical Student tracker rows;
- published-session and release-time protection for materials;
- batch-specific recordings and Session materials;
- private worksheet and Session-material delivery through short-lived signed URLs; and
- existing running batches, sessions, Master materials, enrollments, tracker rows and private objects.

The release must not seed Production tracker data, create a live Session material merely for positive coverage, synchronize a recording or Session material across batches, or perform destructive legacy cleanup.

### Weekly schedule exclusion

Per [ADR-0004](../decisions/adr-0004-defer-weekly-schedule-redesign.md), this release does not apply, repair, mark as applied, or otherwise act on `20260804120000_realign_weekly_course_schedule.sql`. Pilot V1 makes no Production curriculum, Orientation, class-day, session-date or release-timestamp change. The future weekly schedule will be designed and released separately.

Do not use `supabase db push`, `supabase db push --include-all`, or another general pending-migration command for this release. Apply only the two exact Pilot V1 SQL files named below. After each file has succeeded and its schema effect has been verified, record only its matching version in migration history.

## Hard stop conditions

Stop the release before the first Production mutation if any item below is unresolved:

1. The reviewed branch tip is not a descendant of the recorded `origin/main` base, contains an application change after `8fb7cf6`, or differs from the accepted staging diff.
2. The Production migration ledger cannot be inspected safely, or either Pilot V1 version has a ledger/schema mismatch.
3. Any step proposes applying, repairing or marking `20260804120000_realign_weekly_course_schedule.sql` as applied.
4. Any step proposes a general pending-migration push or any SQL other than the two Pilot V1 migrations named in this plan, in this order.
5. The Vercel Production variables are missing, incorrectly scoped, malformed, or point at staging; the service-role key cannot be confirmed as belonging to the Production project without exposing it.
6. The current Production deployment, aliases, or rollback deployment cannot be identified.
7. A critical/high defect, authorization regression, unexpected running-batch mutation, Student-log count change, private bucket exposure, or unreleased-resource exposure appears.
8. A release participant proposes storing a credential, signed URL, private object path, account identifier, or Student data in Git or evidence.

## Preflight — read-only and non-mutating

Complete and record the following before requesting Production-changing authority:

- [ ] Fetch `origin`, record the reviewed branch tip, and confirm `git status` is clean.
- [ ] Review `origin/main...codex/pilot-v1`; confirm the application state is exactly the accepted `8fb7cf6` state plus documentation-only commits.
- [ ] Rerun recommendation fixtures (7/7), protected Session-material path fixtures (4/4), targeted lint for V1-touched files, TypeScript, the guarded Next.js Production build, `git diff --check`, and a changed-file secret/privacy review.
- [ ] Confirm repository-wide lint has no V1-touched-file finding; preserve the signed unrelated baseline rather than claiming a zero-lint result.
- [ ] Confirm the current immutable Preview is Ready and still uses staging configuration.
- [ ] Inspect the Production migration ledger read-only. Confirm the ledger and schema state of the two Pilot V1 versions; observe but do not repair, apply or otherwise act on the weekly-schedule version.
- [ ] Review the exact contents and checksums of `20260811170000_add_batch_session_materials.sql` and `20260813081141_revoke_session_material_trigger_rpc_access.sql`. Confirm the release procedure references no other SQL file.
- [ ] Confirm the Production Supabase project is healthy and identify its current backup/PITR capability. Do not claim a managed backup exists based on the historical Phase 5 state.
- [ ] Confirm the `course-materials` bucket remains private and its existing worksheet objects remain untouched.
- [ ] Capture sanitized aggregate baselines for running courses, sessions, enrollments, materials by type, `student_question_logs`, and Admin-owned tracker rows. Record counts only; do not export Student rows or identities.
- [ ] Capture the current definitions/grants for the affected `materials` constraints, material-read policy, V1 functions and trigger so a later comparison is possible without recording secrets or private data.
- [ ] Confirm the four required Vercel Production variables are present only in the intended scopes: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `NEXT_PUBLIC_SITE_URL`.
- [ ] Confirm the Production build guard resolves the Production Supabase host and `https://aceclub.theadmitco.com`; confirm Preview continues to resolve staging.
- [ ] Confirm Supabase Auth retains Google as the controlled sign-in path and the Production site/callback allow-list points at the Production origin. Do not remove staging or rollback callbacks as part of this release.
- [ ] Record the current Production Vercel deployment ID, its Git commit and aliases as the application rollback target.
- [ ] Reserve a release window and name the Product Owner, Release owner, Engineering owner and QA/Security owner who will execute or observe each gate.

## Explicit Production authorization

After preflight passes, obtain one new Product Owner instruction that names what is authorized. It should cover, as separate actions:

1. merge of the reviewed `codex/pilot-v1` tip;
2. application of exactly the two Pilot V1 migrations to the Production Supabase project;
3. recording exactly those two successfully verified versions in Production migration history;
4. deployment of the resulting reviewed commit to Vercel Production;
5. the authenticated, non-mutating smoke checks below; and
6. whether a controlled Production test fixture is authorized. The default is **not authorized**.

If only some actions are authorized, execute only those actions and pause at the next gate.

## Ordered release sequence

### 1. Freeze the candidate

1. Record the reviewed branch tip and the accepted application commit in a dated Production evidence file.
2. Confirm the GitHub change set, checks and approval state are unchanged since preflight.
3. Do not add application code, migrations or dependency changes after the candidate is frozen. Documentation that changes the release procedure requires renewed review.

### 2. Apply the database changes first

The old Production application is compatible with these additive database changes; the new application depends on them. Therefore apply and verify the database before promoting the application.

1. In the Production Supabase SQL Editor, open a new query and paste only the reviewed contents of `20260811170000_add_batch_session_materials.sql`. Confirm the selected project is `owmlxsnzogfapotmjrqk` before running it.
2. Apply `20260811170000_add_batch_session_materials.sql` as its existing single transaction.
3. Confirm it is ledgered once, and verify:
   - `master_materials` still rejects `session_material` so Master generation and Sync materials cannot propagate it;
   - `materials` accepts the new batch-only type with its shape and unique-file guards;
   - the trigger derives release from the selected batch session end time;
   - the Student material-read policy still requires release, a published session and authorized course access;
   - the save/remove functions have fixed search paths and perform an internal active-Admin check; and
   - `anon` cannot call the save/remove functions while `authenticated` has only the intended entry-point grants.
4. Only after the first migration passes verification, record version `20260811170000` as applied with `npx supabase migration repair --project-ref owmlxsnzogfapotmjrqk --status applied 20260811170000`. Do not use `--linked`, because the local project is expected to remain linked to staging.
5. In a separate Production SQL Editor query, paste and apply only `20260813081141_revoke_session_material_trigger_rpc_access.sql`.
6. Confirm that `public`, `anon`, and `authenticated` cannot directly execute the trigger-only helper.
7. Only after the second migration passes verification, record version `20260813081141` as applied with `npx supabase migration repair --project-ref owmlxsnzogfapotmjrqk --status applied 20260813081141`.
8. List Production migration history and confirm those two versions are recorded once. The weekly-schedule version may remain absent and must not be repaired or applied.
9. Compare the sanitized aggregate baselines. Existing courses, sessions, enrollments, materials, `student_question_logs`, Admin-owned tracker rows and private object counts must be unchanged. At this point there should be no Production `session_material` row created by the release itself.

If either transaction, verification, or matching history repair fails, stop. Do not retry blindly, edit an applied migration, run a general database push, or continue to application deployment.

### 3. Merge and deploy the application

1. Merge only the reviewed Pilot V1 branch through the normal protected GitHub path.
2. Record the resulting `main` merge commit. Do not infer it from the source-branch hash.
3. Confirm Vercel builds that exact merge commit with `VERCEL_ENV=production` and that the repository environment guard passes.
4. Confirm the deployment is Ready, targets Production, and owns `aceclub.theadmitco.com` before treating it as promoted.
5. Run anonymous probes: `/` and `/login` return `200`; protected Student/Admin routes redirect to Login without exposing content.

### 4. Run authenticated smoke checks

Use approved existing Production accounts and read-only journeys. Do not capture identities, browser storage, cookies, signed URLs or private Student content in evidence.

Student:

- Google sign-in reaches the correct Student course; Admin routes remain inaccessible.
- Timeline, Browse by section, Practice log and the worksheet workspace load for an existing released item.
- Existing tracker totals and a previously saved value remain consistent before and after refresh. Do not change a tracker value for smoke testing.
- The PDF and tracker remain usable and independently scrollable at the supported desktop width.
- Recommended reading/practice show only currently eligible resources; direct locked/unpublished routes remain denied.
- Sign-out returns to Login and a direct protected request remains denied.

Admin:

- Google sign-in reaches Admin; Student-only routes redirect correctly.
- Session resources loads the existing batches and sessions without creating, uploading, renaming, replacing or removing a live resource.
- Existing recording state is unchanged and no Session material appears in another batch.
- Admin progress loads and remains read-only; its aggregate totals match the Student view without creating an Admin-owned tracker row.
- Sign-out returns to Login and protected Admin routes remain denied.

Post-smoke checks:

- compare all preflight aggregate counts, including `student_question_logs` and Admin-owned tracker rows;
- confirm the bucket remains private and no `session-materials/` object was created by the release or smoke checks;
- confirm the V1 function grants, material policy and trigger-helper revocation remain correct;
- verify release-time and recommendation behavior against existing eligible data without changing a running batch; and
- verify an approved cross-batch direct reference is denied read-only when such a safe existing case is available. Otherwise carry forward the complete staging probe and record Production cross-batch mutation testing as deliberately not performed.

## Controlled fixture rule

The default Production smoke is non-mutating. If the Product Owner separately authorizes a positive Session-material lifecycle in Production, it must use a named non-live test batch/session, a non-sensitive PDF, an explicit cleanup owner and a before/after zero-residue check. Never use a running Student batch. That optional fixture requires its own written scope and must not be inferred from general release approval.

## Rollback and recovery

### Before application promotion

- A failed migration transaction should roll itself back. Confirm ledger and schema state before considering a retry.
- If a migration succeeds but a verification gate fails, stop with the old Production application still serving. The old app is compatible with the additive V1 schema.
- Correct a verified database defect through a new ordered, staging-tested compensating migration. Do not edit either applied V1 migration or run ad hoc destructive SQL.

### After application promotion

- For an application/runtime defect, redeploy the recorded pre-V1 Production deployment and restore its aliases. Leave the additive V1 schema in place while the incident is assessed.
- For an authorization, privacy, cross-batch or unreleased-file defect, immediately stop Admin Session-material operations, roll back the application, preserve evidence safely and treat it as critical/high.
- Do not drop the V1 type, constraints, functions, policy, trigger, rows or private objects during an emergency application rollback. A schema rollback is a separately reviewed migration and must first prove whether any Production Session-material row or object exists.
- Private `session-materials/<session-id>/<uuid>.pdf` objects remain inaccessible through the old app and the private bucket. Retain them with their database references; never bulk-delete the prefix. Any later cleanup must map every row to its object and handle `cleanupPending` cases explicitly.
- Existing worksheets remain in their separate `worksheets/` namespace and must never be moved or deleted during V1 rollback.
- `student_question_logs` are outside both V1 migrations. Never restore, truncate, reseed or rewrite them during V1 recovery. Use the sanitized before/after aggregates to prove they remained unchanged.

After rollback, repeat anonymous health checks, authenticated role routing, Student Practice log persistence, Admin read-only progress and the aggregate database comparisons. Record the incident and disposition in separate dated evidence.

## Evidence and completion

Create a new immutable file under `docs/pilot-v1/evidence/` after an authorized Production attempt. It must record:

- reviewed source tip, merge commit and deployed Vercel deployment ID;
- preflight and migration-ledger result;
- each migration result and post-application verification;
- anonymous and authenticated smoke results;
- sanitized before/after aggregates for running-batch and Student-log protection;
- rollback action, if any;
- findings with severity, owner, disposition and retest; and
- the Product Owner Production decision.

Do not record secrets, account identifiers, signed URLs, private paths, Student rows or screenshots containing private data.

## Review gate

- [ ] Release owner confirms the sequence, environment separation and rollback target.
- [ ] Engineering confirms the final diff, exact migration set and compatibility path.
- [ ] QA/Security confirms the authorization, privacy, release and smoke-test coverage.
- [ ] Product Owner approves this plan.
- [ ] Product Owner separately authorizes the exact Production-changing actions.

Until all applicable boxes are evidenced, Pilot V1 remains accepted for Production planning but not authorized for Production promotion.
