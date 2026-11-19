# Batch archiving

The Batches list provides an Archive batch action and an Archived filter with Restore. Confirmation explains the effect before a change is submitted. Cancellation leaves the batch unchanged.

Archiving atomically unpublishes the current schedule and records the archive state. Enrollment, purchase and batch history remain intact. Restoration returns the batch to the active list without publishing it. A database trigger rejects publication while the batch remains archived. Stale requests require a reload; identical request retries return the existing receipt.

## Activation

The staging operator runs `RUN-BATCH-ARCHIVING.sql` in a new staging SQL Editor query. The expected result is `batch_archiving`. The packet captures and verifies current public-table rows, existing function definitions and permissions, and the original migration ledger within the transaction. Installation does not archive any batch. Production is excluded.

The interface disables archive actions if the archive-state query is unavailable. The staging operator reported successful activation of migration `20261120110000`: all 92 existing public tables, existing permissions and the original ledger were preserved. No batches were archived during installation. `staging-activation-result.json` records the operator-provided result; a hosted archive/restore mutation has not been independently exercised.

## Verification

`node --test scripts/v2-batch-archive.test.mjs` passed against an isolated database. Coverage includes installation preservation, repeat-install rejection, anonymous denial, archive/unpublish, identical request replay, stale restoration rejection, blocked publication while archived, direct table access denial, and private restoration.

The browser fixture uses synthetic state and does not mutate staging records. The focused browser journey passed: cancellation, archive filtering and restoration. The optimized fixture build, TypeScript and focused ESLint checks passed. `results.json` records the browser result and source hashes.
