# Ace Club LMS V2 — Delivery index

Status: Active
Owner: Product owner and Engineering
Last updated: 20 October 2026

V2 is separate from the older MVP/Pilot V2 initiative. Preserve signed historical
evidence and existing Student access while developing the new product model.

## Current work

This branch is dedicated to **Phase 1: product catalogue and entitlement foundation**.
Start with the [completion report](phase-1/completion-report.md), then the
[staging checklist](phase-1/manual-verification-checklist.md) and
[review/release handoff](phase-1/review-and-release.md).

Branch: `intern/v2-phase-1-completion`.
Verified application commit: `529391fd5bc402831914a60418c0cfef4cec66da`.
Local result: 102 tests across 11 files, lint, TypeScript and build passed.
Shared staging verification and product acceptance remain pending.

Phase 2 is preserved on `intern/v2-approved-phase-1-2` at `208ceaa`.
Its implementation and later migrations are absent from this candidate. Earlier
phase numbers in the legacy application do not mean V2 roadmap phases are complete.

## Requirements and decisions

The [decision register](decisions/README.md) preserves the supplied approval
record, source checksums and delivery/reporting requirements. Approved rows
supersede conflicting older plans; Pending and Deferred items remain gated.
The subsequent [expiry confirmation](decisions/phase-1-expiry-confirmation-2026-10-20.md)
confirms that access is denied after six months while purchase history remains.

The [original product decisions](review/product-and-business-decisions.md),
[acceptance criteria](review/acceptance-criteria.md) and
[roadmap](review/product-roadmap.md) remain references for non-conflicting scope.
Phase 2 batch selection and Phase 3 upgrade/payment decisions are separate from
Phase 1 acceptance. No database migration, Production operation or modification
of existing student/course records is authorized by this index.
