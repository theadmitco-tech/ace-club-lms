# Ace Club LMS — Pilot Iterations Running Handoff

Status: Active
Owner: Product owner and Engineering
Last updated: 11 August 2026

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
5. For Pilot V1, the [Product Review and Acceptance Criteria](../pilot-v1/acceptance-criteria.md), [phase-wise implementation plan](../pilot-v1/implementation-plan.md), [Phase 0 readiness record](../pilot-v1/phase-0-readiness.md), and the current phase's linked verification probe or evidence, including unchecked exit criteria and Product Owner notes.
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

> Continue Ace Club LMS from `docs/handoffs/pilot-iterations-running-handoff.md`. Treat it as the single bootstrap file. Continue Pilot V1 Phase 4 — Session-material data, storage and authorization — on `codex/pilot-v1` after accepted Phase 3 application commit `7db4359`; Phases 1–3 are complete and must not be repeated. Follow this file's Authority and required reading list, including `docs/pilot-v1/acceptance-criteria.md`, `docs/pilot-v1/implementation-plan.md`, `docs/pilot-v1/phase-0-readiness.md`, `docs/pilot-v1/phase-4-staging-authorization-probe.sql`, `docs/pilot-v1/evidence/phase-4-staging-migration-and-authorization-2026-08-11.md`, the signed Phase 8 closeout, affected MVP criteria and product-roadmap requirements, shipped Phase 5–7 boundaries, curriculum decisions, documentation rules and coding rules. Read the active V1 phase register and current phase checkpoint below. Inspect Git status and recent commits, fetch the remote baseline read-only, verify the recorded Phase 4 implementation state, and continue only from its exact next action. Preserve staging/Production separation, Google-only controlled access, server-side authorization, RLS, release protection, Student tracker ownership, read-only Admin progress, batch-specific recordings and private file delivery. Keep implementation and SQL on staging until verification passes, and do not merge, deploy or run Production SQL without explicit Product Owner approval. Phase 4 must resolve the secure staging service-role verification prerequisite without committing or exposing secrets. After every V1 phase, update this handoff with phase status, owner, exact commit, local/pushed state, migrations and environments, checks, findings, new durable files and one exact next action. Add every new durable file to this handoff's active document register and required reading before pausing or transferring ownership.

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
| Pilot V1 | Improve titled resources, worksheet/log usability, recommendations and batch-specific Session reading | `codex/pilot-v1` | Active | Phases 1–3 accepted; Phase 4 ready to start | Not approved |

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
| Phase 4 | Session-material data, storage and authorization | Exit review | Engineering and QA/Security | `746625f` / `1a746ae` | Implementation and local gates pass; staging migration, ledger, rollback-only authorization probe and sanitized post-check pass | Push Phase 4 to the staging-backed Preview and verify privileged upload/protected read; do not start Phase 5 |
| Phase 5 | Session resources UI and Student Recommended reading | Not started | Engineering | — | — | Wait for Phase 4 exit |
| Phase 6 | Integrated local checks and staging Preview | Not started | Engineering and QA/Security | — | — | Wait for Phase 5 exit |
| Phase 7 | Staging acceptance and version decision | Not started | Product Owner, Engineering and QA/Security | — | — | Wait for Phase 6 exit |

Allowed V1 phase statuses: `Not started`, `In progress`, `Exit review`, `Complete`, `Paused`, or `Blocked`.

### Current V1 phase checkpoint

