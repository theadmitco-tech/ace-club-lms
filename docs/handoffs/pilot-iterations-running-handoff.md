# Ace Club LMS — Pilot Iterations Running Handoff

Status: Active
Owner: Product owner and Engineering
Last updated: 13 August 2026

## Purpose

Use this document for iterative post-MVP pilot changes after the Phase 8 operational closeout. Keep the main [Ace Club LMS running handoff](ace-club-lms-running-handoff.md) as the signed Phase 0.5–8 history. Record short-lived V1/V2 working state here so future work can resume without rereading every historical phase.

This document coordinates work; it does not authorize a Production change. Every version remains staging-only until its acceptance criteria pass and the Product Owner explicitly approves Production promotion.

This file is the single bootstrap entry point for a new working chat. A Product Owner should be able to provide only this path; the new chat must follow its reading list, locate the current V1 phase, verify the recorded Git/environment state, and continue from the one exact next action. Any new durable plan, requirement, checklist, decision, or evidence file created during a pilot version must be linked back into this handoff before ownership transfers or work pauses.

## Authority and required reading

When documents conflict, follow the authority order in the [instruction register](../../instruction/README.md).

Before starting or resuming a pilot version, read:

1. [`AGENTS.md`](../../AGENTS.md).
2. The [instruction register](../../instruction/README.md).
3. The latest signed section of the [Ace Club LMS running handoff](ace-club-lms-running-handoff.md), beginning with the Phase 8 closeout.
4. The latest active version section in this document.
5. For Pilot V1, the [Product Review and Acceptance Criteria](../pilot-v1/acceptance-criteria.md), [phase-wise implementation plan](../pilot-v1/implementation-plan.md), [Phase 0 readiness record](../pilot-v1/phase-0-readiness.md), [Phase 5 staging Session-resource lifecycle evidence](../pilot-v1/evidence/phase-5-staging-session-resource-lifecycle-2026-08-13.md), [Phase 6 integrated verification evidence](../pilot-v1/evidence/phase-6-integrated-verification-2026-08-13.md), [Phase 6 logo amendment evidence](../pilot-v1/evidence/phase-6-logo-amendment-verification-2026-08-13.md), [Pilot V1 Phase 7 manual checklist](../pilot-v1/manual-verification-checklist.md), [Phase 7 staging acceptance evidence](../pilot-v1/evidence/phase-7-staging-acceptance-2026-08-13.md), [conditional Production release plan](../pilot-v1/production-release-plan.md), and the current phase's linked verification probe or evidence, including unchecked exit criteria and Product Owner notes.
6. The [MVP acceptance criteria](../../instruction/Ace_Club_LMS_MVP_Acceptance_Criteria.md), limited to the journeys affected by the proposed version.
7. The completion record in the [product roadmap](../../instruction/Ace_Club_LMS_Product_Roadmap.md) and any roadmap requirement affected by the version.
8. The [Phase 8 closeout and exceptions](../phase-8/README.md), [closeout checklist](../phase-8/manual-verification-checklist.md), and [operational closeout evidence](../phase-8/evidence/operational-closeout-2026-08-10.md).
9. For the shipped Admin/Student tracker boundary, the [Phase 7 status](../phase-7/README.md), [Phase 7 checklist](../phase-7/manual-verification-checklist.md), [staging evidence](../phase-7/evidence/manual-staging-verification-2026-08-03.md), and [Production rollout evidence](../phase-7/evidence/production-rollout-2026-08-03.md).
10. For the shipped Student tracker contract, the [Phase 6 status](../phase-6/README.md), [Phase 6 checklist](../phase-6/manual-verification-checklist.md), [staging evidence](../phase-6/evidence/manual-staging-verification-2026-08-03.md), and [Production rollout evidence](../phase-6/evidence/production-rollout-2026-08-03.md).
11. For the Student course experience and batch-specific recordings, the [Phase 5 status](../phase-5/README.md), [foundation plan](../phase-5/student-experience-foundation-plan.md), [decision summary](../phase-5/student-experience-foundation.md), [UI state and content matrix](../phase-5/ui-state-and-content-matrix.md), and [Production rollout evidence](../phase-5/evidence/production-rollout-2026-08-03.md).
12. For curriculum and release behavior, the [approved revised course structure](../phase-3/revised-course-structure.md), [cohort schedule and material-sync decision](../decisions/adr-0002-cohort-schedule-and-material-sync.md), historical [weekly course schedule decision](../decisions/adr-0003-weekly-course-schedule.md), and its [Production-rollout supersession](../decisions/adr-0004-defer-weekly-schedule-redesign.md).
13. The [documentation index](../README.md), [current code landscape and cleanup plan](../development/current-code-landscape-and-cleanup-plan.md), [document conventions](../governance/document-conventions.md), and [coding and release rules](../development/coding-rules.md).
14. Inspect current Git status and recent commits, fetch the current remote baseline read-only, and confirm the pilot version starts from updated `origin/main`.
15. Before changing Next.js code, read the relevant Next.js 16 guide under `node_modules/next/dist/docs/`, then inspect only the implementation files relevant to the selected changes.

