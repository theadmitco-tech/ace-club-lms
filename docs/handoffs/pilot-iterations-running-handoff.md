# Ace Club LMS — Pilot Iterations Running Handoff

Status: Active
Owner: Product owner and Engineering
Last updated: 10 August 2026

## Purpose

Use this document for iterative post-MVP pilot changes after the Phase 8 operational closeout. Keep the main [Ace Club LMS running handoff](ace-club-lms-running-handoff.md) as the signed Phase 0.5–8 history. Record short-lived V1/V2 working state here so future work can resume without rereading every historical phase.

This document coordinates work; it does not authorize a Production change. Every version remains staging-only until its acceptance criteria pass and the Product Owner explicitly approves Production promotion.

## Authority and required reading

When documents conflict, follow the authority order in the [instruction register](../../instruction/README.md).

Before starting or resuming a pilot version, read:

1. [`AGENTS.md`](../../AGENTS.md).
2. The [instruction register](../../instruction/README.md).
3. The latest signed section of the [Ace Club LMS running handoff](ace-club-lms-running-handoff.md), beginning with the Phase 8 closeout.
4. The latest active version section in this document.
5. The [MVP acceptance criteria](../../instruction/Ace_Club_LMS_MVP_Acceptance_Criteria.md), limited to the journeys affected by the proposed version.
6. The completion record in the [product roadmap](../../instruction/Ace_Club_LMS_Product_Roadmap.md) and any roadmap requirement affected by the version.
7. The [Phase 8 closeout and exceptions](../phase-8/README.md), [closeout checklist](../phase-8/manual-verification-checklist.md), and [operational closeout evidence](../phase-8/evidence/operational-closeout-2026-08-10.md).
8. For the shipped Admin/Student tracker boundary, the [Phase 7 status](../phase-7/README.md), [Phase 7 checklist](../phase-7/manual-verification-checklist.md), [staging evidence](../phase-7/evidence/manual-staging-verification-2026-08-03.md), and [Production rollout evidence](../phase-7/evidence/production-rollout-2026-08-03.md).
9. For the shipped Student tracker contract, the [Phase 6 status](../phase-6/README.md), [Phase 6 checklist](../phase-6/manual-verification-checklist.md), [staging evidence](../phase-6/evidence/manual-staging-verification-2026-08-03.md), and [Production rollout evidence](../phase-6/evidence/production-rollout-2026-08-03.md).
10. For the Student course experience and batch-specific recordings, the [Phase 5 status](../phase-5/README.md), [foundation plan](../phase-5/student-experience-foundation-plan.md), [decision summary](../phase-5/student-experience-foundation.md), [UI state and content matrix](../phase-5/ui-state-and-content-matrix.md), and [Production rollout evidence](../phase-5/evidence/production-rollout-2026-08-03.md).
11. For curriculum and release behavior, the [approved revised course structure](../phase-3/revised-course-structure.md), [cohort schedule and material-sync decision](../decisions/adr-0002-cohort-schedule-and-material-sync.md), and [weekly course schedule decision](../decisions/adr-0003-weekly-course-schedule.md).
12. The [documentation index](../README.md), [current code landscape and cleanup plan](../development/current-code-landscape-and-cleanup-plan.md), [document conventions](../governance/document-conventions.md), and [coding and release rules](../development/coding-rules.md).
13. Inspect current Git status and recent commits, fetch the current remote baseline read-only, and confirm the pilot version starts from updated `origin/main`.
14. Before changing Next.js code, read the relevant Next.js 16 guide under `node_modules/next/dist/docs/`, then inspect only the implementation files relevant to the selected changes.

Do not reread every historical evidence file by default. The list above carries forward every current boundary named by the final Phase 7/Phase 8 handoff while routing work to the smallest authoritative files. Load additional historical evidence only when a proposed change touches that boundary or newer evidence contradicts it.

## Exact resume instruction

Use the following instruction to start or continue a pilot version:

