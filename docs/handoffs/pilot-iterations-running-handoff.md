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
5. For Pilot V1, the [Product Review and Acceptance Criteria](../pilot-v1/acceptance-criteria.md), [phase-wise implementation plan](../pilot-v1/implementation-plan.md), and [Phase 0 readiness record](../pilot-v1/phase-0-readiness.md), including the current phase's unchecked exit criteria and Product Owner notes.
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

> Continue Ace Club LMS from `docs/handoffs/pilot-iterations-running-handoff.md`. Treat it as the single bootstrap file. Follow its Authority and required reading list, including `docs/pilot-v1/acceptance-criteria.md`, `docs/pilot-v1/implementation-plan.md`, `docs/pilot-v1/phase-0-readiness.md`, the signed Phase 8 closeout, affected MVP criteria and product-roadmap requirements, shipped Phase 5–7 boundaries, curriculum decisions, documentation rules and coding rules. Read the active V1 phase register and current phase checkpoint below. Inspect Git status and recent commits, fetch the remote baseline read-only, and verify the recorded branch/commit before acting. Do not repeat a completed phase or start the next phase until the previous phase's exit criteria and handoff fields are complete. Preserve staging/Production separation, Google-only controlled access, server-side authorization, RLS, release protection, Student tracker ownership, read-only Admin progress, batch-specific recordings and private file delivery. Keep implementation and SQL on staging until verification passes, and do not merge, deploy or run Production SQL without explicit Product Owner approval. After every V1 phase, update this handoff with phase status, owner, exact commit, local/pushed state, migrations and environments, checks, findings, new durable files and one exact next action. Add every new durable file to this handoff's active document register and required reading before pausing or transferring ownership.

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
| Pilot V1 | Improve titled resources, worksheet/log usability, recommendations and batch-specific Session reading | `codex/pilot-v1` | Active | Phase 0 passed locally | Not approved |

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
| Phase 1 | Shared titled resource-card system | Exit review | Engineering | `d4ee94d` / `fb18712` | Local gates pass; P1-01 staging Auth is corrected; P1-02 option B is committed | Push the updated checkpoint and review the new Preview |
| Phase 2 | Independent PDF/tracker scrolling | Not started | Engineering | — | — | Wait for Phase 1 exit |
| Phase 3 | Complete worksheet and pre-read recommendations | Not started | Engineering | — | — | Wait for Phase 2 exit |
| Phase 4 | Session-material data, storage and authorization | Not started | Engineering and QA/Security | — | — | Wait for Phase 3 exit |
| Phase 5 | Session resources UI and Student Recommended reading | Not started | Engineering | — | — | Wait for Phase 4 exit |
| Phase 6 | Integrated local checks and staging Preview | Not started | Engineering and QA/Security | — | — | Wait for Phase 5 exit |
| Phase 7 | Staging acceptance and version decision | Not started | Product Owner, Engineering and QA/Security | — | — | Wait for Phase 6 exit |

Allowed V1 phase statuses: `Not started`, `In progress`, `Exit review`, `Complete`, `Paused`, or `Blocked`.

### Current V1 phase checkpoint