Do not reread every historical evidence file by default. The list above carries forward every current boundary named by the final Phase 7/Phase 8 handoff while routing work to the smallest authoritative files. Load additional historical evidence only when a proposed change touches that boundary or newer evidence contradicts it.

## Exact resume instruction

Use the following instruction to start or continue a pilot version:

> Continue Ace Club LMS from `docs/handoffs/pilot-iterations-running-handoff.md`. Treat it as the single bootstrap file. Pilot V1 Phase 7 is complete and accepted for Production planning; do not repeat Phases 1–7. Read `docs/pilot-v1/evidence/phase-7-staging-acceptance-2026-08-13.md`, `docs/decisions/adr-0004-defer-weekly-schedule-redesign.md` and `docs/pilot-v1/production-release-plan.md`. Complete the plan's read-only preflight, then request a new explicit Product Owner instruction naming the authorized Production actions. Never apply, repair or mark `20260804120000_realign_weekly_course_schedule.sql` as applied; weekly-schedule redesign is separate future work. Planning and read-only preflight are authorized; merging, Production SQL, Production deployment, environment changes and live-data mutation are not. Preserve staging/Production separation, Google-only controlled access, server-side authorization, RLS, release protection, Student tracker ownership, read-only Admin progress, batch-specific recordings and private file delivery.

## Non-regression boundaries

Every pilot version must preserve unless the Product Owner explicitly approves a new durable decision:

- separate staging/Preview and Production environments;
- Google-only controlled Admin and Student access;
- server-side role enforcement and Supabase Row Level Security;
- Student ownership and privacy of tracker data;
- read-only Admin progress;
- release protection for unpublished and future materials;
- batch-specific recordings;
- private worksheet-file delivery; and
- no secrets, authentication artifacts, or private Student data in Git or evidence.

Never run pilot SQL against Production while developing or testing a version. Add durable database changes as new ordered migrations, apply them to staging first, and record the result. Do not amend migrations already applied to Production.

## Roles

| Role | Accountable for |
|---|---|
| Product Owner | Selects the version scope, approves acceptance criteria, decides deferrals, accepts staging and authorizes Production |
| Engineering Owner | Implements code and ordered migrations, keeps the branch current, runs local checks and records technical risks |
| QA and Security Owner | Verifies the affected journey plus authorization, privacy, release and regression boundaries |
| Pilot Operations Owner | Provisions pilot access, gives real-user instructions and records anonymized observations |
| Release Owner | Reviews environment separation, migration/deployment order, rollback path and Production smoke-test plan |
| Documentation Owner | Keeps this handoff, evidence links, defects and the exact next action current |

One person may hold several roles, but Product Owner acceptance and QA/security results must remain explicit.

## Version workflow

For each version:

1. Choose three or four coherent changes that can become independently releasable.
2. Create `codex/pilot-vN` from updated `origin/main`.
3. Record scope, exclusions, acceptance criteria and database impact before implementation.
4. Commit each coherent change separately and push the branch to update its staging-backed Vercel Preview.
5. Apply ordered migrations to staging only, then test the affected journey and non-regression boundaries.
6. Record every finding with severity, owner and disposition.
7. Accept, defer or reject the version explicitly.
8. Merge to `main` only after Product Owner Production approval and a reviewed migration/deployment plan.
9. Record Production evidence separately after promotion; never infer deployment merely from a merge or a successful SQL message.
10. Start the next version from the newly updated `origin/main`.

## Phase-to-phase ownership transfer

The active version's implementation plan may divide work into internal phases. These are execution checkpoints inside a pilot version, not new product-roadmap phases.

Before a V1 phase starts:

1. Read this handoff, the active document register, the phase register, and the current phase in the implementation plan.
2. Verify the recorded branch, commit, working-tree state and remote baseline instead of assuming they are current.
3. Confirm the preceding phase is marked `Complete` and every exit criterion is checked or has an explicit Product Owner-accepted exception.
4. Record the new phase as `In progress`, its owner, start commit and exact intended outcome.
5. Do not perform work belonging to a later phase merely because its files are nearby.

