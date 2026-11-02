# Phase 4 Preview activation

Status: Phase 4 schema activation, authenticated workflow checks, real recording
playback and responsive visual checks have passed in staging. The [latest reviewed LMS Preview](https://ace-club-dd78or5n2-theadmitco-techs-projects.vercel.app)
is READY at `c0c4e3e65129bd24e7c46de57a82f29916f2a74f`. The exact 85-table QA baseline was restored and all nine generated accounts were removed. Phase 4 staging acceptance is complete;
Production remains unchanged.

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
| Implementation review | Local implementation/security review completed; hosted behavior remains under acceptance |
| Local database/security tests | Passed five suites / 20 top-level tests, including final Origin-header hardening and activation-packet rejection checks; [sanitized evidence](evidence/local-verification.json). Hosted evidence remains separate |
| Local browser journeys | Passed 13 isolated Chromium journeys, including a bounded 31-session mobile outline with current dependency hashes; [sanitized evidence](evidence/local-browser.json). No browser runtime errors or external requests; hosted verification remains separate |
| Phase 1/2 regression checks | Phase 2 browser regression passed 43 cases with Phase 4 disabled; [sanitized evidence](evidence/phase2-browser-regression.json). Complete Phase 1 and Phase 2 regressions passed: 18 suites / 173 checks and 28 suites / 278 checks respectively |
| Lint, TypeScript and build | Final full lint and webpack production build, including TypeScript and Origin-header hardening, passed |
| Fresh staging metadata and recovery rehearsal | Application-row restore and exact activation rehearsal passed for 78 original tables / 3,883 rows; original ledger retained, seven new private tables and 19 function guards verified. [Recovery report](application-recovery-report.json) records scope and exclusions; this is not a full Supabase platform backup |
| Additive hosted migration/reconciliation | Operator-reported staging SQL Editor result passed with exact migration hash, seven private tables, 19 function guards, original 78-table rows and Phase 1 ledger preserved; [reported evidence](evidence/hosted-activation.json). Website acceptance remains separate |
| Hosted Student/Admin access matrix | Passed: 81 distinct assertions in the [hosted report](../phase4-hosted-acceptance/hosted-results.json), including role/access denials, subject-only gating, confirmed browser feedback, Admin class completion and missed-class reporting. The report also retains two inconclusive provider API observations and one repeated environment assertion |
| Real resource rendering and shared-reference checks | Five protected PDFs passed authorized and denied-access checks; both original Notion embeds rendered. The Notion API paths remain inconclusive. Actual published Quant/DI recording references match Full Course; the real YouTube player passed 11 provider checks, including advancing playback and server-confirmed samples without creating feedback. [Resource and provider evidence](../phase4-hosted-acceptance/README.md) |
| Exact fixture cleanup and preservation | Passed: the [operator-supplied receipt](../phase4-hosted-acceptance/cleanup-result.json) confirms baseline `27145d216badf73e85ee4a42930499a2` across 85 tables; [independent account checks](../phase4-hosted-acceptance/account-cleanup.json) confirm all nine QA identities absent and zero generated profiles/purchases |
| Commit, Preview smoke check and handoff | Implementation `9f865df` and mobile outline fix `c0c4e3e` are pushed. The [final visual/environment report](../phase4-hosted-acceptance/visual-results.json) verifies the exact latter commit, staging project, 31-session outline and desktop/mobile layout. Draft PR creation returned integration 403; no PR exists yet |

A synthetic payment fixture does not establish Razorpay acceptance. Phase 3 remains
incomplete until its own provider and hosted exit gates pass. Phase 4 can verify
learning behavior against those designated fixtures without taking real payments.

The [prepared PR description](pr-description.md) and [title](pr-title.txt) remain
available for a Draft PR. GitHub integration access denied the creation request;
the prepared text does not establish that a PR has been created or merged.

## Completed closeout and separate handoff

The exact SQL cleanup preserved the real libraries and restored the 85-table baseline.
All nine generated Auth identities were removed after that receipt; independent API
checks confirmed no generated profiles or purchases remain. The temporary QA password
was removed. Historical attempts remain available without being relabeled as passing runs.

Real playback, mobile layout and six final Preview smoke checks passed. The temporary
LMS feedback form is the approved replacement for the unavailable Tally form. Phase 3
payment fulfillment remains separate. Draft PR creation still requires repository
access beyond the connected integration's current permissions; merge and Production
release remain separately controlled.
