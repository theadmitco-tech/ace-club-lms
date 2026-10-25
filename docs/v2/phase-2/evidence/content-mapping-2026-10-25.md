# Content mapping review — 25 October 2026

Local follow-up on `work/phase2-completion-2026-10-25`, based on `7688151`.
This work is outside Draft PR #24 at `c67cfe7` and has not been pushed.

## Implemented

An offline review tool joins explicit source-material fingerprints to exact V2
template revisions and event identities. It reuses the application template
validator and supports undated outline targets. Output enumerates product and
section scope without wildcard expansion, along with source/target coverage and
a checksum binding the reviewed evidence. Stale sources, schema drift, stale
target revisions, duplicate mappings and invalid product sections fail validation.

Every successful report is `review_required`. It neither approves curriculum nor
imports, publishes, grants access or reads a shared database. Source-item types
and remote asset availability cannot be established from fingerprints. See the
[workflow and limits](../content-mapping.md).

## Verification

| Check | Result |
| --- | --- |
| New mapping suite | 11 tests passed |
| Complete `npm run test:v2:phase2` | 176 tests across 15 suite files passed |
| ESLint on the two new scripts and Phase 2 runner | Passed |
| Diff whitespace check | Passed |

No final failures or skips. Tests use Node 26.12.0 and synthetic data. The first
sandboxed CLI test could not spawn its Node child process (`EPERM`); the suite
passed with approved local process access. The complete runner used disposable
local PostgreSQL clusters with TCP disabled, without hosted connections.
The existing browser, build and Phase 1 checks were not rerun: no application,
dependency or migration changes were made. Their historical results remain
separate from this tooling evidence.

Coverage includes explicit sharing across all four products, distinct source IDs,
multiple materials per event, incomplete/malformed input, stale/deleted sources,
cross-template event rejection, correct product sections, no invented live timing,
review checksum stability/invalidation, input preservation and generic CLI errors.

## Changed files

- `scripts/v2-content-mapping.mjs`
- `scripts/v2-content-mapping.test.mjs`
- `scripts/verify-v2-phase2.mjs`
- `docs/v2/phase-2/content-mapping.md`
- `docs/v2/phase-2/content-preservation.md`
- `docs/v2/phase-2/README.md`
- This evidence record.

Source courses/templates for Quant, Verbal (CR/RC) and DI remain requested input.
Exact material IDs and intended targets must then be reviewed. No real mapping
has been accepted. Protected recording-only delivery and separately approved
staging verification remain outstanding. PR #24, Production, migrations and
existing Student/course data were unchanged.