- Current V1 phase: Phase 1 — Shared titled resource-card system.
- Phase status: Exit review; all seven original local exit criteria pass, P1-01 is corrected, and the Product Owner-selected option B button-only refinement is committed at `fb18712` after targeted lint, TypeScript and build passed. Updated staging review remains pending.
- Current owner: Engineering.
- Start commit: `d4ee94d39a39b34fd6294abecedc87b1b694dbc6`; freshly fetched `origin/main` remains `0e7be4d40f7a47d34fe1c9441ffa5834eaf12ef2`.
- Latest completed commit: `0a87f14a882fbeb823bd9ebb75363e712d9623c4` — Phase 0 documentation and readiness checkpoint.
- Exit criteria state: All seven Phase 1 criteria are checked from local evidence; staging Preview verification is the Product Owner-requested transfer gate.
- Checks/evidence: `git diff --check`, targeted ESLint and `npx tsc --noEmit` pass; Next.js Production build passes; temporary representative browser fixtures verified all planned variants, multiple resources, correct worksheet/log pairing, locked-card link absence, long-title wrapping, visible keyboard focus and zero horizontal overflow at the 200%-zoom-equivalent width. The temporary fixture was removed. Repository-wide lint remains at the signed baseline of 22 errors and 3 warnings with no Phase 1-file finding.
- Migrations: None created or applied.
- Preview: Vercel deployment for pushed checkpoint commit `7f953ebddef11d2a31569e7f9af22acfbd2cfa78` is Ready at `https://ace-club-lms-git-codex-pilot-v1-theadmitco-techs-projects.vercel.app`; its build log confirms the `codex/pilot-v1` branch and reports that required Preview variables are present and environment URLs are correctly separated.
- Findings: P0-01 through P0-05 remain unchanged. P1-01 records the corrected staging OAuth redirect mismatch. P1-02 records the rejected bulky card treatment and selected button-only replacement.
- New durable files registered: `docs/pilot-v1/acceptance-criteria.md`, `docs/pilot-v1/implementation-plan.md`, and `docs/pilot-v1/phase-0-readiness.md`.
- Exact next action: Commit this checkpoint, push `codex/pilot-v1`, verify the updated staging Preview and corrected login flow, then resume Product Owner review. Do not start Phase 2.

### Explicit exclusions

- No change outside the listed V1 scope.
- No destructive database cleanup.
- No Production SQL, data mutation, deployment or environment change during implementation and staging verification.
- No weakening of the non-regression boundaries above.

### Acceptance criteria

The binding detailed criteria are in [Pilot V1 acceptance criteria](../pilot-v1/acceptance-criteria.md). The proposed delivery sequence and per-phase exit gates are in the [Pilot V1 implementation plan](../pilot-v1/implementation-plan.md).

| Change | Expected user outcome | Failure and permission checks | Status |
|---|---|---|---|
| V1-01 | Students distinguish every resource by type, title and accessible visual variant, with worksheet and log actions kept together | Locked/missing resources, long titles, keyboard focus and canonical destinations remain safe | Approved for planning |
| V1-02 | Students scroll the PDF and tracker independently on desktop without losing either position | Stacked layouts, keyboard access, failure isolation and saved tracker state remain safe | Approved for planning |
| V1-03 | Every worksheet in the active same-section set is recommended and tomorrow's pre-read is highlighted without changing its release | Empty/partial sets, duplicates, cross-batch access and direct unreleased URLs are denied safely | Approved for planning |
| V1-04 | Admins privately manage batch-session reading beside recordings; Students receive it after class and under Recommended reading | Invalid uploads, non-Admin writes, pre-release reads, cross-batch propagation and stale replacements are prevented | Approved for planning |

### Database and environment impact

- Database change required: Expected for secure batch-session material management, batch-specific synchronization exclusions and server/database authorization; final shape remains to be assessed against the current schema.
- Ordered migration: None created; any migration will be new, ordered and staging-first.
- Staging application result: Not started.
- Production application: Not approved.
- Rollback or compatibility requirement: Existing live batches and reusable Master pre-read/worksheet synchronization must remain compatible and untouched; V1 rows must be independently removable without changing another batch.

### Verification

- Local lint/build: Phase 1 targeted lint, TypeScript and Production build pass; repository lint remains at the signed 22-error/3-warning baseline with no new Phase 1 finding.
- Vercel Preview commit and URL: `7f953ebddef11d2a31569e7f9af22acfbd2cfa78`; `https://ace-club-lms-git-codex-pilot-v1-theadmitco-techs-projects.vercel.app` (Ready and staging-separation guard passed).
- Staging accounts and fixtures: Not selected.
- Affected journey result: Not started.
- Authorization/privacy/release regression: Not started.
- Product Owner staging acceptance: Not started.

