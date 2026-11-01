# Historical hosted Phase 1 test plan

**Superseded on 2 November:** Phase 1 technical evidence and cleanup are complete; see [the final report](../phase1-closeout-2026-11-01/passwordless-qa/README.md). The checkboxes below preserve the earlier plan and are not current status.

This is a historical test plan, not the result record. Candidate:
`155b3fbffc46db94be0fbee70b7b6fd9465a74b4`, staging `eyphkkginlgoaxflauog`.
Use the immutable Preview recorded in the audit. If implementation changes, record
the new exact commit and rerun affected checks. Never use Production or real students
as fixtures. Do not share tokens, session exports, payment references or private rows.

## Read-only staging inspection

The prepared [schema preflight](../phase2-preview-activation/sql-editor/00-schema-preflight.sql)
and [ledger/definition inspection](../phase2-preview-activation/sql-editor/01-ledger-and-definitions.sql)
can be run as whole files in the staging SQL Editor. They are inspection only.
Record project identity from the dashboard, UTC time and operator. Compare against
the 24 October evidence, including migration version `20261018090000` and source
SHA-256 `ff5c9f0f2ae055c6c3b3e2d67fd64390a9ba4b19deaf14a103ddda71e50047b7`.
Do not run the packet's Phase 2 apply file, repair migration history, rerun Phase 1,
or apply the canonical proposal to collect evidence. SQL cannot prove its hosted
project identity by itself. Ledger presence does not alone prove schema equivalence.

The new `/qa/phase1` page provides a sanitized caller-session report. See the
[operator instructions](../phase1-closeout-2026-11-01/verification/README.md).
This helper does not cover every case below or automatically close a gate.

## Security matrix — P1-09 and P1-11

Use designated staging Student A, Student B and Admin accounts. If suitable private
purchase fixtures do not exist, record that dependency; page empty states cannot
prove cross-user isolation. Any later synthetic setup needs a named fixture manifest
and cleanup record and must not modify real accounts or purchases.

| Session / case | Expected result | Current evidence |
|---|---|---|
| Signed out, My access / Admin Products & access | Redirect to LMS login, no private history | Passed in hosted integration check |
| Student A, own My access | Correct records or appropriate empty state | User-pasted My access page confirms empty active access and purchase history; current-candidate Student diagnostic returns count 0. Purchase fixture states still pending |
| Admin, Products & access | Authorized history or appropriate empty state | User confirmed page loads correctly |
| Student A, Student B purchase/grant REST reads | No B records through actual JWT/RLS | User-supplied Student report shows zero foreign purchases; inconclusive until a designated foreign fixture is independently confirmed |
| Student, Admin private page/data | No Admin private data | Local suite passes; exact current hosted negative result pending |
| Anonymous / Student / Admin browser grant RPC | Permission denied before writes | Passed for anonymous (assistant-observed) and Student/Admin (user-supplied reports), all at 155b3fb |
| Browser table insert/update/delete | Permission denied before mutation | Historical 72 privilege checks pass; real-session evidence pending |
| Wrong-section access; expired, revoked and inactive fixtures | Guard denies; another independently valid purchase still works | Historical rollback SQL/local tests pass; hosted fixture-state check pending |
| Direct access URL/RPC after state changes | Server denial; no stale authorization | Pending hosted |

Negative write probes must be restricted to dedicated disposable fixtures and a
reviewed payload. Do not issue real grants or rely on a rollback around HTTP calls.
Prefer privilege inspection until an operator has confirmed the designated test
setup. Existing two-endpoint Admin validation probes do not test the V2 grant RPC.

## Legacy matrix — P1-10

- [ ] Enrolled synthetic Student: dashboard, schedule, recordings and protected
  direct material links retain prior behavior, including an enrolled inactive batch.
- [ ] Released worksheet and practice tracker: save/reload preserves expected
  progress; unreleased page/API/file paths remain denied.
- [ ] Admin worksheet editor: empty/load/change-while-loading, add/edit/delete/import
  refresh and network recovery work without mixing another worksheet's state.
- [ ] Public batch listing and any enabled existing checkout retain baseline behavior.
  Do not initiate a real payment. Record test-provider configuration or the reason
  a checkout check cannot be executed; do not convert absence into a pass.
- [ ] Existing dedicated QA enrollment's `account_creation` failure is retested or
  explicitly triaged against the baseline. New My access/Admin-page acceptance does
  not resolve this issue. The user subsequently explicitly approved a branch-only staging service-key repair; it passed the final enrollment retest. Real profiles were not changed.
- [ ] Fixture setup, persistence and eventual cleanup are recorded separately from
  the 24 October rollback-only SQL checks. A persistent manual QA batch exists in
  historical evidence; its deletion is not authorized by this audit.

For each result, save: check ID, exact commit/Preview, UTC time, role (no identity
details), expected result, actual result, pass/fail/pending, and sanitized evidence.
Keep historical evidence unchanged and identify user-reported versus independently
observed results. Final product review remains separate from technical test execution.
