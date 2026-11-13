# Phase 3 — Self-registration and verified payment

Status: local integration checkpoint on `intern/v2-phase-3-integration-review`,
based on the current Admin and Student implementation at `fafe8ec`.
Razorpay Test Mode is selected. Provider Test Mode authentication passed a read-only API check. Hosted payment acceptance remains pending.
Production remains excluded. The older Phase 3 draft remains preserved in its original worktree.

## Acceptance scope

The supplied phase exit gates define eleven required outcomes:

- [ ] Published eligible offerings and batches are browsable before payment.
- [ ] Full Course and individual Quant, Verbal and DI remain distinct.
- [ ] Outline, session headings, live availability, price and six-month terms are visible.
- [ ] Normal registration grants access without manual Admin enrollment.
- [ ] Full Course payment grants all three sections.
- [ ] Individual payment grants only the selected subjects.
- [ ] Live registration enforces the approved eight-student capacity atomically.
- [ ] No per-session reservation or waitlist is introduced.
- [ ] Payment verification is server-controlled and idempotent.
- [ ] Failed, delayed, duplicated and replayed payments cannot create incorrect access.
- [ ] Upgrades charge the approved current-tier difference and retain original expiry.

## Preserved contracts

The Phase 1 migration and existing payment/registration endpoints remain unchanged.
New V2 checkout paths are separate from legacy registration. Full Course retains
its internal `full_batch` identifier; individual subjects retain the approved
`quant_crash`, `verbal_crash` and `di_crash` mappings. Existing purchases and their
original price, confirmation time, expiry and grants remain historical records.

The accepted upgrade rule permits one active, unrevoked individual package and a
strict subject superset. Current configured tier prices determine the difference.
Expired, revoked, Full Course and ambiguous multiple-purchase cases are excluded.
An additive upgrade ledger must extend effective access without rewriting the
original purchase or passing a partial upgrade amount to `grant_v2_purchase`.

Public catalogue data uses an explicit projection of the latest published
revision. Private material URLs, meetings, student records, drafts and operator
identities remain excluded. Publication is checked again during checkout and
fulfillment; unpublished content never becomes eligible through an older revision.

## External decisions and setup

Approved: Razorpay Test Mode; eight live places per published batch; Full Course
uses one place in its own batch covering all three subjects. Individual batches
have separate limits. Live registration is included in the configured package
price, with no additional fee. Existing Razorpay configuration
is shared across Preview and Production and must not be assumed to contain test
credentials. A dedicated V2 test configuration is required before payment calls.
No real charge, refund, Production configuration change or shared-key replacement
is authorized by the staging implementation.

The unapplied payment drafts now use versions `20261113090000`, `20261113100000` and
`20261113110000`, after the installed Phase 6 repair. No applied migration was renamed or edited.

Fresh staging metadata and a recoverable application-data snapshot precede SQL
activation. The SQL Editor remains the activation path while database credentials
and Supabase OAuth are unavailable. Local tests, hosted acceptance, provider test
payments and exact fixture cleanup are separate evidence categories. No gate is
complete solely because a synthetic provider response passed a local test.
