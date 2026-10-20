# Phase 2 draft PR

Status: Draft
Owner: Engineering
Last updated: 20 October 2026

Base: `intern/v2-onboarding` (Phase 1 PR #23).
Compare: `intern/v2-phase-2-review`.
Keep draft status. After Phase 1 integration, reconcile the base and rerun checks.

## Title

Add Phase 2 Admin authoring and reviewed batch publication

## Description

Add product-specific templates, independent live/undated batch schedules, private
Meet drafts and scope-reviewed publish/unpublish/republish. Preserve immutable
history and recover identical retries; reject stale edits and unauthorized calls.
Keep new authoring routes off by default and disabled on Vercel Production.

Depends on #23. Compare against `intern/v2-onboarding` to review Phase 2 only.
Exclude later payment, upgrade and protected-content changes. Propose five
additional migrations; apply none through this PR.

Validation: 229 local tests across 21 files passed, including Phase 1/legacy
regressions. Lint, TypeScript and production build passed.

Review `docs/v2/phase-2/approved-delivery-report.md` for scope and risks,
`docs/v2/phase-2/evidence/isolated-review-2026-10-20.md` for changed files and test
evidence, and `docs/v2/phase-2/review-and-release.md` for the coordinated staging
handoff. Record exact-commit CI/Preview results and sanitized UI evidence separately.

Keep draft pending staging setup, browser verification and acceptance. Resolve
Student batch eligibility before implementing the schedule reader; protected
recording/material delivery and registration allocation remain separate work.
No shared database migration, Production change or existing student/course-data
modification. Phase 2 is not complete.
