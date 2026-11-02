# Phase 4 Preview activation

Status: the staging SQL Editor result confirms Phase 4 schema activation. Hosted
website acceptance and exact QA cleanup remain pending. Production remains outside
this work.

## Target and preservation

- Review branch: `intern/v2-phase-4-review`.
- Base: merged Phase 2 commit `56cabd9722c8aa5dd1f09e0e8d4c644c34058649`.
- Vercel project: `ace-club-lms`.
- Staging Supabase project: `eyphkkginlgoaxflauog`.
- Production branch: `main`; no Production deployment or migration is authorized.
- Phase 3 payment code remains on a separate branch and is not a Phase 4 prerequisite.
- The unrelated flexible-mocks project remains unchanged.

The original Phase 1 migration is preserved byte-for-byte:
`20261018090000_add_v2_product_entitlements.sql`, SHA-256
`ff5c9f0f2ae055c6c3b3e2d67fd64390a9ba4b19deaf14a103ddda71e50047b7`.
Applied Phase 2 migrations and legacy application records must also remain intact.

## Activation sequence

1. The activation record captures approved feedback, progress and concurrent-obligation rules.
2. Local implementation checks cover database/security/browser behavior and Phase 1/2
   regressions, with an exact commit and reviewed migration list.
3. The release operator verifies that Preview configuration points to staging and
   scopes the learning flag to the Phase 4 branch. Production and payment keys remain unchanged.
4. A fresh read-only schema inspection and application recovery export establish
   the baseline. Private exports and credentials remain outside version control.
5. The additive SQL rehearsal checks existing-data preservation and the recovery path.
6. The verified staging SQL Editor applies only the reviewed missing migration set
   while direct database access and Supabase OAuth remain unavailable.
7. New designated staging QA fixtures receive exact identifiers and a fresh baseline.
   Historical Phase 1/2 QA accounts and cleanup packets are not reused as new setup.
8. The review branch Preview runs the twelve gates in the
   [acceptance checklist](../../docs/v2/phase-4/README.md) and
   [test matrix](../../docs/v2/phase-4/acceptance-matrix.md).
9. Exact fixture cleanup compares the fresh preservation baseline, closes temporary
   accounts and retains required audit rows under the documented cleanup contract.
10. The final record identifies checks, Preview URL, commit and limitations. Publication
    review covers changed prose, screenshot text, artifact metadata and neutral commit
    attribution. Merge/readiness and Production release remain separate decisions.

## Evidence status

| Evidence category | Status |
| --- | --- |
| Business-rule confirmation | 80% unique played coverage, retained concurrent obligations and a temporary in-page feedback form approved; Tally replacement remains later work |
| Implementation review | In progress |
| Local database/security tests | Passed five suites / 18 top-level tests, including final Origin-header hardening and activation-packet rejection checks; [sanitized evidence](evidence/local-verification.json). Hosted evidence remains separate |
| Local browser journeys | Passed 12 isolated Chromium journeys with current dependency hashes; [sanitized evidence](evidence/local-browser.json). No browser runtime errors or external requests; hosted verification remains separate |
| Phase 1/2 regression checks | Phase 2 browser regression passed 43 cases with Phase 4 disabled; [sanitized evidence](evidence/phase2-browser-regression.json). Complete Phase 1 and Phase 2 regressions passed: 18 suites / 173 checks and 28 suites / 278 checks respectively |
| Lint, TypeScript and build | Final full lint and webpack production build, including TypeScript and Origin-header hardening, passed |
| Fresh staging metadata and recovery rehearsal | Application-row restore and exact activation rehearsal passed for 78 original tables / 3,883 rows; original ledger retained, seven new private tables and 19 function guards verified. [Recovery report](application-recovery-report.json) records scope and exclusions; this is not a full Supabase platform backup |
| Additive hosted migration/reconciliation | Operator-reported staging SQL Editor result passed with exact migration hash, seven private tables, 19 function guards, original 78-table rows and Phase 1 ledger preserved; [reported evidence](evidence/hosted-activation.json). Website acceptance remains separate |
| Hosted Student/Admin access matrix | Pending |
| Real resource rendering and shared-reference checks | Pending |
| Exact fixture cleanup and preservation | Pending |
| Commit, Preview smoke check and handoff | Pending |

A synthetic payment fixture does not establish Razorpay acceptance. Phase 3 remains
incomplete until its own provider and hosted exit gates pass. Phase 4 can verify
learning behavior against those designated fixtures without taking real payments.