- Current V1 phase: Phase 4 — Session-material data, storage and authorization.
- Phase status: Exit review. The focused data, storage and authorization implementation is committed; staging migration/probe and privileged upload verification remain before Phase 4 can be marked complete. Phases 1–3 remain complete and accepted.
- Current owner: Engineering and QA/Security.
- Phase 4 application baseline: `7db43596eea5efb58ab9d99a7d77a799339cdf72`; `origin/codex/pilot-v1` includes the Phase 3 application, engineering closeout and staging runtime checkpoint through `876fe8b`, and the working tree was clean before this acceptance transfer update.
- Baseline: The branch remains based on `origin/main` application commit `0e7be4d40f7a47d34fe1c9441ffa5834eaf12ef2`.
- Entry criteria state: Passed. All nine Phase 3 exit criteria are checked from controlled fixtures, targeted lint, TypeScript, build, focused commit and preserved authorization/release boundaries; the Vercel Preview and signed-in Student runtime checks passed, and the Product Owner accepted staging on 2026-08-11.
- Phase 4 intended outcome: Add the safe batch-only data, private storage and authorization foundation for Session materials without changing reusable Master content, another batch or Production.
- Required Phase 4 verification: Static review and the staging rollback-only Admin, Student, signed-out, inactive, pre-release, unpublished and cross-batch probe pass. The privileged signed upload and protected read path still require the secure staging Preview configuration.
- Migrations: `20260811170000_add_batch_session_materials.sql` is applied to staging and recorded in its migration ledger as version `20260811170000`. It has not been applied to Production.
- Preview: Phase 3 passed on the stable staging alias `https://ace-club-lms-git-codex-pilot-v1-theadmitco-techs-projects.vercel.app`; Product Owner acceptance was recorded on 2026-08-11.
- Open findings: P0-03 and the database/RLS portion of P0-04 pass on staging. P0-02 remains only for the Preview route check because the local service-role variable is absent; use the existing secure Preview secret after pushing, without exposing it. P0-05 belongs to Phase 5. P1-01, P1-02 and P2-01 passed.
- Production state: Untouched and not approved. Pilot V1 remains staging-only.
- Exact next action: Commit and push the sanitized staging evidence to `codex/pilot-v1`, wait for its staging-backed Vercel Preview, then verify the Admin-authorized signed-upload endpoint and protected Student delivery without exposing a secret; do not start Phase 5 or run Production SQL.

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
| V1-04 | Admins privately manage batch-session reading beside recordings; Students receive it after class and under Recommended reading | Invalid uploads, non-Admin writes, pre-release reads, cross-batch propagation and stale replacements are prevented | Approved for planning |

### Database and environment impact

- Database change required: Expected for secure batch-session material management, batch-specific synchronization exclusions and server/database authorization; final shape remains to be assessed against the current schema.
- Ordered migration: None created; any migration will be new, ordered and staging-first.
- Staging application result: Phases 1–3 accepted; Phase 4 not started.
- Production application: Not approved.
- Rollback or compatibility requirement: Existing live batches and reusable Master pre-read/worksheet synchronization must remain compatible and untouched; V1 rows must be independently removable without changing another batch.

### Verification

- Local lint/build: Phase 3 recommendation fixtures pass 5/5; targeted ESLint, `tsc --noEmit`, and the Next.js Production build pass. Repository-wide lint still reports the unchanged legacy baseline of 22 errors and 3 warnings in untouched Admin, registration, landing-page and storage files; Phase 3 files have no lint finding.
- Vercel Preview commit and URL: Application commit `7db4359` plus closeout `78dc800`; `https://ace-club-lms-git-codex-pilot-v1-theadmitco-techs-projects.vercel.app` (Vercel GitHub status succeeded; public root and authenticated Student dashboard loaded without browser console warnings or errors).
- Staging accounts and fixtures: Product Owner authenticated staging session from earlier phase reviews; Phase 3 pure-logic fixtures are committed at `scripts/student-timeline-recommendations.test.mjs` and contain no private Student data.
- Affected journey result: The authenticated staging Student dashboard loaded Recommended practice from the latest released worksheet sets present in that account. The account does not contain every multiple-sibling/replacement edge case, so those remain evidenced by the committed 5/5 controlled fixtures. Product Owner completed review without requesting changes on 2026-08-11.
- Authorization/privacy/release regression: Passed for the Phase 3 scope from the reviewed diff and inherited RLS/direct-URL evidence. Recommendation selection still receives only the authenticated Student's selected-course, published-session timeline payload; it filters on server-calculated material availability, and no RPC, RLS, direct material route, release timestamp, tracker ownership or migration changed.
- Product Owner staging acceptance: Phases 1–3 passed on 2026-08-11. The Product Owner completed the Phase 3 staging review and requested transfer to Phase 4 without changes.

### Findings