> Continue Ace Club LMS from `docs/handoffs/pilot-iterations-running-handoff.md`. Read `AGENTS.md`, `instruction/README.md`, the signed Phase 8 closeout in `docs/handoffs/ace-club-lms-running-handoff.md`, the latest active pilot-version section, the affected MVP acceptance criteria and roadmap requirements, the Phase 8 closeout/checklist/evidence, the Phase 7 and Phase 6 status/checklist/staging/Production evidence, the Phase 5 Student-experience and recording records, the approved curriculum and schedule decisions, `docs/README.md`, the cleanup plan, document conventions and coding rules. Inspect Git status and recent commits, fetch the current remote baseline read-only, and start the version from updated `origin/main` on `codex/pilot-vN`. Preserve staging/Production separation, Google-only controlled access, server-side authorization, RLS, release protection, Student tracker ownership, read-only Admin progress, batch-specific recordings and private worksheet delivery. Define three or four coherent changes and their acceptance criteria before changing code. Keep implementation and SQL on staging until verification passes, and do not merge, deploy or run Production SQL without explicit Product Owner approval. Record branch, commit, migration state, Preview result, findings and one exact next action in the active version section.

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

## Version register

| Version | Objective | Branch | Status | Staging decision | Production decision |
|---|---|---|---|---|---|
| Pilot V1 | To be defined | `codex/pilot-v1` | Proposed | Not started | Not approved |

Allowed version statuses: `Proposed`, `Active`, `Staging verification`, `Accepted for Production`, `Deployed`, `Paused`, or `Superseded`.

## Active version — Pilot V1

### Outcome sought

To be defined by the Product Owner before implementation.

### Included changes

1. To be defined.
2. To be defined.
3. To be defined.
4. Optional; keep the version smaller if the first three changes form a coherent release.

### Explicit exclusions

- No change outside the listed V1 scope.
- No destructive database cleanup.
- No Production SQL, data mutation, deployment or environment change during implementation and staging verification.
- No weakening of the non-regression boundaries above.

### Acceptance criteria

| Change | Expected user outcome | Failure and permission checks | Status |
|---|---|---|---|
| V1-01 | To be defined | To be defined | Not started |
| V1-02 | To be defined | To be defined | Not started |
| V1-03 | To be defined | To be defined | Not started |
| V1-04 | Optional | To be defined | Not started |

### Database and environment impact

- Database change required: To be assessed.
- Ordered migration: None yet.
- Staging application result: Not started.
- Production application: Not approved.
- Rollback or compatibility requirement: To be assessed before any Production approval.

### Verification

- Local lint/build: Not started.
- Vercel Preview commit and URL: Not available.
- Staging accounts and fixtures: Not selected.
- Affected journey result: Not started.
- Authorization/privacy/release regression: Not started.
- Product Owner staging acceptance: Not started.

### Findings

| ID | Severity | Finding | Owner | Disposition | Retest |
|---|---|---|---|---|---|
| — | — | No findings recorded | — | — | — |

Severity rules:

- **Critical:** privacy/security exposure, unauthorized access, data loss or complete service failure; stop work and do not promote.
- **High:** required journey blocked without a safe workaround; fix before Production.
- **Medium:** material friction with a workaround; Product Owner decides fix or deferral.
- **Low:** non-blocking polish; may be assigned to a later version.

### Handoff checkpoint

- Current branch: Not created.
- Current commit: Not available.
- Local changes: None recorded.
- Pushed: No.
- Staging migration state: No V1 migration applied.
- Preview verification state: Not started.
- Known blockers: V1 scope and acceptance criteria are not yet defined.
- Production state: Untouched; V1 is not approved for Production.
- Exact next action: Product Owner supplies the three or four proposed V1 changes; Engineering converts them into bounded acceptance criteria before changing code.

## How to pause and resume safely

Before pausing, update only the active version section with:

- branch and exact commit;
- committed, uncommitted, pushed and deployed state;
- migrations created and the environments where each was applied;
- latest Preview and verification result;
- open findings and decisions;
- any Product Owner task requiring signed-in access; and
- one exact next action.

Do not paste secrets, private Student data, long raw logs or authentication links. Store sanitized evidence in the relevant evidence folder and link it here.

Append a new version section only when the next version begins. Preserve accepted version sections as historical snapshots; correct later changes through a dated amendment or the next version rather than rewriting accepted evidence.
