# Ace Club LMS — Documentation Index

Status: Active
Owner: Engineering
Last updated: 31 August 2026

This index routes readers to the smallest set of documents needed for a task. Product authority remains in [`instruction/`](../instruction/README.md).

Proposed engineering operating standard: [Ace Club LMS Engineering Handbook](governance/engineering-handbook.md). It defines source control, migrations, environments, authorization, testing, releases, rollback, evidence, documentation, and handoff rules. It remains Draft until Product Owner review.

Current signed history: [Ace Club LMS Running Handoff](handoffs/ace-club-lms-running-handoff.md).

Current post-MVP iteration state: [Pilot V2 — Consolidated Bootstrap and Running Handoff](pilot-v2/README.md).

Signed Pilot V1 history: [Pilot Iterations Running Handoff](handoffs/pilot-iterations-running-handoff.md) and [Production Rollout Evidence](pilot-v1/evidence/production-rollout-2026-08-13.md).

Signed Pilot V1 requirements: [Pilot V1 Acceptance Criteria](pilot-v1/acceptance-criteria.md).

Signed Pilot V1 delivery sequence: [Pilot V1 Phase-wise Implementation Plan](pilot-v1/implementation-plan.md).

Pilot V1 implementation baseline: [Pilot V1 Phase 0 Readiness Record](pilot-v1/phase-0-readiness.md).

Current Phase 4 staging database checks: [Session-material Authorization Probe](pilot-v1/phase-4-staging-authorization-probe.sql).

Current Phase 4 staging result: [Session-material Migration and Authorization Evidence](pilot-v1/evidence/phase-4-staging-migration-and-authorization-2026-08-11.md).

Current Phase 4 Preview result: [Session-material Preview Route Lifecycle Evidence](pilot-v1/evidence/phase-4-preview-route-lifecycle-2026-08-11.md).

Current Phase 5 staging UI result: [Session-resource Admin and Student Lifecycle Evidence](pilot-v1/evidence/phase-5-staging-session-resource-lifecycle-2026-08-13.md).

Current Phase 6 integrated result: [Pilot V1 Integrated Verification Evidence](pilot-v1/evidence/phase-6-integrated-verification-2026-08-13.md).

Current Phase 6 logo amendment result: [Ace Club Logo Amendment Verification Evidence](pilot-v1/evidence/phase-6-logo-amendment-verification-2026-08-13.md).

Current Pilot V1 Phase 7 staging review: [Manual Verification Checklist](pilot-v1/manual-verification-checklist.md).

Pilot V1 Phase 7 is complete and deployed to Production: [Staging Acceptance Evidence](pilot-v1/evidence/phase-7-staging-acceptance-2026-08-13.md) and [Production Rollout Evidence](pilot-v1/evidence/production-rollout-2026-08-13.md).

Pilot V1 Production release procedure: [Conditional Production Release Plan](pilot-v1/production-release-plan.md). The authorized procedure was executed on 13 August 2026; it does not authorize a later Production change.

Pilot V1 Production database checks: [Read-only Verification](pilot-v1/production-read-only-verification.sql). Run before and after the tracked migration push and compare sanitized aggregate/schema results.

Pilot V2 Phases 1–6 are accepted. Phase 6 exact source/Preview acceptance and the read-only Phase 7 readiness baselines are recorded in the [Phase 6 evidence](pilot-v2/evidence/phase-6-preview-acceptance-and-readiness-2026-08-20.md). Production release remains unauthorized: [Consolidated Bootstrap and Running Handoff](pilot-v2/README.md).

