# Phase 1 exit-gate audit — 1 November 2026

**Phase 1: Complete — product catalogue and entitlement foundation in staging Preview.**
All **13 exit-gate rows have supporting evidence**. The final hosted checks cover
184 access/upgrade/security assertions, 4 concurrent replay assertions, 18 Student
legacy checks and 8 Admin/editor/public-list checks. The 15 synthetic purchases
and 15 QA accounts have been removed. The original 60-table data fingerprint was
restored before the additive legacy-editor repair; existing column values remained
unchanged. See the [final evidence and limitations](../phase1-closeout-2026-11-01/passwordless-qa/README.md).

Two reproduced blockers were resolved: the approved branch-only server credential
repaired enrollment and protected-file access; nine missing legacy editor metadata
columns were added in staging without rewriting questions. The original Phase 1
migration was preserved. Production is unchanged and PR #24 remains Draft.

Completion covers the approved Phase 1 foundation. Payment checkout and upgrade
fulfillment are Phase 3; Phase 2 publication and write flags remain inactive. This
records technical completion, not an unrecorded product-owner review or Production approval.

## Candidate and evidence

- Exact source: [`155b3fbffc46db94be0fbee70b7b6fd9465a74b4`](https://github.com/theadmitco-tech/ace-club-lms/tree/155b3fbffc46db94be0fbee70b7b6fd9465a74b4), branch `intern/v2-phase-2-review`.
- [Immutable LMS Preview](https://ace-club-97csnfzm5-theadmitco-techs-projects.vercel.app/courses/v2), deployment `dpl_EWB7tYjTYzhrndN7WS1waXKKCMaG`, READY. Current PR #24 is Draft and unmerged; rechecked during this audit.
- Staging: `eyphkkginlgoaxflauog`. Its host was observed in the deployed browser asset during the website-integration checks.
- Production remains `dpl_8axtycbJUpFX8cPWhVtkhGf6p9Kj`, freshly rechecked read-only. The closeout updates deployed Preview, added the branch-scoped upgrade-policy variable and corrected the branch-only staging server credential. Production environment values are unchanged; dedicated synthetic staging QA writes are recorded separately; no PR state change occurred.
- [S1 — Original staging application and security report](../../docs/v2/phase-1/evidence/staging-application-2026-10-24.md), with [sanitized results](../../docs/v2/phase-1/evidence/staging-application-2026-10-24.json): dated 24 October, not a fresh database inspection.
- [S2 — Website deployment and hosted acceptance](../phase1-website-integration/deployment-2026-11-01.json): all eight public quotes; signed-out redirects; user-reported authenticated Student/Admin page results.
- [S3 — Current local verification](../phase1-website-integration/verification/local-checks.json): 151 tests across 16 suites, 12 Phase 1 browser scenarios, 39 Phase 2 browser regressions, 14 navigation tests, lint, TypeScript and build. Includes tests of an **unapplied canonical-contract proposal**. Local browser scenarios use synthetic adapters.
- [S7 — Current student UI, upgrade estimate and hosted verification](../phase1-closeout-2026-11-01/README.md): 172 tests across 18 suites; 20 student, 5 diagnostic and 39 Phase 2 browser scenarios; lint, types, build and CI pass. Synthetic local tests remain distinct from hosted evidence.
- [S8 — Final hosted checks, repairs and cleanup](../phase1-closeout-2026-11-01/passwordless-qa/README.md): actual staging Auth sessions, synthetic fixtures and final cleanup; detailed limitations distinguish local coverage from hosted checks.
- [S4 — Existing manual checklist](../../docs/v2/phase-1/manual-verification-checklist.md): historical preparation plan; its Phase 1 acceptance gaps are superseded by S8. Broader release/payment checks remain separately scoped.
- [S5 — Compatibility mapping proposal](../../docs/v2/phase-1/proposals/README.md) and [historical preparation handoff](../../docs/v2/phase-1/proposals/closeout-2026-10-28.md), superseded for mapping acceptance by the user decision recorded below.
- [S6 — Product decisions](../../docs/v2/review/product-and-business-decisions.md), especially V2-DEC-05, and [six-month confirmation](../../docs/v2/decisions/phase-1-expiry-confirmation-2026-10-20.md).
- [Source supplied by user](source-exit-gates.txt), published as a role-anonymized copy; original source hash retained in the audit. It is a review draft used as the requested audit criteria; it is not an operational instruction or approval to migrate/deploy.

The code was inspected in an isolated checkout at the exact Preview commit.
The user's main working directory is on an older branch; its local migration
copies are not substituted for the deployed source. Passing checks were not
rerun merely to refresh their timestamps. The original migration checksum was
recomputed and matches S1/S3.

## Complete Phase 1 checklist

| Check | Exit-gate requirement | Status and evidence | What remains |
|---|---|---|---|
| [x] P1-01 | Four offerings: Full Course, Individual Quant, Individual Verbal, Individual DI | **Supported pass.** Four distinct scopes in applied SQL; approved display names in the server reader; current hosted catalogue and prices pass (S1–S3). | Terminology in stored contracts is separately tracked in P1-02. |
| [x] P1-02 | Labels, codes, DB descriptions and docs use the approved model, or a reviewed compatibility mapping explains legacy identifiers | **Supported pass via reviewed compatibility mapping.** User explicitly accepted the documented internal mapping on 1 November 2026. UI names and canonical selection URLs use the approved model; direct legacy SQL/RPC contracts retain compatibility names/kinds (S5). | Keep legacy identifiers internal. No database rewrite, canonical proposal rollout or migration rerun is required by this accepted alternative. |
| [x] P1-03 | Full Course grants Quant, Verbal and DI together | **Supported pass at the entitlement foundation.** Exact scope constraints, trusted grant tests, and historical staging Full Course checks (S1/S3). | Checkout/provider integration is Phase 3. |
| [x] P1-04 | Each individual grants only its section | **Supported pass at the entitlement foundation.** Quant allows Quant and denies Verbal/DI/Full; all individual scopes are fixed by constraints and tested (S1/S3). | Whole-site content cutover is not claimed. |
| [x] P1-05 | Individual purchases do not silently create Full Course | **Supported pass.** All three individual grant keys still fail the Full Course entitlement check; current quote explains the distinction (S1–S3). | No outstanding foundation issue found. |
| [x] P1-06 | Correct package and Full Course pricing | **Supported pass.** All four price tiers and all eight valid subject combinations pass both recorded staging SQL and current hosted quotes (S1–S3). | Upgrade pricing is a different requirement, P1-07. |
| [x] P1-07 | Upgrade package difference | **Supported pass for Phase 1 estimate scope.** Approved policy; all 12 hosted eligible price/retained-expiry combinations and rejected states pass. | Actual upgrade payment and grant fulfillment remain Phase 3. |
| [x] P1-08 | Access starts after successful payment and lasts six months | **Supported pass for the Phase 1 trusted-payment foundation.** Valid past confirmation timestamp required; expiry is six calendar months in UTC with month-end clamping; start inclusive, expiry exclusive (S1/S3/S6). | Actual payment-provider confirmation and checkout-to-access flow are **not implemented** here; those remain Phase 3. No browser grant action exists. |
| [x] P1-09 | Expired, revoked, inactive, signed-out and wrong-section access denied | **Supported pass.** Real staging Auth sessions confirm negative-state and section boundaries; independently confirmed foreign purchases/grants remain invisible. Hosted Student Admin-route denial passes. | Legacy content adoption of V2 is later-phase work. |
| [x] P1-10 | Existing MVP access and data unchanged | **Supported pass.** Hosted Student dashboard/schedule, worksheet persistence, protected files, inactive-batch access, Admin add/edit/delete/import/recovery and public batch list pass. Enrollment and missing legacy editor metadata were repaired. Exact cleanup restored the original 60-table fingerprint; all generated QA accounts were removed. | Existing payment-provider flow was not exercised with credentials shared with Production. No payment-path code changed; prior local coverage is retained. |
| [x] P1-11 | Direct browser roles cannot perform restricted purchase/grant writes | **Supported pass.** Anonymous, Student and Admin RPC grant and table insert/update/delete probes all return permission denial; fixture purchases remain unchanged. | None within Phase 1. |
| [x] P1-12 | Staging migration applied once, verified and recorded with checksum | **Supported historical pass.** Applied 24 October at 14:23:22 UTC; version `20261018090000`, 46 prior ledger records unchanged; schema/security comparison passed (S1). Current source checksum matches. | Do not rerun. Fresh read-only inspection can detect subsequent drift; metadata-only SQL preflight and authenticated API checks were recorded in S8; this does not claim a fresh full schema/ledger equivalence comparison. |
| [x] P1-13 | No Production migration or data change | **Supported operational pass.** Staging-only historical application records, no Production operations in integration/audit, unchanged Production deployment (S1/S2 and fresh Vercel metadata). | This is scoped operational evidence, not an independent full Production database diff. |

### P1-06 pricing subchecks

- [x] One individual offering: **₹10,000** — Quant, Verbal and DI each checked.
- [x] Two individual offerings: **₹18,000** — Quant+Verbal, Quant+DI and Verbal+DI each checked.
- [x] Three individual offerings: **₹25,000** — still distinct from Full Course.
- [x] Full Course: **₹25,000** — one separate product; mixing it with individuals is rejected.

### P1-02 concrete compatibility decision

| Approved UI / URL identity | Existing ledger key | Entitlement scope |
|---|---|---|
| Full Course / `full_course` | `full_batch` | Quant + Verbal + DI |
| Quant / `quant` | `quant_crash` | Quant only |
| Verbal / `verbal` | `verbal_crash` | Verbal only |
| DI / `di` | `di_crash` | DI only |

**Accepted by the user on 1 November 2026:** “Accept the documented internal
mapping.” These keys remain internal compatibility identifiers; approved terminology
is mandatory in product-facing surfaces. The acceptance covers the documented
stored contract, including legacy names/kinds, price-history references, grant
foreign keys and payment replay. It satisfies the gate's reviewed-mapping alternative.
The separate canonical DB interface expansion remains unapplied and is not required
to close this naming gate. This decision does not authorize that SQL rollout,
rewriting historical records, or rerunning the original migration.

### P1-07 approved upgrade rule and implementation

The user explicitly answered **“Use this upgrade rule”** on 1 November 2026.
The Preview accepts exactly one active, non-revoked individual package and charges
no money: it estimates the difference between current configured tiers while
retaining the original expiry. Expired, revoked, Full Course and ambiguous multiple
purchases are rejected. Refunded purchases must be revoked to be excluded reliably.

| Upgrade | Current expected difference |
|---|---:|
| 1 individual → 2 individuals | ₹8,000 |
| 2 individuals → 3 individuals | ₹7,000 |
| 1 individual → 3 individuals | ₹15,000 |

`/account/access/upgrade` derives identity from the caller session, checks purchase
ownership and database-time access, validates strict subject supersets and detects
price changes. No service key, checkout or grant mutation is used. The original
migration remains untouched. Twelve local upgrade tests pass. The rule is configured
only for Preview branch `intern/v2-phase-2-review` using
`V2_INDIVIDUAL_UPGRADE_POLICY=current-tier-preserve-expiry-v1`.

The user screenshot confirms the no-active-package upgrade message. Hosted
eligible price/expiry and other rejected-state acceptance now pass in all tested cases. Payment
integration must later revalidate atomically and handle replay/concurrency; the
current whole-purchase grant function cannot fulfill a difference payment.

## Closeout completed before Phase 2

1. User-approved terminology mapping and upgrade policy retained.
2. Hosted upgrade, negative-state, cross-Student and browser-write boundaries passed.
3. Enrollment and legacy editor blockers repaired in staging; hosted regression passed.
4. Synthetic purchases, course/material fixtures, files and 15 generated accounts cleaned up.
5. Production and the applied Phase 1 migration preserved; PR #24 remains Draft.

The separate product review has not been recorded. Nothing here changes PR or
Production release approvals. Historical S4 preparation notes are retained for provenance.

Phase 2 SQL, write flags and publishing remain inactive. The updated student wireframe is now partially integrated into the LMS Preview;
feedback locks, checkout and later-phase learning behavior remain gated.

Review the [revised wireframe PDF](../ace-v2-wireframes-2026-11-01/ace-v2-wireframes-2026-11-01.pdf)
or [interactive prototype](../ace-v2-wireframes-2026-11-01/index.html). They show
the intended upgrade difference and later-phase learning states using fictional
data. The LMS now also has a real caller-session upgrade estimate, separately covered
by S7; the prototype itself is not hosted acceptance evidence.

## Sign-off record

| Phase | Status | Reviewer | Date | Evidence | Notes |
|---|---|---|---|---|---|
| 1 | **Complete — technical foundation** | Agent verification; explicit user product decisions recorded above | 2026-11-02 | This matrix, S1–S8 | 13 supported gates; exact QA cleanup complete. Separate product-owner review and Production approval are not inferred. |
| 2 | **Activation pending** | — | — | Existing activation packet | Phase 2 SQL and write flags remain inactive. |
