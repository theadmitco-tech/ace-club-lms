# Phase 1 enrollment correction — 25 October 2026

Status: local candidate verified; hosted enrollment retest pending.

Base: PR #23, `d3020c1c9916c17f6ced27f83ff9ee1be05479f2`.
Only the enrollment UI, endpoint, two regression suites and suite registration
are changed. The Phase 1 migration is unchanged. No Phase 2 code or migration is
included in this correction, and neither PR is merged or made ready for review.

## Problem and resulting behavior

The staging bulk-enrollment response reported HTTP 200 with zero successes and
one failure while attempting to provision an account already visible under
Students. The existing batch editor could still report success and discard input.
It now preserves input and shows failure for HTTP, transport, malformed-response
and partial-enrollment errors. A failed batch save stops enrollment immediately.

The endpoint also ignored profile lookup errors, allowing a failed read to trigger
account creation. It now stops on lookup error, identifies the failing stage by
input position, and rejects existing non-Student profiles before any role change.
Submitted emails and raw provider diagnostics are not returned in error messages.
The underlying staging lookup/provisioning failure is not yet diagnosed; this
correction must not be described as a verified repair of hosted enrollment.

The batch update, profile activation and enrollment remain separate operations.
Partial writes are possible; no automatic retry is introduced. Input retention
lasts while the form stays open, not across navigation or reload.

## Validation

On an isolated checkout of the exact PR #23 base plus this correction:

- All 120 tests in 13 Phase 1 suites passed, including 21 disposable local
  database tests, 8 enrollment UI tests and 10 enrollment endpoint tests.
- Full ESLint with zero warnings passed.
- TypeScript `--noEmit --incremental false` passed.
- Next.js build with `--webpack` passed without hosted credentials.
- `git diff --check` passed.

The sandbox initially prevented PostgreSQL startup (`pg_ctl EPERM`). The same
suite then passed with permission to start disposable local Unix-socket clusters.
No hosted databases were used by these tests.

## Required hosted follow-up

Record the new Preview deployment URL and commit before retesting. Use only the
existing synthetic QA batch and designated test account. Check that an enrollment
attempt either confirms its count or preserves input and returns a safe failure
stage. If it fails, diagnose that stage; do not repeatedly resubmit.

Remaining Phase 1 acceptance includes actual authenticated data isolation,
direct-resource denial, released worksheet progress persistence, fixture cleanup
and the outstanding review/CI decisions in the execution checklist. Local tests
and the successful existing-user enrollment toggle do not replace those checks.
