# Live-class editing application packet

Status: rehearsed in disposable PostgreSQL and applied to staging, as reported by the deployment operator in `staging-application.json`. The SQL Editor result confirms preservation of 92 public tables, existing rows, metadata and migration records. Published schedules remained unchanged. This result is separate from hosted browser acceptance. Production application has not occurred.

`00-READ-LIVE-CLASS-EDITING-BASELINE.sql` provides read-only table inventory, ledger metadata, and exact definitions of the functions affected by the change. Environment output belongs in a private evidence location. `migration-manifest.json` distinguishes the new migration source SHA-256 from the generated packet SHA-256 and records old/new function-body MD5 values.

`RUN-LIVE-CLASS-EDITING.sql` is the single transactional application packet for a separately authorized staging change. The deployment operator must verify the target, backup/recovery reference, read-only baseline output, and manifest before application. The packet rejects already-recorded migration versions, missing baseline versions, unexpected old function bodies/configuration/permissions, and unrecorded helper functions.

The packet discovers and locks every current public table, captures row counts and hashes, and verifies them after the function changes. The expected staging inventory is 92 public tables; the guard is dynamic rather than an old fixed table list. It also preserves original function metadata and grants, relation/column/default metadata, policies, constraints, indexes, triggers, views, and the entire original migration ledger. Only three reviewed function bodies are replaced, one private helper is added, and one exact-source migration record is appended. Course publication, payment, enrollment, and application data remain untouched.

The migration enables new private draft revisions containing renamed, added, removed, or reordered live classes. Existing class subjects and outline identities remain fixed; removed class identities cannot be reused. Course-session identities cannot become live-class identities. Completed-class titles, subjects, timing, and instructors are checked against their completion publication both during draft save and publication. Previously saved drafts that conflict with completed history must be corrected before publication. Legacy requests without title/subject metadata remain compatible.

Reproduction:

```sh
python scripts/phase3/prepare-live-class-editing.py
node --test scripts/v2-batch-authoring.test.mjs scripts/v2-live-class-editing-database.test.mjs scripts/phase3/live-class-editing-activation.test.mjs
```

The domain/backend suite passed 26 checks. The packet rehearsal passed separately, including rejected old-source/permission drift, row/metadata/ledger mutation rollback, preservation of current rows changed before execution, exact new ledger source, and duplicate-application rejection. The disposable fixture is synthetic; it does not establish that staging has the expected 92 tables or that its current functions match. The read-only baseline and packet preflight establish those facts at application time.

If application fails, the transaction rolls back. After successful application, rollback requires a reviewed forward migration or application feature rollback; historical revisions, publication records, and the migration ledger must remain preserved. Existing migration files must not be replayed as a rollback. Production changes remain separately controlled.