Before a V1 phase transfers ownership to the next phase:

1. Run and record the phase's required checks.
2. Update the implementation plan exit-criteria checkboxes from evidence; never check a result merely because code was written.
3. Update the phase register below with status, end commit, evidence/check result, findings and disposition.
4. Update the current phase checkpoint with committed and uncommitted state, pushed/Preview state, migrations and environments, and one exact next action.
5. Add every new durable requirement, plan, decision, checklist, test summary, migration note or evidence file to the active document register below. Also add it to the Authority and required reading list when a future chat must read it before acting.
6. Update `docs/README.md` when the new file is a durable documentation entry point or category.
7. Preserve Product Owner notes and accepted history; add amendments instead of silently rewriting an accepted decision.
8. Keep raw logs, secrets, authentication links and private Student data out of the handoff. Link sanitized evidence instead.

A phase is `Complete` only when its exit criteria pass, its focused change is committed, the handoff is current and the next owner can continue from one exact action without reconstructing context from chat history.

## Version register

| Version | Objective | Branch | Status | Staging decision | Production decision |
|---|---|---|---|---|---|
| Pilot V1 | Improve titled resources, worksheet/log usability, recommendations and batch-specific Session reading | `codex/pilot-v1` | Accepted for Production | Accepted on 13 August 2026 after complete Phase 7 Engineering/QA evidence | Production planning approved; merge and promotion not authorized |

Allowed version statuses: `Proposed`, `Active`, `Staging verification`, `Accepted for Production`, `Deployed`, `Paused`, or `Superseded`.

## Active version — Pilot V1

### Active document register

This table is the complete Pilot V1 reading layer added on top of the repository-wide required reading above. Keep it current whenever a durable V1 file is created.

| Document | Status | Purpose | Update rule |
|---|---|---|---|
| [Pilot Iterations Running Handoff](pilot-iterations-running-handoff.md) | Active | Single bootstrap, execution state and ownership transfer | Update after every V1 phase and before every pause or transfer |
| [Pilot V1 Product Review and Acceptance Criteria](../pilot-v1/acceptance-criteria.md) | Approved for implementation planning | Binding Product Owner outcomes, exclusions and safety boundaries | Preserve approved decisions; add a dated amendment for later scope changes |
| [Pilot V1 Phase-wise Implementation Plan](../pilot-v1/implementation-plan.md) | Approved for staged implementation | Ordered V1 phases, work, verification and exit gates | Update exit checkboxes only from evidence; preserve phase order |
| [Pilot V1 Phase 0 Readiness Record](../pilot-v1/phase-0-readiness.md) | Complete | Git/environment baseline, Next.js conventions, affected-file inventory, staging material inventory and findings | Preserve as the Phase 1 entry gate; amend only with new dated evidence |
| [Phase 4 Staging Authorization Probe](../pilot-v1/phase-4-staging-authorization-probe.sql) | Passed on staging | Rollback-only Admin, Student, signed-out, inactive, pre-release, unpublished and cross-batch database checks | Preserve; never include identity values or raw output in Git |
| [Phase 4 Staging Migration and Authorization Evidence](../pilot-v1/evidence/phase-4-staging-migration-and-authorization-2026-08-11.md) | Passed | Sanitized migration, ledger, rollback-probe and post-check results | Preserve; add separate evidence for later Preview or Production work |
| [Phase 4 Preview Route Lifecycle Evidence](../pilot-v1/evidence/phase-4-preview-route-lifecycle-2026-08-11.md) | Passed | Sanitized Admin authorization, private upload, attach, protected read, cleanup and no-residue results | Preserve; never add signed tokens, URLs or identity-bearing output |
| [Phase 5 Staging Session-resource Lifecycle Evidence](../pilot-v1/evidence/phase-5-staging-session-resource-lifecycle-2026-08-13.md) | Passed | Sanitized Admin create/rename/replace/remove, Student locked/released/protected-read journey and zero-residue cleanup | Preserve; never add signed tokens, private object paths or identity-bearing output |
| [Phase 6 Integrated Verification Evidence](../pilot-v1/evidence/phase-6-integrated-verification-2026-08-13.md) | Passed | Full diff, secrets, local gates, staging migrations, authorization probe, advisor scope and immutable Preview result | Preserve; use as the Phase 7 entry gate and never add variable values or identity-bearing output |
| [Phase 6 Logo Amendment Verification Evidence](../pilot-v1/evidence/phase-6-logo-amendment-verification-2026-08-13.md) | Phase 7 visual refinement passes local gates | Shared logo implementation, Product Owner finding, transparent-canvas refinement, targeted lint, type/build gates and public/login responsive browser checks | Preserve; complete revised authenticated Student/Admin presentation checks in Phase 7 |
| [Pilot V1 Phase 7 Manual Verification Checklist](../pilot-v1/manual-verification-checklist.md) | Complete | Ordered Product Owner, Engineering and QA/Security staging journeys, including the shared-logo amendment | Preserve as the signed Phase 7 gate |
| [Phase 7 Staging Acceptance Evidence](../pilot-v1/evidence/phase-7-staging-acceptance-2026-08-13.md) | Accepted for Production planning | Sanitized current-Preview Admin/Student, tracker, responsive, release, authorization, carry-forward lifecycle and Product Owner decision | Preserve; Production evidence must be recorded separately after explicit promotion authority |
| [Conditional Production Release Plan](../pilot-v1/production-release-plan.md) | Draft; ready for review | Exact preflight, migration/deployment order, rollback, live-batch/Student-log protection, smoke checks and evidence gates | Review without changing Production; obtain a new explicit Product Owner instruction before any Production action |
| [Production Read-only Verification](../pilot-v1/production-read-only-verification.sql) | Ready | Identity-free migration ledger, aggregate data, storage privacy, policy, constraint and grant checks before/after release | Run read-only; preserve only sanitized output and never add identities or private object paths |
| [ADR-0004 — Defer Weekly Schedule Redesign](../decisions/adr-0004-defer-weekly-schedule-redesign.md) | Approved | Supersedes the earlier weekly-schedule Production rollout; excludes its migration from Pilot V1 and defers redesign | Preserve; do not apply or ledger the excluded migration |

