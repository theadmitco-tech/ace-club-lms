# Pilot V3 Phase 1 — Question Bank and bulk upload

Status: **closed**. Applied additively to Staging on 21 August 2026, with the MSR binary-matrix compatibility amendment verified on Staging and the standalone-TPA validation amendment released to Preview on 22 August 2026. No Production change is authorized.

## Boundary

This phase adds the Admin Question Bank, Draft/revision lifecycle, canonical XLSX/ZIP validation, protected media, namespace authorization and import audit foundation. It does not add mock composition, Student attempts/player/results, Production changes or a Production release plan.

Implementation branch: `codex/pilot-v3-phase-1`, based on freshly fetched `origin/main` at `be1a6ccba4e1ba896b059051fbf712708c70fafb`. The inherited Pilot V2 worktree was not modified.

## Delivered

- Admin Question Bank inventory, filters, rendered preview, type-aware manual Draft editor, Draft editing and publish/retire/revise controls.
- Founder namespace membership administration for active Admin accounts.
- Fail-closed XLSX/ZIP parser for the accepted `ace-gmat-question-package/1.0` contract, including all eight question types, response-slot answer validation, taxonomy, rich content, duplicate/conflict rules, assets and shared stimuli.
- MSR supports `single_choice`, `dropdowns` and statement-by-statement Yes/No `binary_matrix` responses; the compatibility amendment uses the existing schema shape and remains backward compatible.
- TPA accepts a self-contained two-part prompt without a shared stimulus. When a TPA supplies a stimulus, the existing `two_part_context` compatibility validation remains in force.
- Dry-run preview with no writes, a 30-minute HMAC-bound confirmation, re-parsing of the submitted package on confirmation, idempotency and all-or-nothing database operations.
- Compensating Storage cleanup and import failure audit records.
- Immutable question/stimulus revisions, private answer keys, Draft-only imports and explicit lifecycle RPCs.
- Private `mock-media` bucket limited to PNG/JPEG/WebP and 10 MB per asset. No client Storage policies are present.

## Migrations

Staging project: `eyphkkginlgoaxflauog`.

1. Reconciled the exact inherited migration `20260820114212_restore_enrolled_student_inactive_batch_access` before Phase 1. The three historically excluded migrations remained excluded.
2. Applied `20260821093017_add_mock_question_bank_foundation` after a complete rollback-only validation.
3. Applied and verified `20260822110000_allow_msr_binary_matrix` to widen only the MSR response compatibility constraint; no Production application is authorized. Unrelated older local-only migrations remain pending and were not applied.

The Phase 1 result contains 13 `public.mock_*` tables with forced RLS and no `anon`/`authenticated` table grants, the private answer-key table, three founder namespaces, 16 canonical taxonomy rows and the private media bucket.

## Operational note

No founder namespace membership was guessed or seeded. An existing active Admin must use the Contributor access form to grant each founder/Admin account its namespace before a real import. The accepted blank founder workbooks intentionally remain blocked until they contain a unique package ID and at least one question.

Verification and known follow-ups are recorded in [phase-1-verification-2026-08-21.md](./evidence/phase-1-verification-2026-08-21.md).

## Final Preview amendment — 22 August 2026

The real UNNATI package exposed a self-contained TPA question as a false validation blocker. Commit `ec4631e` removes only the blanket TPA shared-stimulus requirement and adds a regression test. The current Phase 2 Preview deployment containing the correction is `dpl_3aEnLu3mBn1k2DHpBVco6HXW3qUM` (`https://ace-club-2yy631aug-theadmitco-techs-projects.vercel.app`). The package was not imported automatically; Admin confirmation remains required.
