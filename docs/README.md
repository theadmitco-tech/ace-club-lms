# Ace Club LMS — Documentation Index

Status: Active
Owner: Engineering
Last updated: 3 August 2026

This index routes readers to the smallest set of documents needed for a task. Product authority remains in [`instruction/`](../instruction/README.md).

Current continuation state: [Ace Club LMS Running Handoff](handoffs/ace-club-lms-running-handoff.md).

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
- Phase 7: next — adapt Admin progress to the Phase 6 manual tracker records.

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
- [Current code landscape and cleanup plan](development/current-code-landscape-and-cleanup-plan.md)
- [Document conventions](governance/document-conventions.md)
- [Living coding rules](development/coding-rules.md)
- [Mac setup](setup/mac-setup.md)