When a manual verification checklist, evidence record, decision, or other durable V1 file is created, add a row here before pausing. If the file is required to continue safely, also add it to the Authority and required reading list and the Exact resume instruction.

### Outcome sought

Make Student resources identifiable and usable during the live pilot, show every current worksheet and class-specific reading recommendation, and let Admins safely manage private batch-session reading beside recordings without changing another batch or Production.

### Included changes

1. Replace generic resource controls with titled resource cards and pair each worksheet with its canonical log actions.
2. Give the PDF and manual tracker independent scrolling in the supported desktop side-by-side workspace.
3. Recommend every released worksheet in the active same-section set while preserving seven-day pre-read release and one-day-before recommendation behavior.
4. Add private batch- and session-specific Session materials beside recordings, expose them in the Student journey, and recommend released reading until a later same-section replacement releases.
5. Replace temporary wordmarks with the supplied Ace Club artwork across the public, login, Student and Admin shells; current light surfaces use the transparent green treatment.

### V1 phase execution register

| V1 phase | Outcome | Status | Owner | Start/end commit | Checks or evidence | Next action |
|---|---|---|---|---|---|---|
| Phase 0 | Baseline, branch, environment and implementation readiness | Complete | Engineering | `0e7be4d` / `0a87f14` | [Phase 0 readiness record](../pilot-v1/phase-0-readiness.md); all exit criteria pass | Transfer to Phase 1 |
| Phase 1 | Shared titled resource-card system | Complete | Engineering and Product Owner | `d4ee94d` / `fb18712` | All local gates pass; staging Auth correction and option B Preview accepted by Product Owner on 2026-08-11 | Transfer to Phase 2 |
| Phase 2 | Independent PDF/tracker scrolling | Complete | Engineering and Product Owner | `9655a85` / `b4cad40` | All eight exit criteria pass; updated Preview passed Product Owner review on 2026-08-11 | Transfer to Phase 3 |
| Phase 3 | Complete worksheet and pre-read recommendations | Complete | Engineering and Product Owner | `b4cad40` / `7db4359` | Nine exit criteria pass; Vercel and signed-in runtime checks pass; Product Owner accepted staging on 2026-08-11 | Transfer to Phase 4 |
| Phase 4 | Session-material data, storage and authorization | Complete | Engineering and QA/Security | `746625f` / `1a746ae` | Local gates, staging migration/ledger/probe, Vercel deployment and sanitized privileged route lifecycle pass | Transfer to Phase 5 |
| Phase 5 | Session resources UI and Student Recommended reading | Complete | Engineering and QA/Security | `aef8b81` / `e80abdc` | All nine exit criteria pass; [sanitized staging lifecycle](../pilot-v1/evidence/phase-5-staging-session-resource-lifecycle-2026-08-13.md) covers create, locked/released, protected open, rename, replace, confirmed removal and zero residue | Transfer to Phase 6 |
| Phase 6 | Integrated local checks, staging Preview and logo amendment | Complete | Engineering and QA/Security | `e80abdc` / `f822f17` | Original eight exit criteria pass; the dated logo amendment's automated and public-browser checks pass, with signed-in shell presentation intentionally assigned to Phase 7 | Transfer to Phase 7 |
| Phase 7 | Staging acceptance and version decision | Complete | Product Owner, Engineering and QA/Security | `f822f17` / `fa6b67e` | Engineering/QA acceptance passes on `8fb7cf6`; Product Owner accepted Pilot V1 for Production planning on 13 August 2026 | Prepare a separate reviewed Production release plan |