| ID | Severity | Finding | Owner | Disposition | Retest |
|---|---|---|---|---|---|
| P0-01 | Medium | Signed Phase 8 closeout commit `cc162ad` is not in `origin/main` history | Engineering | Carried its documentation-only closeout record onto the V1 branch; retained `0e7be4d` as the application baseline | Passed by comparison with `cc162ad` before `0a87f14` |
| P0-02 | Medium | Local staging public variables are present but the local service-role variable is absent | Engineering and QA/Security | Use secure staging Preview configuration for privileged upload verification or provision local staging access through an approved secret-handling step before Phase 4 verification | Phase 4 |
| P0-03 | Expected migration work | Current constraints and TypeScript unions do not include `session_material` | Engineering | Add through one new ordered, staging-first migration and focused type changes | Phase 4 |
| P0-04 | Expected authorization work | Protected file delivery currently accepts only `worksheets/` paths | Engineering and QA/Security | Add a separate Session-material prefix while preserving active-account, enrollment, release, RLS, signed-URL and no-store boundaries | Phase 4 |
| P0-05 | Expected UI work | Batch Recordings is a broad Client Component with direct reads and Admin RPC writes | Engineering | Preserve Admin-only RPC authorization and use an authorized Route Handler for signed uploads | Phase 5 |
| P1-01 | High | Opening the Pilot V1 Preview and signing in returned the reviewer to the historical Phase 2 Preview because staging Supabase Auth still used that URL as its Site URL. The historical deployment is commit `822d053` and does not contain the later recordings route or Pilot V1 UI. | Engineering and Product Owner | Corrected staging Site URL to the Pilot V1 hostname and added its exact callback while preserving localhost, wildcard and historical rollback URLs. Production was untouched. | Passed: Product Owner reached and reviewed the updated Pilot V1 Preview after the correction |
| P1-02 | Medium | The first titled-resource treatment rendered a large white card inside each session row and made simple resource actions visually bulky. | Engineering and Product Owner | Product Owner selected option B: no card or icon tile; show a quiet type/availability overline, use the saved title as the primary button, and retain a compact secondary `Update log` action for worksheets. Committed at `fb18712`. | Passed: Product Owner confirmed the staging treatment looks much better on 2026-08-11 |
| P2-01 | Low | Product Owner requested removal of the visible `Update log` heading and `Record effort only—answers and correctness are not tracked here.` helper line from the manual tracker. | Engineering and Product Owner | Removed both visible lines at `b4cad40` while retaining `Update log` as a screen-reader-only section heading. | Passed: Product Owner explicitly closed Phase 2 on 2026-08-11 |

Severity rules:

- **Critical:** privacy/security exposure, unauthorized access, data loss or complete service failure; stop work and do not promote.
- **High:** required journey blocked without a safe workaround; fix before Production.
- **Medium:** material friction with a workaround; Product Owner decides fix or deferral.
- **Low:** non-blocking polish; may be assigned to a later version.

### Handoff checkpoint

- Current branch: `codex/pilot-v1`, created from and still based on `origin/main` application commit `0e7be4d`.
- Current Phase 3 application commit: `7db4359` — complete worksheet and pre-read recommendations with focused fixtures. Phase 3 is accepted and is the Phase 4 application baseline.
- Current Phase 4 implementation commit: `1a746ae` — ordered migration, Admin-authorized signed upload and management routes, protected delivery extension, focused path tests and rollback-only staging authorization probe.
- Local changes: Phase 4 implementation is committed at `1a746ae`; this exit-review checkpoint is documentation-only.
- Pushed state at transfer: `origin/codex/pilot-v1` remains at `746625f`. Phase 4 commit `1a746ae` is local and has not been pushed or deployed.
- Staging migration state: `20260811170000_add_batch_session_materials.sql` is applied and recorded in the staging migration ledger. The rollback-only authorization probe passed and left zero probe courses or Session-material rows.
- Preview verification state: The stable alias still serves the accepted Phase 3 application. No Phase 4 Preview has been created and no Phase 4 privileged route has been exercised.
- Known blockers: The local service-role variable remains absent. Complete the privileged route check through the secure staging-backed Preview after pushing; no secret was copied or exposed.
- Production state: Untouched; V1 is not approved for Production.
- Exact next action: Follow the Current V1 phase checkpoint above and finish Phase 4 exit review from implementation commit `1a746ae`; do not start Phase 5.

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
