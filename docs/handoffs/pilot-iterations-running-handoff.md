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
5. For Pilot V1, the [Product Review and Acceptance Criteria](../pilot-v1/acceptance-criteria.md), [phase-wise implementation plan](../pilot-v1/implementation-plan.md), [Phase 0 readiness record](../pilot-v1/phase-0-readiness.md), [Phase 5 staging Session-resource lifecycle evidence](../pilot-v1/evidence/phase-5-staging-session-resource-lifecycle-2026-08-13.md), [Phase 6 integrated verification evidence](../pilot-v1/evidence/phase-6-integrated-verification-2026-08-13.md), and the current phase's linked verification probe or evidence, including unchecked exit criteria and Product Owner notes.
6. The [MVP acceptance criteria](../../instruction/Ace_Club_LMS_MVP_Acceptance_Criteria.md), limited to the journeys affected by the proposed version.
7. The completion record in the [product roadmap](../../instruction/Ace_Club_LMS_Product_Roadmap.md) and any roadmap requirement affected by the version.
8. The [Phase 8 closeout and exceptions](../phase-8/README.md), [closeout checklist](../phase-8/manual-verification-checklist.md), and [operational closeout evidence](../phase-8/evidence/operational-closeout-2026-08-10.md).
9. For the shipped Admin/Student tracker boundary, the [Phase 7 status](../phase-7/README.md), [Phase 7 checklist](../phase-7/manual-verification-checklist.md), [staging evidence](../phase-7/evidence/manual-staging-verification-2026-08-03.md), and [Production rollout evidence](../phase-7/evidence/production-rollout-2026-08-03.md).
10. For the shipped Student tracker contract, the [Phase 6 status](../phase-6/README.md), [Phase 6 checklist](../phase-6/manual-verification-checklist.md), [staging evidence](../phase-6/evidence/manual-staging-verification-2026-08-03.md), and [Production rollout evidence](../phase-6/evidence/production-rollout-2026-08-03.md).
11. For the Student course experience and batch-specific recordings, the [Phase 5 status](../phase-5/README.md), [foundation plan](../phase-5/student-experience-foundation-plan.md), [decision summary](../phase-5/student-experience-foundation.md), [UI state and content matrix](../phase-5/ui-state-and-content-matrix.md), and [Production rollout evidence](../phase-5/evidence/production-rollout-2026-08-03.md).
12. For curriculum and release behavior, the [approved revised course structure](../phase-3/revised-course-structure.md), [cohort schedule and material-sync decision](../decisions/adr-0002-cohort-schedule-and-material-sync.md), and [weekly course schedule decision](../decisions/adr-0003-weekly-course-schedule.md).
13. The [documentation index](../README.md), [current code landscape and cleanup plan](../development/current-code-landscape-and-cleanup-plan.md), [document conventions](../governance/document-conventions.md), and [coding and release rules](../development/coding-rules.md).
14. Inspect current Git status and recent commits, fetch the current remote baseline read-only, and confirm the pilot version starts from updated `origin/main`.
15. Before changing Next.js code, read the relevant Next.js 16 guide under `node_modules/next/dist/docs/`, then inspect only the implementation files relevant to the selected changes.

Do not reread every historical evidence file by default. The list above carries forward every current boundary named by the final Phase 7/Phase 8 handoff while routing work to the smallest authoritative files. Load additional historical evidence only when a proposed change touches that boundary or newer evidence contradicts it.

## Exact resume instruction

Use the following instruction to start or continue a pilot version:

> Continue Ace Club LMS from `docs/handoffs/pilot-iterations-running-handoff.md`. Treat it as the single bootstrap file. Begin Pilot V1 Phase 7 — staging acceptance and version decision — on `codex/pilot-v1` after completed Phase 6 tested commit `1e75935` and closeout commit `506969d`; Phases 1–6 are complete and must not be repeated. Follow this file's Authority and required reading list, including `docs/pilot-v1/acceptance-criteria.md`, `docs/pilot-v1/implementation-plan.md`, `docs/pilot-v1/phase-0-readiness.md`, `docs/pilot-v1/phase-4-staging-authorization-probe.sql`, `docs/pilot-v1/evidence/phase-4-staging-migration-and-authorization-2026-08-11.md`, `docs/pilot-v1/evidence/phase-4-preview-route-lifecycle-2026-08-11.md`, `docs/pilot-v1/evidence/phase-5-staging-session-resource-lifecycle-2026-08-13.md`, `docs/pilot-v1/evidence/phase-6-integrated-verification-2026-08-13.md`, the signed Phase 8 closeout, affected MVP criteria and product-roadmap requirements, shipped Phase 5–7 boundaries, curriculum decisions, documentation rules and coding rules. Inspect Git status and recent commits, fetch the remote baseline read-only, verify the recorded Phase 6 final state, and continue only from its exact next action. Use the approved staging Admin and Student fixtures to run the Phase 7 manual acceptance journeys against immutable Preview commit `1e75935`, classify every finding, and obtain an explicit Product Owner version decision. Preserve staging/Production separation, Google-only controlled access, server-side authorization, RLS, release protection, Student tracker ownership, read-only Admin progress, batch-specific recordings and private file delivery. Do not merge, deploy to Production or run Production SQL without explicit Product Owner approval. After Phase 7, update this handoff with exact commits, local/pushed state, migrations and environments, checks, findings, the Product Owner decision and one exact next action.

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
| Pilot V1 | Improve titled resources, worksheet/log usability, recommendations and batch-specific Session reading | `codex/pilot-v1` | Staging verification | Phases 1–3 accepted; Phases 4–6 engineering, security and integrated gates complete | Not approved |

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

