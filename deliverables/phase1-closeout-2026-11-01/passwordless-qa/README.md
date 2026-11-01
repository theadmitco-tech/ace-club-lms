# Phase 1 final hosted closeout — 2 November 2026

**Complete: Phase 1 catalogue and entitlement foundation on staging Preview.**
The [13-item checklist](../../phase1-exit-gate-audit-2026-11-01/README.md) is complete.
This report supersedes the earlier empty-account diagnostics and incomplete legacy runs.

- Application commit: `155b3fbffc46db94be0fbee70b7b6fd9465a74b4`.
- [Verified LMS Preview](https://ace-club-97csnfzm5-theadmitco-techs-projects.vercel.app/courses/v2): `dpl_EWB7tYjTYzhrndN7WS1waXKKCMaG`, READY; the existing branch alias points here.
- Supabase staging: `eyphkkginlgoaxflauog`.
- QA run: `7e0a3e0a-f1a7-4a61-bd87-a12c6aaaf719`; all 15 generated accounts removed.
- Production remains `dpl_8axtycbJUpFX8cPWhVtkhGf6p9Kj`; all eight Production environment entries match the pre-change metadata. PR #24 is Draft and unmerged. [Boundary receipt](final-boundaries.json).

## Results

| Evidence | Result | Scope |
|---|---|---|
| [Core hosted checks](hosted-results.json) | 184 pass, 0 fail | Actual staging Auth sessions; every subject combination, Full Course distinction, cross-Student isolation, expired/revoked/inactive states, wrong sections, Student Admin-route denial, restricted browser writes. All 12 eligible upgrade price/retained-expiry combinations and rejected upgrade cases. |
| [Concurrent replay](replay-results.json) | 4 pass | Six simultaneous identical replays return the original purchase; four conflicting buyer/subject replays fail. Original amount, expiry and grants remain unchanged. |
| [Student legacy](student-legacy-results.json) | 18 pass | Actual website enrollment, dashboard and schedule; unpublished session page/timeline denial; unreleased/unenrolled RPC and protected-file denial; released PDF; worksheet status/comment save, reload and database persistence; practice listing; enrolled inactive-batch access. |
| [Admin editor and public listing](admin-legacy-results.json) | 8 pass | Actual question add/edit/delete, reload, CSV import, deliberately interrupted delete retaining the question, successful retry, and public batch listing. All editor writes target a new disposable master session. |
| [Operator SQL cleanup/repair](cleanup-repair-user-report.json) | Pass, user supplied | All 15 synthetic purchases removed; original 60-table fingerprint restored; nine missing metadata columns added without rewriting existing question values. |
| [Independent cleanup verification](cleanup-verification.json) | Pass | All 15 generated Auth accounts absent, zero QA profiles/purchases, final course/master fixtures absent, generated password removed from private journal. |

The SQL setup and repair were executed by the user in the staging SQL Editor.
[Provenance](cleanup-repair-provenance.json) records the exact operator script hash.
API/browser tests and account cleanup were executed by the agent. Tests used normal
password sign-in for generated QA identities; no existing user was impersonated.

## Repairs made

1. **Preview enrollment/server access:** the deployed server credential caused the
   reproduced `account_creation` failure. The user explicitly approved a sensitive
   `SUPABASE_SERVICE_ROLE_KEY` override for Preview branch `intern/v2-phase-2-review`
   only, followed by redeployment of the same application commit. Enrollment and
   protected PDF access pass. [Credential-change receipt](preview-server-key-correction.json)
   contains no secret value. The earlier automatic approval rejection was resolved
   by that explicit approval; no bypass was used.
2. **Legacy question editor:** a real save returned `PGRST204`; zero-row queries
   independently confirmed nine absent columns ([preflight](legacy-editor-schema-preflight.json)).
   The user executed [the guarded repair](03-CLEANUP-AND-REPAIR-EDITOR.sql), adding
   the metadata fields and two indexes from the existing editor contract. The
   historical script's heuristic question-classification UPDATE was deliberately
   excluded. The subsequent hosted editor tests pass. No application code change
   or additional deployment was needed for this repair.

The SQL operation first removed only exact QA payment references and verified the
original fingerprint `37f717bc66b73f46bb8b85822e02bd01` across 60 public tables.
It then verified original column values were unchanged after additive schema repair.
Any mismatch would roll back the transaction. These fingerprints include the generated
QA profiles at the baseline point; those owned accounts were subsequently removed.
The cleanup proof does not claim a global Production database comparison.

The original Phase 1 migration was neither reapplied nor edited:
`20261018090000_add_v2_product_entitlements.sql`, SHA-256
`ff5c9f0f2ae055c6c3b3e2d67fd64390a9ba4b19deaf14a103ddda71e50047b7`.
Phase 2 migrations and authoring/publication/schedule flags remain inactive.

## Scope and limitations

- Phase 1 delivers the product/access foundation and approved upgrade estimates.
  Payment-provider checkout and atomic upgrade charging/grant fulfillment remain Phase 3.
  No charge was created. Existing payment environment entries are shared with
  Production, so no provider checkout was invoked; no payment-path code changed.
- Concurrent first-insert races and worksheet route-switch/load races retain their
  existing local regression coverage. The hosted replay test uses an existing synthetic
  purchase; the hosted editor test covers CRUD/import and mutation-failure recovery.
- Existing enrolled-course session metadata can be read through the legacy sessions
  policy. Its student timeline and draft session page filter/deny unpublished items.
  This pre-existing distinction is recorded, not silently reported as direct-table
  draft denial. Phase 2's stronger unpublished-content boundary remains a separate gate.
- Hosted Google OAuth was not retested. Generated QA accounts used normal password
  sign-in; the user's own Student/Admin session acceptance is retained separately.
- Separate product-owner review, PR readiness/merge and Production release are not inferred.

Earlier runs identified test-assumption errors (uppercase text, the wrong Admin path,
streaming-page timing, and an add assertion matching input text) and the two real
configuration/schema defects above. Historical JSON/screenshots are retained; the
passing reports in the table are the final evidence. The failed editor attempt was
not counted as a pass. The Student report contains only its 18 completed checks.

## Local verification and automation

The existing application suite/build/CI results remain in [the parent report](../README.md).
This continuation added 11 passing guard/SQL tests across three scripts, including
actual disposable PostgreSQL setup/cleanup, preservation of unrelated purchases and
question values, and rollback when the expected fingerprint differs. The first local
PostgreSQL attempt was blocked from opening its socket by the sandbox; it passed when
run with the required local-process permission. Final automation lint passes.

[Automation source snapshot](automation/README.md) contains no credentials or browser
sessions. The QA run is finished: **do not rerun its setup or cleanup SQL**, and do not
reuse deleted QA identities. Private staging credentials were not copied into this packet.
