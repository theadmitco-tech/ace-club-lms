# Ace Club LMS — Instruction Register

Status: Active
Owner: Product owner
Last updated: 31 August 2026

This folder contains binding product intent, scope, delivery gates, and signed Product Owner checkpoints.

For normal continuation:

1. Read the [Project Manual](../docs/PROJECT_MANUAL.md).
2. Read [Current State](../docs/CURRENT_STATE.md).
3. Read the binding requirement or decision relevant to the immediate task.

Do not use a historical handoff or phase plan as the current operational state.

## Authority order

When documents conflict, use this order:

1. Explicit Product Owner instruction and accepted amendment.
2. [MVP Acceptance Criteria](Ace_Club_LMS_MVP_Acceptance_Criteria.md).
3. [Product Roadmap](Ace_Club_LMS_Product_Roadmap.md).
4. Accepted architecture decision records under [`docs/decisions/`](../docs/decisions/).
5. [Project Manual](../docs/PROJECT_MANUAL.md) for stable consolidated context.
6. [Engineering Handbook](../docs/governance/engineering-handbook.md) for engineering and release rules.
7. [Current State](../docs/CURRENT_STATE.md) for verified operational facts and the next action.
8. Feature, release, and historical evidence records.

Code is evidence of implementation. It does not silently redefine product scope.

When a conflict is found:

1. stop the affected change;
2. identify the conflicting statements and authority;
3. obtain Product Owner clarification when required;
4. update or supersede the lower-authority document;
5. commit the reconciliation with the related change.

## Binding product documents

| Document | Status | Purpose | Update rule |
|---|---|---|---|
| [MVP Acceptance Criteria](Ace_Club_LMS_MVP_Acceptance_Criteria.md) | Active | Required product behavior and exclusions | Product Owner approval required |
| [Product Roadmap](Ace_Club_LMS_Product_Roadmap.md) | Active signed history | Approved delivery phases, gates, and ownership | Amend transparently with Product Owner approval |
| [Phase 0.5 Setup/Recovery Sign-off](Phase_0.5_Setup_Recovery_Signoff.md) | Signed off | Historical recovery checkpoint | Immutable; do not rewrite |

## Operational and engineering documents

| Document | Purpose |
|---|---|
| [Project Manual](../docs/PROJECT_MANUAL.md) | Master explanation and documentation map |
| [Current State](../docs/CURRENT_STATE.md) | Exact deployments, migration ledgers, issues, approvals, rollback, and next action |
| [Engineering Handbook](../docs/governance/engineering-handbook.md) | Source control, migrations, authorization, testing, releases, rollback, documentation, and handoffs |
| [Documentation Index](../docs/README.md) | Short task-oriented router |

## Reading paths

### Starting or resuming work

1. Read `AGENTS.md`.
2. Read the Project Manual.
3. Read Current State.
4. Read only the relevant requirement, ADR, feature guide, release record, or evidence linked from those documents.
5. Verify Git/deployment/database facts read-only when the immediate task depends on them.

### Making a product decision

1. Read the affected acceptance requirement.
2. Review existing ADRs and stable feature contracts.
3. Record an approved structural/security/data decision as a new ADR.
4. Do not rewrite an accepted ADR; supersede it.

### Releasing

Follow the Engineering Handbook. Every release needs explicit scope, Staging evidence, fixture cleanup, rollback, Production authorization, deployment/migration identifiers, and a Current State update.

### Investigating history

Use the [historical map in the Project Manual](../docs/PROJECT_MANUAL.md#113-historical-map). Phase, pilot, handoff, and evidence documents remain preserved but are not prerequisite reading.

## Folder rules

- `instruction/` owns binding product intent and signed Product Owner checkpoints.
- `docs/PROJECT_MANUAL.md` owns stable consolidated context.
- `docs/CURRENT_STATE.md` owns the active handoff.
- `docs/governance/` owns engineering and documentation rules.
- `docs/decisions/` owns accepted architecture decisions.
- Dated evidence remains immutable.
- Never store secrets, credentials, private Student data, magic links, or unrestricted signed URLs.