Allowed V1 phase statuses: `Not started`, `In progress`, `Exit review`, `Complete`, `Paused`, or `Blocked`.

### Current V1 phase checkpoint

- Current V1 phase: Phase 7 complete — accepted for Production planning.
- Phase status: Complete. Product Owner accepted Pilot V1 for Production planning on 13 August 2026 after the complete Engineering/QA gate on Preview commit `8fb7cf6`.
- Current owner: Product Owner, Engineering and QA/Security for Phase 7.
- Application baseline: Phase 6 integrated commit `1e75935`, initial shared-logo amendment `f822f17`, transparent-canvas refinement `7efc6e5`, and Student recommendation/loading/tab refinement `8fb7cf6`; these Phase 7 changes alter no data, identity, authorization, storage or release rules.
- Git baseline: `origin/main` remained at `0e7be4d40f7a47d34fe1c9441ffa5834eaf12ef2`; no integration merge was required. Application commit `8fb7cf6` remains the accepted immutable Preview, and Phase 7 decision record `fa6b67e` is documentation-only.
- Entry criteria state: Passed. The full V1 diff and migrations are reviewed, changed-file secret/privacy checks pass, recommendation fixtures pass 7/7, protected-path fixtures pass 4/4, all logo-touched TypeScript/TSX files lint cleanly, TypeScript and the Next.js Production build pass, and repository-wide lint improves to 22 errors and 2 warnings in untouched legacy files.
- Migrations: `20260811170000_add_batch_session_materials.sql` and `20260813081141_revoke_session_material_trigger_rpc_access.sql` are applied and ledgered on staging only. The rollback-only authorization probe passes after both migrations with zero residue. Neither migration is applied to Production.
- Preview: Immutable Vercel Preview commit `8fb7cf6` is Ready at `https://ace-club-2w3ekxg2n-theadmitco-techs-projects.vercel.app`. Its successful Vercel build passed the repository Preview guard that requires staging configuration.
- Findings: P7-01, P7-02 and P7-03 are fixed and passed Product Owner visual retest on 13 August 2026. P7-04 is a low reviewer-tool limitation closed by unchanged-code evidence carry-forward. No critical or high finding is open.
- Fixtures: The approved anonymized staging Admin and enrolled staging Student used for the Phase 5 lifecycle remain available for Phase 7. No identity or authentication artifact is stored in Git.
- Production state: Untouched. Production planning is approved; merge, migration and deployment are not authorized.
- Release plan: Drafted at [conditional Production release plan](../pilot-v1/production-release-plan.md). It excludes the superseded weekly-schedule migration, requires an isolated-checkout dry run containing only the two V1 migrations, and defaults all authenticated smoke checks to non-mutating journeys.
- Exact next action: Release owner, Engineering, QA/Security and Product Owner review the plan and complete its read-only preflight; then request a new explicit Product Owner instruction naming the authorized Production actions.

### Explicit exclusions

- No change outside the listed V1 scope.
- No destructive database cleanup.
- No Production SQL, data mutation, deployment or environment change during implementation and staging verification.
- No weakening of the non-regression boundaries above.

### Acceptance criteria

The binding detailed criteria are in [Pilot V1 acceptance criteria](../pilot-v1/acceptance-criteria.md). The proposed delivery sequence and per-phase exit gates are in the [Pilot V1 implementation plan](../pilot-v1/implementation-plan.md).

