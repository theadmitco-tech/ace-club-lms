# Legacy content preservation checks

Status: Local tooling. No hosted capture or content migration performed.

The approved preservation-first requirement needs evidence that future content
work retains existing source records. The inventory tool produces read-only SQL
and compares two saved reports offline. It never opens a database connection,
changes content, assigns products or approves a mapping.

## Scope

The fixed inventory covers 17 legacy tables: courses, sessions, materials,
master sessions/materials, practice sets/questions and their master equivalents,
worksheet plans/rules/questions, and all five versioned course-template tables.
Each row's complete JSON representation is SHA-256 fingerprinted, including
titles, links, release times, ordering, associations and question contents.
Column names, types and nullability are fingerprinted separately, including for
empty tables. Rows are matched by UUID rather than position or row count.

Reports contain table names, UUIDs, fingerprints and capture metadata. They omit
raw links, text and answers. Keep real reports in private operator storage rather
than committing them: identifiers, counts and fingerprints remain operational
metadata. Profiles, enrollments, payments, attempts and Student progress are outside
this content inventory. Their preservation requires separate verification.

## Generate and compare

Generate a SQL file locally with a source label identifying the intended project:

```sh
node scripts/v2-content-preservation.mjs sql synthetic-local > /tmp/content-inventory.sql
```

This command only writes SQL. Running that SQL on a shared database requires a
separately authorized operator who verifies the project outside SQL. Current
work authorizes no hosted execution or migrations. The source label is supplied
by the operator and cannot prove that two captures came from the same database.

For a future approved capture, save the single `report` JSON object, without a
SQL-editor wrapper, as `before.json` in private storage. After the separately
approved operation, capture `after.json` with the same label and PostgreSQL
version. Compare the reports locally:

```sh
node scripts/v2-content-preservation.mjs compare /private/before.json /private/after.json
```

Exit codes:

- `0`: every scoped row fingerprint and column shape is unchanged.
- `1`: drift; review the per-table added, removed and changed UUIDs and schema flags.
- `2`: invalid command/input, mismatched source labels, reversed capture times or
  incomplete evidence. Files must each be a JSON object no larger than 64 MiB.

Additions are reported as drift too; the tool never silently accepts changes.
Missing/duplicate tables or row IDs, unexpected fields and malformed hashes fail
validation. Missing database tables, SELECT permissions and filtered RLS reads
abort SQL execution. Use an authorized role with full visibility: `row_security=off`
causes a filtered read to fail rather than bypassing security. There is no fallback
to partial results.

The SQL uses a repeatable-read, read-only transaction, normalized UTC/JSON settings,
a 30-second statement timeout, a two-second lock timeout and rollback. Run it as a
complete script on a fresh connection. If execution fails, roll back or close that
connection and discard the partial result. Do not remove transaction/RLS controls
to make a capture pass.

## Limits and next work

An unchanged report proves equality only for the listed database records and
column shapes between those two captures. It does not verify constraints,
policies, routines, binary files, remote Notion pages, recording bytes or link
availability. It is not a backup, restore rehearsal, authenticated access test or
proof of correct V2 mapping. It cannot detect changes made and reverted between
captures. Hashes cannot restore lost content.

Next inputs for content association work are explicit legacy source IDs for
Quant, Verbal and DI, their intended V2 products/events, and representative
recording/material-only examples. Similar names are not mapping approval. Existing
source content must remain intact; future V2 associations need their own review
and entitlement tests. Private Meet delivery and Full Course seat allocation
remain separate from this inventory.

The [mapping review tool](content-mapping.md) now validates explicit proposed
associations against these fingerprints and exact template revisions. It can be
exercised locally with synthetic fixtures while real source mappings are pending.

Run the synthetic tests with:

```sh
node scripts/v2-content-preservation.test.mjs
npm run test:v2:phase2
```

Tests create disposable Unix-socket PostgreSQL clusters with synthetic content.
No hosted database, Notion page or recording provider is contacted.
