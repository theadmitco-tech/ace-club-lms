# Pilot V3 Phase 2 — Mock Builder, Versioning and Release

Status: **Staging schema repair and release-boundary acceptance complete; full publication journey awaits Published Question Bank fixtures.**

Phase 2 delivers the Admin-side mock-builder boundary only. Student attempts, player, scoring and results remain Phase 3–4 work.

## Delivered

- Draft mock creation with standard/diagnostic purpose.
- Quant, Verbal and Data Insights composition with accepted defaults (21/23/20 questions; 45 minutes per section).
- Published-question-only composition writes and section compatibility checks.
- Draft composition save, validation and immutable published-version snapshots.
- Batch assignment with `release_at` and optional `due_at`; no `expires_at`, retakes or accommodations.
- Admin audit rows for create, update, publish and assign actions.
- Admin route: `/admin/mock-builder`; API route: `/api/admin/mock-builder`.
- Additive migration: `20260821123000_add_mock_builder_release.sql`.

## Verification

Evidence: [phase-2-local-verification-2026-08-21.md](evidence/phase-2-local-verification-2026-08-21.md)

Local TypeScript, targeted ESLint and production build checks passed. The linked Staging ledger reports `20260821123000` as applied. No Production database, deployment or data operation was performed.

## Deferred gate

The schema repair and visibility probe are complete. The remaining Phase 2 acceptance step is an authenticated Admin/current-batch journey with synthetic data; no further local product work is outstanding. Student route/player parity and one-attempt enforcement remain Phase 3.