| Change | Expected user outcome | Failure and permission checks | Status |
|---|---|---|---|
| V1-01 | Students distinguish every resource by type, title and accessible visual variant, with worksheet and log actions kept together | Locked/missing resources, long titles, keyboard focus and canonical destinations remain safe | Complete; accepted in staging 2026-08-11 |
| V1-02 | Students scroll the PDF and tracker independently on desktop without losing either position | Stacked layouts, keyboard access, failure isolation and saved tracker state remain safe | Complete; accepted in staging 2026-08-11 |
| V1-03 | Every worksheet in the active same-section set is recommended and tomorrow's pre-read is highlighted without changing its release | Empty/partial sets, duplicates, cross-batch access and direct unreleased URLs are denied safely | Complete; accepted in staging 2026-08-11 |
| V1-04 | Admins privately manage batch-session reading beside recordings; Students receive it after class and under Recommended reading | Invalid uploads, non-Admin writes, pre-release reads, cross-batch propagation and stale replacements are prevented | Phase 5 engineering and staging lifecycle complete; Product Owner version decision remains in Phase 7 |

### Database and environment impact

- Database change required: Added the batch-only `session_material` type, shape/index guards, Admin save/remove RPCs and release-gated read policy without changing reusable Master rows.
- Ordered migrations: `20260811170000_add_batch_session_materials.sql` and the Phase 6 least-privilege hardening migration `20260813081141_revoke_session_material_trigger_rpc_access.sql`; both are applied and ledgered on staging only.
- Staging application result: Phases 1–3 accepted; Phases 4–6 engineering, migration, authorization, Preview lifecycle and integrated gates complete; Phase 7 Engineering and QA/Security acceptance passes, with only the Product Owner decision open.
- Production application: Not approved.
- Rollback or compatibility requirement: Existing live batches and reusable Master pre-read/worksheet synchronization must remain compatible and untouched; V1 rows must be independently removable without changing another batch.

### Verification

- Local lint/build: Integrated recommendation regressions pass 7/7 and protected file/path fixtures pass 4/4; all logo-touched TypeScript/TSX files pass targeted ESLint, `npx tsc --noEmit` passes, and the Next.js 16 Production build passes. Repository-wide lint is 22 errors and 2 warnings in untouched legacy files, one warning better than the pre-amendment baseline.
- Logo browser checks: The revised transparent public/Login treatment passes locally and Product Owner review; authenticated Student/Admin shells pass the current Preview at desktop and the 720 CSS-pixel effective-width check with no page-level overflow and usable navigation/account controls.
- Vercel Preview commit and URL: Refined logo application commit `7efc6e5`; `https://ace-club-a5x8ubchp-theadmitco-techs-projects.vercel.app` (Vercel GitHub deployment succeeded and the Preview guard confirmed staging configuration without exposing values).
- Staging accounts and fixtures: Approved staging Admin browser session; Phase 4 file/path fixtures are committed at `scripts/session-material-files.test.mjs`, the rollback-only probe is committed at `docs/pilot-v1/phase-4-staging-authorization-probe.sql`, and neither contains private Student data.
- Affected journey result: The authenticated staging Student saw the released fixture independently under Recommended reading and across the intended course surfaces, saw the future fixture locked with the correct after-class date, could not open it through the UI or direct route, opened the released PDF through the protected viewer, and saw no stale card after confirmed Admin removal. Multiple-sibling/replacement recommendation edges remain covered by committed controlled fixtures.
- Authorization/privacy/release regression: Passed through migration review, repeated rollback-only staging probes, signed-in privileged route lifecycle and post-removal `404`; private delivery retains active-account, enrollment, published-session, release, signed-URL and no-store boundaries. Phase 6 removed an unnecessary anonymous trigger-helper grant and reverified the Admin RPC grants.
- Product Owner staging acceptance: Phases 1–3 passed on 2026-08-11. The Product Owner completed the Phase 3 staging review and requested transfer to Phase 4 without changes.

### Findings

