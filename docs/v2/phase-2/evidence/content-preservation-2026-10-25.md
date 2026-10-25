# Content preservation tooling — 25 October 2026

Local follow-up on `work/phase2-completion-2026-10-25`, based on `e0331fe`.
This tooling is outside Draft PR #24 at `c67cfe7`. No remote branch or PR metadata
was changed for this follow-up.

## Delivered

- Read-only SQL generator for 17 explicit legacy content tables. It fingerprints
  full rows and column shapes without emitting source titles, URLs or answers.
- Offline comparison by UUID: added, removed, changed and schema-drift results.
- Strict input validation, source-label consistency and chronological comparison.
- Failures for missing tables, insufficient permissions and RLS-filtered reads.
- Operator instructions and current Phase 2 checkpoint corrections.

The [operator guide](../content-preservation.md) defines scope, commands, limits
and the source mapping inputs still needed. Reports are not backups and do not
verify external files, Notion content, recordings or protected V2 delivery.

## Validation

| Check | Result |
| --- | --- |
| New content-preservation suite | 11 tests passed |
| Complete `npm run test:v2:phase2` | 165 tests across 14 suite files passed; no failures or skips |
| ESLint on all three changed JavaScript files | Passed |
| Diff whitespace check | Passed |

Node 26.12.0 was used. The first database test attempt was blocked by sandbox
Unix-socket restrictions; it was rerun with approved local process access and
passed. All database tests use disposable local clusters, synthetic content and
TCP disabled. No hosted capture was performed. No app source, dependencies or
schema migrations changed, so the existing build, browser and Phase 1 results
were not rerun or claimed as fresh evidence for this tooling.

Regression cases exercise equal-count row replacement, changed URLs/associations/
ordering/questions/release times, empty-table column drift, missing tables,
duplicate records, partial reports, unknown fields, timezone normalization,
limited-role visibility, read-only enforcement and private error-output handling.

## Files changed

- `scripts/v2-content-preservation.mjs`
- `scripts/v2-content-preservation.test.mjs`
- `scripts/verify-v2-phase2.mjs`
- `docs/v2/phase-2/content-preservation.md`
- `docs/v2/phase-2/README.md`
- `docs/v2/phase-2/preparation-checklist.md`
- `docs/v2/phase-2/review-and-release.md`
- This evidence record.

Phase 2 remains incomplete: exact content mappings, recording-only delivery,
private Meet eligibility, Full Course registration allocation and separately
authorized staging acceptance remain open. No migration, existing Student/course
data change, Production operation or PR merge was performed.
