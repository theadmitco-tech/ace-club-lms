# Student Preview and Phase 1 verification — 1 November 2026

This update integrates the revised student wireframe into the existing LMS Preview.
Production routes retain their original presentation and authorization. The original
Phase 1 migration is unchanged; no shared database writes or Phase 2 activation occur.

## Student experience

- Three individual-package tiers use current database quote prices. Subject
  selection and the distinct Full Course option preserve the accepted product model.
- Student dashboard and session views use the calmer wireframe styling only in
  Preview. Session resources have four groups: pre-class read, recording, session
  reading/material, worksheet. Existing material is not relabeled as a post-read
  without a reviewed source mapping; scheduled class details remain in the header.
- My access shows actual active/expired/revoked history and an expiry notice only
  when the fetched records establish it. Errors are distinct from empty states.
- The last-opened reminder stores only an authorized session ID per user/browser.
  Dashboard links are filtered against its current server-authorized timeline.
  This is not completion tracking; stale/foreign IDs and disabled storage fail safely.
- Feedback locks, live eligibility and payment actions are not simulated in the LMS.

## Upgrade rule

The user explicitly accepted `current-tier-preserve-expiry-v1`: one active,
non-revoked individual package, current configured old/new tier difference,
original expiry retained, no Full Course or ambiguous multiple-purchase upgrades.
Refunded purchases must be revoked to be excluded by the current ledger.

The variable `V2_INDIVIDUAL_UPGRADE_POLICY` is scoped only to Preview branch
`intern/v2-phase-2-review`. The new `/account/access/upgrade` reader uses caller
identity/RLS, validates ownership and database-time access, and rejects missing or
changing prices. See [the quote contract](upgrade-quote-preview.md).

The page provides a non-binding estimate, not checkout or entitlement fulfillment.
The existing whole-purchase grant RPC must not receive a difference payment.
Actual charge/grant integration remains separate payment-phase work. Authenticated
hosted quote acceptance is still required; local tests alone do not close the gate.

## Hosted verification helper

`/qa/phase1` is available only on a staging-configured Preview. An explicit button
runs the current browser's caller-session checks through `/api/v2/phase1-verification`.
It accepts no account/fixture/grant parameters and returns only sanitized outcomes.

The grant-permission probe sends seven null arguments. The applied function rejects
that selection before writes even if execute permissions drift. Only SQL permission
denial counts as a pass; reaching validation is a failure. This was verified with
real disposable local PostgreSQL and a deliberate local privilege change.

The report deliberately never declares complete acceptance. Cross-Student isolation
needs independently confirmed fixtures; negative expiry/revocation states and legacy
worksheet/content journeys need actual session evidence. No service key, token,
purchase reference, account ID or private row is included in the report.

## Local verification

- Phase 1: 172 tests across 18 suites passed, including 12 upgrade tests and 9
  diagnostic tests. Original migration checksum remains
  `ff5c9f0f2ae055c6c3b3e2d67fd64390a9ba4b19deaf14a103ddda71e50047b7`.
- Student UI: 20 browser scenarios passed, including responsive layouts, real
  visit reminders and a Production restart preserving old navigation/five steps.
- Diagnostic UI/API: 5 browser scenarios passed, including permission drift and
  Production 404. Browser tests caught and corrected internal-host normalization
  in same-origin validation; the route compares Origin with Host, not forwarded Host.
- Existing Phase 2 browser regressions: 39 passed.
- Lint, TypeScript and webpack build passed. Browser adapters are synthetic and
  confined to disposable local fixtures; they are never deployed.

The exact published commit, deployment, hosted results and remaining gate status
are recorded in the local `deliverables/phase1-closeout-2026-11-01` handoff after
publication. PR #24 remains Draft and unmerged.