| ID | Severity | Finding | Owner | Disposition | Retest |
|---|---|---|---|---|---|
| P0-01 | Medium | Signed Phase 8 closeout commit `cc162ad` is not in `origin/main` history | Engineering | Carried its documentation-only closeout record onto the V1 branch; retained `0e7be4d` as the application baseline | Passed by comparison with `cc162ad` before `0a87f14` |
| P0-02 | Medium | Local staging public variables are present but the local service-role variable is absent | Engineering and QA/Security | Use secure staging Preview configuration for privileged upload verification or provision local staging access through an approved secret-handling step before Phase 4 verification | Phase 4 |
| P0-03 | Expected migration work | Current constraints and TypeScript unions do not include `session_material` | Engineering | Add through one new ordered, staging-first migration and focused type changes | Phase 4 |
| P0-04 | Expected authorization work | Protected file delivery currently accepts only `worksheets/` paths | Engineering and QA/Security | Add a separate Session-material prefix while preserving active-account, enrollment, release, RLS, signed-URL and no-store boundaries | Phase 4 |
| P0-05 | Expected UI work | Batch Recordings is a broad Client Component with direct reads and Admin RPC writes | Engineering | Implemented one coherent Session resources surface while preserving recording RPCs; Session-material upload/save/remove use the Phase 4 Admin-authorized Route Handlers | Passed: responsive/accessibility review and sanitized staging lifecycle complete |
| P1-01 | High | Opening the Pilot V1 Preview and signing in returned the reviewer to the historical Phase 2 Preview because staging Supabase Auth still used that URL as its Site URL. The historical deployment is commit `822d053` and does not contain the later recordings route or Pilot V1 UI. | Engineering and Product Owner | Corrected staging Site URL to the Pilot V1 hostname and added its exact callback while preserving localhost, wildcard and historical rollback URLs. Production was untouched. | Passed: Product Owner reached and reviewed the updated Pilot V1 Preview after the correction |
| P1-02 | Medium | The first titled-resource treatment rendered a large white card inside each session row and made simple resource actions visually bulky. | Engineering and Product Owner | Product Owner selected option B: no card or icon tile; show a quiet type/availability overline, use the saved title as the primary button, and retain a compact secondary `Update log` action for worksheets. Committed at `fb18712`. | Passed: Product Owner confirmed the staging treatment looks much better on 2026-08-11 |
| P2-01 | Low | Product Owner requested removal of the visible `Update log` heading and `Record effort only—answers and correctness are not tracked here.` helper line from the manual tracker. | Engineering and Product Owner | Removed both visible lines at `b4cad40` while retaining `Update log` as a screen-reader-only section heading. | Passed: Product Owner explicitly closed Phase 2 on 2026-08-11 |
| P5-01 | Medium | At a 1024px viewport, intrinsic form-control width made Session-material cards overflow their columns and the page by 31px | Engineering | Constrained material cards, children and form inputs to their grid column at `906136a` | Passed: 1024px retest reports page width equal to client width and zero clipped cards |
| P6-01 | Low | The trigger-only `enforce_batch_session_material()` helper retained an unnecessary anonymous `EXECUTE` grant from historical staging defaults | Engineering and QA/Security | Added ordered migration `20260813081141_revoke_session_material_trigger_rpc_access.sql` and applied it to staging only at `1e75935` | Passed: helper is no longer executable by `anon` or `authenticated`; Admin RPC grants and rollback-only authorization probe pass |
| P6-02 | Low | The first logo crop rendered too small in the public navigation and overlapped the login subtitle | Engineering | Tuned the shared logo crop and shell-specific dimensions before committing the amendment | Passed: public and login retests at desktop, supported medium desktop and narrow mobile widths show readable, unclipped branding without logo-caused overflow |
| P7-01 | Medium | Product Owner found the first Preview's square canvases visually pasted onto the public/Login surfaces and the Student-header wordmark too small | Engineering and Product Owner | Removed the white canvas from `6.svg`, used the transparent green artwork across current light surfaces, enlarged artwork within fixed containers and recomposed Login at `7efc6e5` | Passed: Product Owner confirmed the revised Preview is working on 13 August 2026 |
| P7-02 | Product decision | Product Owner requested removal of `This week`, no repeated weekly schedule/dates/full resource list, and tomorrow's pre-read inside Recommended reading | Product Owner and Engineering | Removed the standalone section, retained the automatically opened Timeline as the full schedule/resource surface, moved the unchanged one-day-before pre-read prompt into Recommended reading and kept Recommended practice separate at `8fb7cf6` | Passed: automated recommendation fixtures and local gates pass; Product Owner confirmed the revised Preview is working on 13 August 2026 |
| P7-03 | Low | Course loading and the browser tab retained the legacy `A` mark | Engineering and Product Owner | Replaced loading with the Ace Club wordmark, removed the legacy app favicon and added a compact Ace Club spade metadata icon at `8fb7cf6` | Passed: local icon route/head metadata pass and Product Owner confirmed the revised Preview is working on 13 August 2026 |
| P7-04 | Low | Same-commit Chrome binary-upload replay was unavailable because the reviewer's browser extension lacks file-URL access | QA/Security environment owner | Carried forward the sanitized Phase 5 create/rename/replace/remove lifecycle after confirming no Admin resource/API/path implementation changed through `8fb7cf6`; current controls and blank-upload validation pass | Passed by unchanged-code carry-forward; enable the extension permission only if an additional binary replay is desired |