### Findings

| ID | Severity | Finding | Owner | Disposition | Retest |
|---|---|---|---|---|---|
| P0-01 | Medium | Signed Phase 8 closeout commit `cc162ad` is not in `origin/main` history | Engineering | Carried its documentation-only closeout record onto the V1 branch; retained `0e7be4d` as the application baseline | Passed by comparison with `cc162ad` before `0a87f14` |
| P0-02 | Medium | Local staging public variables are present but the local service-role variable is absent | Engineering and QA/Security | Use secure staging Preview configuration for privileged upload verification or provision local staging access through an approved secret-handling step before Phase 4 verification | Phase 4 |
| P0-03 | Expected migration work | Current constraints and TypeScript unions do not include `session_material` | Engineering | Add through one new ordered, staging-first migration and focused type changes | Phase 4 |
| P0-04 | Expected authorization work | Protected file delivery currently accepts only `worksheets/` paths | Engineering and QA/Security | Add a separate Session-material prefix while preserving active-account, enrollment, release, RLS, signed-URL and no-store boundaries | Phase 4 |
| P0-05 | Expected UI work | Batch Recordings is a broad Client Component with direct reads and Admin RPC writes | Engineering | Preserve Admin-only RPC authorization and use an authorized Route Handler for signed uploads | Phase 5 |
| P1-01 | High | Opening the Pilot V1 Preview and signing in returned the reviewer to the historical Phase 2 Preview because staging Supabase Auth still used that URL as its Site URL. The historical deployment is commit `822d053` and does not contain the later recordings route or Pilot V1 UI. | Engineering and Product Owner | Corrected staging Site URL to the Pilot V1 hostname and added its exact callback while preserving localhost, wildcard and historical rollback URLs. Production was untouched. | OAuth request now carries the Pilot V1 `redirect_to`; final account-selection landing and authenticated UI review pending |
| P1-02 | Medium | The first titled-resource treatment rendered a large white card inside each session row and made simple resource actions visually bulky. | Engineering and Product Owner | Product Owner selected option B: no card or icon tile; show a quiet type/availability overline, use the saved title as the primary button, and retain a compact secondary `Update log` action for worksheets. Committed at `fb18712`. | Updated staging Preview pending |

Severity rules:

- **Critical:** privacy/security exposure, unauthorized access, data loss or complete service failure; stop work and do not promote.
- **High:** required journey blocked without a safe workaround; fix before Production.
- **Medium:** material friction with a workaround; Product Owner decides fix or deferral.
- **Low:** non-blocking polish; may be assigned to a later version.

### Handoff checkpoint

- Current branch: `codex/pilot-v1`, created from and still based on `origin/main` application commit `0e7be4d`.
- Current Phase 1 implementation commit: `fb18712` — selected option B compact title-button refinement over the titled-resource foundation. Phase 1 remains in Exit review until the updated staging check is recorded.
- Local changes: Only this updated Phase 1 handoff checkpoint is uncommitted. No migration changes.
- Pushed: Yes. `origin/codex/pilot-v1` is at `7f953ebddef11d2a31569e7f9af22acfbd2cfa78`.
- Staging migration state: No V1 migration applied.
- Preview verification state: V1 Preview for `7f953eb` remains Ready with corrected staging Auth, but it still shows the rejected bulky treatment. The option B update is local and awaits commit/push.
- Known blockers: No remaining configuration blocker for Phase 1. Product Owner account selection and authenticated UI review remain pending. Secure service-role access remains a Phase 4 verification prerequisite.
- Production state: Untouched; V1 is not approved for Production.
- Exact next action: Commit this checkpoint, push the updated branch, verify the new staging deployment and login hostname, then ask the Product Owner to review the affected Student surfaces before Phase 2 begins.

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
