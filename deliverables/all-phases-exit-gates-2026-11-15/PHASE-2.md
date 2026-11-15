# Phase 2 — Course, session and live-class publishing

**Status: original staging phase gates supported; current combined local regression recorded separately.**

Review date: 15 November 2026 (Asia/Kolkata).

Checked items retain their original phase scope and evidence attribution. Historical hosted results are not relabeled as tests of the current combined candidate. Fresh local results are recorded in [local-regressions.json](local-regressions.json); the [inherited evidence index](inherited-evidence-index.json) preserves source hashes. No hosted or Production mutation is part of this review.

[Original phase evidence](../phase2-hosted-acceptance/EXIT-GATES.md) remains the authority for historical hosted outcomes. Product Owner acceptance of the final combined candidate and Production release are separate.

| Check | Exit gate | Evidence boundary |
| --- | --- | --- |
| [x] P2-01 | Offering configuration and editing are supported. | Historical four-offering authoring plus current model tests; the later simplified Admin navigation follows the approved three-subject UI change. |
| [x] P2-02 | Subject sessions use migrated existing material. | Historical 19 assets / 33 placements; exact source/reference comparison retained. |
| [x] P2-03 | Session heading and four content collections remain independent. | Current authoring/session validation and historical save/reopen evidence. |
| [x] P2-04 | Shared recordings reuse stable references. | Historical shared-asset/provider-reference comparison; no re-upload requirement. |
| [x] P2-05 | Only live classes require dates, times and optional private meetings. | IST scheduling and private-meeting authorization suites. |
| [x] P2-06 | Non-live course/session content remains undated. | Undated authoring and publication regressions. |
| [x] P2-07 | Offering publication includes its outline. | Revision-pinned course/outline publication tests. |
| [x] P2-08 | Preview, edit, publish, unpublish and republish are safe. | Stale-revision, retry and immutable-history checks. |
| [x] P2-09 | Universal publishing has a visible reviewed scope. | Explicit scope/fingerprint contract and historical four-library publication. |
| [x] P2-10 | Reading titles are independently editable and delivered. | Reading-renderer and title comparison coverage. |
| [x] P2-11 | Student preview retains content, placement and order. | Historical real PDFs/Notion embeds; current rendering/material regressions. |
| [x] P2-12 | Migration avoids loss, duplication and unintended publication. | Historical import source fingerprints and idempotent replay; current import safety. |
| [x] P2-13 | Private meetings require eligible live registration. | Entitlement, enrollment, registration and direct-route boundaries. |
| [x] P2-14 | Admin class completion is audited without asserting attendance. | Completion/replay tests; attendance remains separate. |
| [x] P2-15 | Publication, completion, recording, feedback and attendance remain separate states. | Current delivery/learning integration and preserved publication revisions. |
| [x] P2-16 | Existing mocks remain unchanged. | Historical original-data preservation and fresh legacy regressions. |
| [x] P2-17 | Students cannot read drafts, unpublished content or Admin data. | Role, RLS and protected-resource checks. |

**Fresh local result:** 28 suite runs / 278 passing tests; zero failures. Execution details and source hashes appear in the regression report.

## Current combined-candidate closure

- [x] Fresh synthetic browser regression: 43 cases passed, zero runtime errors and zero external requests. The [final browser report](phase2-browser-results.json) and [selector reconciliation](phase2-browser-selector-review.json) retain the initial 41-pass/2-failure attempt and the justified harness-only correction. Keyboard focus restoration, cancellation, deferred saving and publication lifecycle assertions remain intact.

- [ ] Hosted regression on the final deployed combined candidate, recorded under Phase 6.
- [ ] Final combined-candidate Product Owner decision.