Severity rules:

- **Critical:** privacy/security exposure, unauthorized access, data loss or complete service failure; stop work and do not promote.
- **High:** required journey blocked without a safe workaround; fix before Production.
- **Medium:** material friction with a workaround; Product Owner decides fix or deferral.
- **Low:** non-blocking polish; may be assigned to a later version.

### Handoff checkpoint

- Current branch: `codex/pilot-v1`, created from and still based on `origin/main` application commit `0e7be4d`.
- Current Phase 3 application commit: `7db4359` — complete worksheet and pre-read recommendations with focused fixtures. Phase 3 is accepted and is the Phase 4 application baseline.
- Current Phase 4 implementation commit: `1a746ae` — ordered migration, Admin-authorized signed upload and management routes, protected delivery extension, focused path tests and rollback-only staging authorization probe.
- Current Phase 5 implementation commit: `bb9aaa5` — coherent Admin recording/Session-material management, Student resource surfaces, protected PDF reading and independent Recommended reading with focused fixtures.
- Current Phase 5 responsive-fix commit: `906136a` — prevents intrinsic form widths from overflowing Session-material cards at the supported medium desktop width.
- Current Phase 6 tested commit: `1e75935` — adds the staging-first least-privilege migration after the complete integrated gate set.
- Current logo-amendment application commit: `f822f17` — adds the shared component and applies supplied `public/5.svg` and `public/6.svg` variants to the public, login, Student and Admin shells.
- Current Phase 7 refinement commit: `7efc6e5` — transparent green canvas treatment, larger shell artwork, revised Login composition and updated Phase 7 logo criteria/evidence.
- Current recommendation/identity commit: `8fb7cf6` — removes `This week`, moves tomorrow's pre-read into Recommended reading, replaces the loading mark and installs the Ace Club spade tab icon.
- Local state: Application remains committed and pushed at `8fb7cf6`; Phase 7 Engineering/QA evidence is committed at `b812105`, the Product Owner acceptance decision is committed at `fa6b67e`, the prior handoff tip is `c54391c`, and the documentation-only Production plan is the current branch-tip change.
- Uncommitted state after Production-plan commit: None; no application, migration or unrelated workspace file is modified.
- Pushed state at transfer: The accepted application, Phase 7 evidence and decision, prior handoff synchronization, and the documentation-only Production-plan change are pushed to `origin/codex/pilot-v1`.
- Staging migration state: `20260811170000_add_batch_session_materials.sql` and `20260813081141_revoke_session_material_trigger_rpc_access.sql` are applied and recorded in the staging migration ledger. The repeated rollback-only authorization probe passed and left zero probe courses or Session-material rows.
- Preview verification state: Vercel reports immutable commit `8fb7cf6` successful at `https://ace-club-2w3ekxg2n-theadmitco-techs-projects.vercel.app`. Recommendation tests pass 7/7, protected-path tests pass 4/4, targeted lint, TypeScript and Production build pass, and the repeated rollback-only staging probe passes with zero residue. Signed-in Admin/Student, tracker, role-routing and responsive checks pass as recorded in the Phase 7 evidence.
- Known blockers: None for release planning. Chrome binary upload replay was limited by the reviewer's extension permission; the unchanged sanitized Phase 5 lifecycle and Phase 6 diff/integration evidence carry that gate.
- Production state: Untouched. Pilot V1 is accepted for Production planning, but promotion is not authorized.
- Exact next action: Review the conditional Production release plan and run its read-only verification; then obtain a separate explicit Product Owner instruction before the isolated-checkout tracked push of exactly the two Pilot V1 migrations, merge, deployment, environment change or live-data mutation. Do not act on the superseded weekly-schedule migration.

## How to pause and resume safely

Before pausing, update the active version section with:

- current V1 phase, status, owner and exit-criteria state;
- branch and exact commit;
- committed, uncommitted, pushed and deployed state;
- migrations created and the environments where each was applied;
- latest Preview and verification result;
- open findings and decisions;
- any Product Owner task requiring signed-in access; and
- one exact next action.

If the phase created a new durable file, also update the active document register and, when required for safe continuation, the Authority and required reading list, Exact resume instruction and `docs/README.md`. The handoff is not current until those incoming links exist.

Do not paste secrets, private Student data, long raw logs or authentication links. Store sanitized evidence in the relevant evidence folder and link it here.

Append a new version section only when the next version begins. Preserve accepted version sections as historical snapshots; correct later changes through a dated amendment or the next version rather than rewriting accepted evidence.