When a manual verification checklist, evidence record, decision, or other durable V1 file is created, add a row here before pausing. If the file is required to continue safely, also add it to the Authority and required reading list and the Exact resume instruction.

### Outcome sought

Make Student resources identifiable and usable during the live pilot, show every current worksheet and class-specific reading recommendation, and let Admins safely manage private batch-session reading beside recordings without changing another batch or Production.

### Included changes

1. Replace generic resource controls with titled resource cards and pair each worksheet with its canonical log actions.
2. Give the PDF and manual tracker independent scrolling in the supported desktop side-by-side workspace.
3. Recommend every released worksheet in the active same-section set while preserving seven-day pre-read release and one-day-before recommendation behavior.
4. Add private batch- and session-specific Session materials beside recordings, expose them in the Student journey, and recommend released reading until a later same-section replacement releases.

### V1 phase execution register

| V1 phase | Outcome | Status | Owner | Start/end commit | Checks or evidence | Next action |
|---|---|---|---|---|---|---|
| Phase 0 | Baseline, branch, environment and implementation readiness | Complete | Engineering | `0e7be4d` / `0a87f14` | [Phase 0 readiness record](../pilot-v1/phase-0-readiness.md); all exit criteria pass | Transfer to Phase 1 |
| Phase 1 | Shared titled resource-card system | Complete | Engineering and Product Owner | `d4ee94d` / `fb18712` | All local gates pass; staging Auth correction and option B Preview accepted by Product Owner on 2026-08-11 | Transfer to Phase 2 |
| Phase 2 | Independent PDF/tracker scrolling | Complete | Engineering and Product Owner | `9655a85` / `b4cad40` | All eight exit criteria pass; updated Preview passed Product Owner review on 2026-08-11 | Transfer to Phase 3 |
| Phase 3 | Complete worksheet and pre-read recommendations | Complete | Engineering and Product Owner | `b4cad40` / `7db4359` | Nine exit criteria pass; Vercel and signed-in runtime checks pass; Product Owner accepted staging on 2026-08-11 | Transfer to Phase 4 |
| Phase 4 | Session-material data, storage and authorization | Complete | Engineering and QA/Security | `746625f` / `1a746ae` | Local gates, staging migration/ledger/probe, Vercel deployment and sanitized privileged route lifecycle pass | Transfer to Phase 5 |
| Phase 5 | Session resources UI and Student Recommended reading | Complete | Engineering and QA/Security | `aef8b81` / `e80abdc` | All nine exit criteria pass; [sanitized staging lifecycle](../pilot-v1/evidence/phase-5-staging-session-resource-lifecycle-2026-08-13.md) covers create, locked/released, protected open, rename, replace, confirmed removal and zero residue | Transfer to Phase 6 |
| Phase 6 | Integrated local checks and staging Preview | Complete | Engineering and QA/Security | `e80abdc` / `1e75935` | All eight exit criteria pass; [integrated evidence](../pilot-v1/evidence/phase-6-integrated-verification-2026-08-13.md) records the complete local, staging migration, authorization and immutable Preview gates | Transfer to Phase 7 |
| Phase 7 | Staging acceptance and version decision | Not started | Product Owner, Engineering and QA/Security | — | Phase 6 entry gate passes | Begin the manual acceptance journeys on immutable Preview commit `1e75935` |

Allowed V1 phase statuses: `Not started`, `In progress`, `Exit review`, `Complete`, `Paused`, or `Blocked`.

### Current V1 phase checkpoint

