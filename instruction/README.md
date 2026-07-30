# Ace Club LMS — Instruction Register

Status: Active  
Owner: Product owner  
Last updated: 31 July 2026

This folder contains the documents that define product intent, scope, phase boundaries, acceptance, and signed checkpoints. Read this register before starting product or engineering work.

## Authority order

When documents conflict, use this order:

1. [MVP Acceptance Criteria](Ace_Club_LMS_MVP_Acceptance_Criteria.docx) — binding product behaviour and launch acceptance.
2. [Product Roadmap](Ace_Club_LMS_Product_Roadmap.docx) — delivery phases, sequencing, ownership, risks, and exit gates.
3. [Phase 0.5 Setup and Recovery Sign-off](Phase_0.5_Setup_Recovery_Signoff.md) — accepted environment, recovery, continuity, and working agreement.
4. [Repository instructions](../AGENTS.md) — repository-specific operating constraints.
5. [Living coding rules](../docs/development/coding-rules.md) — implementation and verification conventions.

Code is evidence of the current implementation, not authority for product scope.

## Document register

| Document | Type | Status | Purpose | Update rule |
|---|---|---|---|---|
| `Ace_Club_LMS_MVP_Acceptance_Criteria.docx` | Product requirements | Active | Defines required MVP behaviour and exclusions | Change only with product-owner approval |
| `Ace_Club_LMS_Product_Roadmap.docx` | Delivery roadmap | Active | Defines phases, order, dependencies, and gates | Change only with product-owner approval |
| `Phase_0.5_Setup_Recovery_Signoff.md` | Signed checkpoint | Signed off | Preserves completed setup, environment boundaries, and continuation context | Append or supersede deliberately; do not rewrite accepted history |

## Reading paths

### Starting or resuming work

1. Read `AGENTS.md`.
2. Read this register.
3. Read the Phase 0.5 sign-off.
4. Read the acceptance criteria and relevant roadmap phase.
5. Read `docs/README.md`.
6. Read the current phase status and only the implementation files relevant to the immediate task.

### Making a product decision

Read the acceptance criteria first, then the roadmap. Record an approved decision under `docs/decisions/` when it changes scope, architecture, security, data, or operations.

### Closing a phase

Use the roadmap exit gate and acceptance criteria. Store the signed result under the relevant `docs/phase-N/` folder, with immutable evidence under `docs/phase-N/evidence/`.

## Folder rules

- `instruction/` contains authoritative product documents and signed cross-phase checkpoints.
- `docs/` contains implementation guidance, setup, decisions, active phase records, and evidence.
- Do not store secrets, credentials, private student data, or live magic links in either folder.
- Follow [document conventions](../docs/governance/document-conventions.md) for new files.
