# Ace Club LMS — Documentation

Status: Active
Owner: Product owner and Engineering
Last updated: 31 August 2026

## Start here

Normal continuation requires two documents:

1. [Project Manual](PROJECT_MANUAL.md) — stable product, system, architecture, role, feature, environment, and operating context.
2. [Current State](CURRENT_STATE.md) — exact live deployment, migration ledgers, known issues, active work, approvals, rollback, and next action.

Do not begin by reading every historical handoff, pilot, phase, or evidence file.

## Rules and active documentation work

- [Engineering Handbook](governance/engineering-handbook.md) — source control, migrations, authorization, testing, releases, rollback, documentation, and future-handoff rules.
- [Document Conventions](governance/document-conventions.md) — existing naming, status, evidence, and privacy conventions; planned to be consolidated into the handbook.
- [Documentation Consolidation Project](governance/documentation-consolidation-project.md) — active simplification plan and acceptance criteria.
- [Document Inventory](governance/document-inventory.csv) — disposition map for every documentation and instruction artifact inventoried on 31 August 2026.

## Product authority

Product requirements remain under [`instruction/`](../instruction/README.md):

- [MVP Acceptance Criteria](../instruction/Ace_Club_LMS_MVP_Acceptance_Criteria.md)
- [Product Roadmap](../instruction/Ace_Club_LMS_Product_Roadmap.md)
- [Phase 0.5 signed recovery checkpoint](../instruction/Phase_0.5_Setup_Recovery_Signoff.md)

## Task-specific references

- Decisions: [`docs/decisions/`](decisions/)
- Setup: [Mac setup](setup/mac-setup.md)
- Question bank: [Question bank](question-bank.md)
- Worksheets: [Master worksheet questions](master-worksheet-questions.md) and [PDF conversion](worksheet-pdf-conversion.md)
- Development rules retained during consolidation: [Coding rules](development/coding-rules.md)

## Historical records

These are preserved for audit and diagnosis but are not the active handoff:

- MVP phases: [`phase-1/`](phase-1/) through [`phase-8/`](phase-8/)
- Pilot V1: [`pilot-v1/`](pilot-v1/)
- Pilot V2: [`pilot-v2/`](pilot-v2/)
- Pilot V3: [`pilot-v3/`](pilot-v3/)
- Preserved handoffs: [`handoffs/`](handoffs/)

Use [Current State](CURRENT_STATE.md) to identify the one relevant release/evidence record before opening historical material.

## Documentation maintenance

- Update Current State with every release, rollback, material incident, role activation/revocation, or changed next action.
- Keep stable system explanations in the Project Manual.
- Put reusable engineering rules in the Engineering Handbook.
- Put significant accepted decisions in an ADR.
- Keep dated evidence immutable.
- Link to the canonical fact instead of copying it.
- Run `npm run test:docs` before committing documentation changes once the documentation check is installed.
