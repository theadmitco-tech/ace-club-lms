# Ace Club LMS — Instruction Register

Status: Active
Owner: Product owner
Last updated: 3 August 2026

This folder contains the documents that define product intent, scope, phase boundaries, acceptance, and signed checkpoints. Read this register before starting product or engineering work.

Current delivery state: Phases 1–6 are signed off and deployed to Production. [PR #7](https://github.com/theadmitco-tech/ace-club-lms/pull/7) is the merged Phase 6 implementation. Phase 7 — Adapt admin progress — is next.

## Authority order

When documents conflict, use this order:

1. [MVP Acceptance Criteria](Ace_Club_LMS_MVP_Acceptance_Criteria.md) — binding product behaviour and launch acceptance.
2. [Product Roadmap](Ace_Club_LMS_Product_Roadmap.md) — delivery phases, sequencing, ownership, risks, and exit gates.
3. [Running Handoff](../docs/handoffs/ace-club-lms-running-handoff.md) — current signed continuity state and next-phase bootstrap.
4. [Repository instructions](../AGENTS.md) — repository-specific operating constraints.
5. [Living coding rules](../docs/development/coding-rules.md) — implementation and verification conventions.

Code is evidence of the current implementation, not authority for product scope.

## Document register

| Document | Type | Status | Purpose | Update rule |
|---|---|---|---|---|
| `Ace_Club_LMS_MVP_Acceptance_Criteria.md` | Product requirements | Active | Defines required MVP behaviour and exclusions | Change only with product-owner approval |
| `Ace_Club_LMS_Product_Roadmap.md` | Delivery roadmap | Active | Defines phases, order, dependencies, and gates | Change only with product-owner approval |
| `Phase_0.5_Setup_Recovery_Signoff.md` | Historical signed checkpoint | Signed off | Preserves the immutable Phase 0.5 state | Do not rewrite accepted history |
| `docs/handoffs/ace-club-lms-running-handoff.md` | Running cross-phase handoff | Active | Preserves signed phase sections and the latest continuation state | Append a new signed section at each phase close |

## Reading paths

### Starting or resuming work

1. Read `AGENTS.md`.
2. Read this register.
3. Read the latest section of the running handoff.
4. Read the Markdown acceptance criteria and relevant roadmap phase.
5. Read `docs/README.md`.
6. Read the current phase status and only the implementation files relevant to the immediate task.

### Making a product decision

Read the acceptance criteria first, then the roadmap. Record an approved decision under `docs/decisions/` when it changes scope, architecture, security, data, or operations.

### Closing a phase

Use the roadmap exit gate and acceptance criteria. Store the signed result under the relevant `docs/phase-N/` folder, with immutable evidence under `docs/phase-N/evidence/`.

## Folder rules

- `instruction/` contains authoritative product intent and immutable source artifacts.
- `docs/handoffs/` contains the active running handoff with preserved signed phase sections.
- `docs/` otherwise contains implementation guidance, setup, decisions, active phase records, and evidence.
- Markdown is the sole repository format for the MVP acceptance criteria and product roadmap. Do not create parallel Word copies that can drift from product authority.
- Do not store secrets, credentials, private student data, or live magic links in either folder.
- Follow [document conventions](../docs/governance/document-conventions.md) for new files.
