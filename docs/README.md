# Ace Club LMS — Documentation Index

Status: Active
Owner: Engineering
Last updated: 31 July 2026

This index routes readers to the smallest set of documents needed for a task. Product authority remains in [`instruction/`](../instruction/README.md).

## Current phase

- Phase 0.5: signed off in [Setup and Recovery Sign-off](../instruction/Phase_0.5_Setup_Recovery_Signoff.md).
- Phase 1: active closeout.
  - [Audit and status](phase-1/README.md)
  - [Manual verification checklist](phase-1/manual-verification-checklist.md)
  - [Read-only Supabase inventory query](phase-1/supabase-inventory.sql)
  - [Evidence](phase-1/evidence/)

There is no approved Phase 1.5.

## Documentation map

| Area | Location | Purpose |
|---|---|---|
| Product instructions | [`instruction/`](../instruction/README.md) | Acceptance criteria, roadmap, and signed checkpoints |
| Governance | [`docs/governance/`](governance/) | Documentation organization and conventions |
| Development | [`docs/development/`](development/) | Living engineering and coding rules |
| Setup | [`docs/setup/`](setup/) | Local-machine and environment setup |
| Phase records | `docs/phase-N/` | Active status, checklist, sign-off, and evidence for a delivery phase |
| Decisions | `docs/decisions/` | Approved architecture/product/security/data decisions when created |
| Feature references | Files directly under `docs/` | Existing focused guides retained at their stable paths |

## Existing feature references

- [Question bank](question-bank.md)
- [Master worksheet questions](master-worksheet-questions.md)
- [Worksheet PDF conversion](worksheet-pdf-conversion.md)

These stable paths are grandfathered. New multi-file feature documentation should use `docs/features/<feature-name>/`.

## How to use this index

- Resume work: read the instruction register, Phase 0.5 sign-off, and current phase record.
- Change code: also read the coding rules and the relevant feature reference.
- Change environment/setup: read the Mac setup guide.
- Add documentation: follow the document conventions.
- Record test output or inventories: add dated files to the active phase’s `evidence/` folder.
- Make a durable decision: add a decision record under `docs/decisions/`.

## Key documents

- [Instruction register](../instruction/README.md)
- [Document conventions](governance/document-conventions.md)
- [Living coding rules](development/coding-rules.md)
- [Mac setup](setup/mac-setup.md)