- Current V1 phase: Phase 7 — staging acceptance and version decision, not started after Phase 6 completed at tested commit `1e75935`.
- Phase status: Phase 6 is complete with all eight exit criteria checked from the [integrated verification evidence](../pilot-v1/evidence/phase-6-integrated-verification-2026-08-13.md). Phase 7 manual acceptance and the Product Owner version decision remain.
- Current owner: Product Owner, Engineering and QA/Security for Phase 7.
- Application baseline: Phase 5 tested application commit `538fa86`; Phase 6 adds only the ordered least-privilege migration at `1e75935` and does not change the application bundle.
- Git baseline: `origin/main` remained at `0e7be4d40f7a47d34fe1c9441ffa5834eaf12ef2`; no integration merge was required. The branch is pushed through the Phase 6 tested commit and will be pushed through closeout commit `506969d`.
- Entry criteria state: Passed. The full V1 diff and migrations are reviewed, changed-file secret/privacy checks pass, recommendation fixtures pass 7/7, protected-path fixtures pass 4/4, all V1-touched TypeScript/TSX files lint cleanly, TypeScript and the Next.js Production build pass, and repository-wide lint remains exactly 22 errors and 3 warnings in untouched legacy files.
- Migrations: `20260811170000_add_batch_session_materials.sql` and `20260813081141_revoke_session_material_trigger_rpc_access.sql` are applied and ledgered on staging only. The rollback-only authorization probe passes after both migrations with zero residue. Neither migration is applied to Production.
- Preview: Immutable Vercel Preview commit `1e75935` is Ready at `https://ace-club-7x8qjkpkz-theadmitco-techs-projects.vercel.app`. Its successful Vercel build passed the repository Preview guard that requires staging configuration.
- Findings: P6-01 was Low and is fixed. No critical or high finding is open. The intentionally authenticated Admin save/remove RPCs retain generic Supabase advisor warnings but deny anonymous execution, use fixed search paths, enforce active Admin authorization internally and pass the rollback-only probe.
- Fixtures: The approved anonymized staging Admin and enrolled staging Student used for the Phase 5 lifecycle remain available for Phase 7. No identity or authentication artifact is stored in Git.
- Production state: Untouched and not approved. Pilot V1 remains staging-only.
- Exact next action: The Product Owner, Engineering and QA/Security owners begin Phase 7 on immutable Preview commit `1e75935`, run the ordered Admin, Student, cross-batch, release, authorization, tracker and private-file journeys in the implementation plan, classify every finding, and record an explicit V1 staging decision without changing Production.

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
- Staging application result: Phases 1–3 accepted; Phases 4–6 engineering, migration, authorization, Preview lifecycle and integrated gates complete; Phase 7 manual acceptance remains.
- Production application: Not approved.
- Rollback or compatibility requirement: Existing live batches and reusable Master pre-read/worksheet synchronization must remain compatible and untouched; V1 rows must be independently removable without changing another batch.

### Verification

- Local lint/build: Integrated recommendation regressions pass 7/7 and protected file/path fixtures pass 4/4; all V1-touched TypeScript/TSX files pass targeted ESLint, `npx tsc --noEmit` passes, and the Next.js 16 Production build passes. Repository-wide lint remains at the unchanged unrelated baseline of 22 errors and 3 warnings.
- Vercel Preview commit and URL: Phase 6 tested commit `1e75935`; `https://ace-club-7x8qjkpkz-theadmitco-techs-projects.vercel.app` (Vercel GitHub deployment succeeded and the Preview guard confirmed staging configuration without exposing values).
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
- Local changes: Phase 6 evidence, checked exit criteria and this transfer are committed at `506969d`; this final checkpoint synchronization is documentation-only.
- Pushed state at transfer: Phase 6 tested commit `1e75935` and closeout commit `506969d` are pushed to `origin/codex/pilot-v1`; the immutable tested Preview succeeded.
- Staging migration state: `20260811170000_add_batch_session_materials.sql` and `20260813081141_revoke_session_material_trigger_rpc_access.sql` are applied and recorded in the staging migration ledger. The repeated rollback-only authorization probe passed and left zero probe courses or Session-material rows.
- Preview verification state: Vercel reports immutable commit `1e75935` successful at `https://ace-club-7x8qjkpkz-theadmitco-techs-projects.vercel.app`. The successful build passed the Preview staging guard. The earlier signed-in Phase 5 lifecycle remains the account-dependent entry evidence for Phase 7.
- Known blockers: None for Phase 7 entry. The local service-role variable remains intentionally absent; privileged lifecycle verification uses the approved secure staging-backed Preview.
- Production state: Untouched; V1 is not approved for Production.
- Exact next action: Follow the Current V1 phase checkpoint above and begin Phase 7 manual staging acceptance without deploying or mutating Production.

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