Pilot V2 Phase 3 accepted resource-management outcome and current authorization boundary: [Phase 3 Handoff](pilot-v2/README.md#phase-3-handoff).

Approved Pilot V2 outcomes, exclusions and staging journeys: [Product Review and Acceptance Criteria](pilot-v2/acceptance-criteria.md).

Approved Pilot V2 phase sequence and exit gates: [Product Roadmap](pilot-v2/product-roadmap.md).

Approved Pilot V2 recommendation requirement: [Recommended Reading Bug and Revised Contract](pilot-v2/recommended-reading-revision.md). It records the multi-pre-read Production defect and the section-wise two-subsection timing behavior; Recommended practice remains unchanged.

Pilot V2 Phase 0 technical baseline and current exit state: [Phase 0 Readiness](pilot-v2/phase-0-readiness.md).

Approved Pilot V2 template rows, timing, instructors and Admin editor/preview contract: [Template and Admin Interface Specification](pilot-v2/template-interface-specification.md).

Pilot V2 Phase 1 local automated and migration-execution result: [Phase 1 Local Verification Evidence](pilot-v2/evidence/phase-1-local-verification-2026-08-17.md).

Pilot V2 Phase 1 exact Staging migration, authorization, Admin revision and non-regression result: [Phase 1 Staging Verification Evidence](pilot-v2/evidence/phase-1-staging-verification-2026-08-17.md).

Pilot V2 Phase 3 exact Staging migration, bounded access/isolation/sync probe and Product Owner acceptance: [Phase 3 Staging Verification Evidence](pilot-v2/evidence/phase-3-staging-verification-2026-08-18.md).

Pilot V2 Phase 4 exact Staging projection/correction and bounded Full Course/crash-course Student journeys: [Phase 4 Staging Verification Evidence](pilot-v2/evidence/phase-4-staging-verification-2026-08-18.md).

Pilot V2 Phase 5 local integrated authorization, privacy, tracker, compatibility and quality checks: [Phase 5 Local Integrated Safety Evidence](pilot-v2/evidence/phase-5-local-integrated-safety-2026-08-18.md).

Pilot V2 Phase 5 bounded Staging isolation, tracker persistence, Admin parity, exact schedule-shift and aggregate-restoration result: [Phase 5 Staging Integrated Safety Evidence](pilot-v2/evidence/phase-5-staging-verification-2026-08-18.md).

Pilot V2 approved delivery sequence and phase gates: [Implementation Plan](pilot-v2/implementation-plan.md).

Pilot V2 conditional Production procedure: [Release Plan — 20 August 2026](pilot-v2/production-release-plan-2026-08-20.md). Prepared for review; no Production action is authorized.

Pilot V2 read-only Production preflight: [Phase 7 Evidence — 20 August 2026](pilot-v2/evidence/phase-7-production-preflight-2026-08-20.md). Exact dry run and tested manual snapshot recovery pass; documentation freeze and exact Production authorization remain open.

Pilot V2 additive schema, existing-batch compatibility and rollback method: [Data, Compatibility and Rollback Plan](pilot-v2/data-compatibility-and-rollback-plan.md).

Pilot V2 staging acceptance journeys: [Manual Verification Checklist](pilot-v2/manual-verification-checklist.md).

Current weekly-schedule decision: [ADR-0004 — Defer Weekly Schedule Redesign](decisions/adr-0004-defer-weekly-schedule-redesign.md). The earlier migration is excluded from Pilot V1 and must not be applied or marked as applied.

## Current phase

- Phase 0.5: signed off in [Setup and Recovery Sign-off](../instruction/Phase_0.5_Setup_Recovery_Signoff.md).
- Phase 1: complete with the documented Phase 2 authentication exception.
  - [Audit and status](phase-1/README.md)
  - [Manual verification checklist](phase-1/manual-verification-checklist.md)
  - [Read-only Supabase inventory query](phase-1/supabase-inventory.sql)
  - [Evidence](phase-1/evidence/)
- Phase 2: signed off with Google Sign-In as the approved login method.
  - [Status and exit gate](phase-2/README.md)
  - [Manual verification checklist](phase-2/manual-verification-checklist.md)
  - [Authentication decision](decisions/adr-0001-google-sign-in.md)
- Phase 3: signed off — align the fixed master course.
  - [Status and exit gate](phase-3/README.md)
  - [Approved revised course structure](phase-3/revised-course-structure.md)
- Phase 4: signed off — cohorts and release automation.
  - [Status and exit gate](phase-4/README.md)
  - [Manual verification checklist](phase-4/manual-verification-checklist.md)
  - [Schedule and material-sync decision](decisions/adr-0002-cohort-schedule-and-material-sync.md)
- Pre–Phase 5 foundation checkpoint: signed off on 1 August 2026.
  - [Student experience foundation plan](phase-5/student-experience-foundation-plan.md)
  - [Decision summary](phase-5/student-experience-foundation.md)
  - [UI state and content matrix](phase-5/ui-state-and-content-matrix.md)
  - [Preparation and delivery verification checklist](phase-5/manual-verification-checklist.md)
- Phase 5: signed off and deployed to Production, including batch-specific recordings — [PR #5](https://github.com/theadmitco-tech/ace-club-lms/pull/5) is merged.
  - [Implementation status](phase-5/README.md)
- Phase 6: signed off and deployed to Production — [PR #7](https://github.com/theadmitco-tech/ace-club-lms/pull/7) is merged.
  - [Status and implementation boundary](phase-6/README.md)
  - [Manual verification checklist](phase-6/manual-verification-checklist.md)
  - [Staging acceptance evidence](phase-6/evidence/manual-staging-verification-2026-08-03.md)
  - [Production rollout evidence](phase-6/evidence/production-rollout-2026-08-03.md)
- Phase 7: signed off and deployed to Production — [PR #9](https://github.com/theadmitco-tech/ace-club-lms/pull/9) is merged.
  - [Status and implementation boundary](phase-7/README.md)
  - [Manual verification checklist](phase-7/manual-verification-checklist.md)
  - [Local automated verification](phase-7/evidence/automated-verification-2026-08-03.md)
  - [Staging migration evidence](phase-7/evidence/staging-migration-application-2026-08-03.md)
  - [Staging acceptance evidence](phase-7/evidence/manual-staging-verification-2026-08-03.md)
  - [Production rollout evidence](phase-7/evidence/production-rollout-2026-08-03.md)
- Phase 8: signed off with explicit evidence exceptions; the Product Owner confirmed the MVP is live with real Students on 10 August 2026.
  - [Closeout status and exceptions](phase-8/README.md)
  - [Superseded pilot and launch plan](phase-8/pilot-and-launch-plan.md)
  - [Closeout checklist](phase-8/manual-verification-checklist.md)
  - [Operational closeout evidence](phase-8/evidence/operational-closeout-2026-08-10.md)

There is no approved Phase 1.5.

## Documentation map

| Area | Location | Purpose |
|---|---|---|
| Product instructions | [`instruction/`](../instruction/README.md) | Acceptance criteria, roadmap, and signed checkpoints |
| Governance | [`docs/governance/`](governance/) | Documentation organization and conventions |
| Development | [`docs/development/`](development/) | Living engineering and coding rules |
| Setup | [`docs/setup/`](setup/) | Local-machine and environment setup |
| Handoffs | [`docs/handoffs/`](handoffs/) | Running cross-phase continuity with preserved signed sections |
| Phase records | `docs/phase-N/` | Active status, checklist, sign-off, and evidence for a delivery phase |
| Decisions | `docs/decisions/` | Approved architecture/product/security/data decisions when created |
| Feature references | Files directly under `docs/` | Existing focused guides retained at their stable paths |

## Existing feature references

- [Question bank](question-bank.md)
- [Master worksheet questions](master-worksheet-questions.md)
- [Worksheet PDF conversion](worksheet-pdf-conversion.md)

These stable paths are grandfathered. New multi-file feature documentation should use `docs/features/<feature-name>/`.

## How to use this index

- Resume work: read the instruction register, latest running-handoff section, and current phase record.
- Change code: also read the coding rules and the relevant feature reference.
- Change environment/setup: read the Mac setup guide.
- Add documentation: follow the document conventions.
- Record test output or inventories: add dated files to the active phase’s `evidence/` folder.
- Make a durable decision: add a decision record under `docs/decisions/`.

## Key documents

- [Instruction register](../instruction/README.md)
- [Running handoff](handoffs/ace-club-lms-running-handoff.md)
- [Pilot iterations running handoff](handoffs/pilot-iterations-running-handoff.md)
- [Current code landscape and cleanup plan](development/current-code-landscape-and-cleanup-plan.md)
- [Document conventions](governance/document-conventions.md)
- [Engineering handbook](governance/engineering-handbook.md)
- [Living coding rules](development/coding-rules.md)
- [Mac setup](setup/mac-setup.md)
