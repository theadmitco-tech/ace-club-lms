# Phase 2 enrolled schedules — 25 October 2026

Status: Local implementation; shared staging and release remain pending.

The [enrolled-batch decision](../../decisions/enrolled-batch-access-2026-10-25.md)
resolves the previously pending schedule-reader rule. Work continues on the local
`work/phase2-completion-2026-10-25` branch after `47f1569`. This candidate has not
been added to PR #24 or published to the company repository.

## Behavior and authorization

- `/schedule/v2` shows only the caller's enrolled batches with active exact-product
  access and a latest published snapshot. `/schedule` links to it when enabled;
  the existing legacy schedule remains intact.
- Live dates display in IST; outlines retain their missing dates. Editing a draft
  does not change Student output until the next reviewed publication. Unpublishing
  immediately hides the schedule rather than selecting an older published version.
- `/admin/v2/batches/[batchId]/students` lists eligible Students and existing
  memberships. An explicit review confirms enrollment or removal. Expired or
  inactive memberships remain removable. Students cannot access the roster.
- Optimistic revisions reject concurrent edits and stale retries. After an
  interrupted confirmation, the screen requires a roster reload to resolve the
  actual saved state. It never blindly repeats a toggle.
- The Student RPC has no student-ID argument. Authenticated session clients and
  database checks enforce profile, membership, product and publication eligibility.
  No service-role read, legacy-enrollment fallback or cross-request result cache
  is used. DTO validation rejects private fields, invalid scope and duplicates.
- SQL explicitly projects safe publication and event fields; no meeting draft,
  private URL, enrollment roster, purchase reference or revision history is exposed.

## Proposed schema and feature controls

`supabase/migrations/20261025100000_add_v2_enrolled_schedules.sql` adds a separate
V2 membership table, Admin roster/membership RPCs, a private entitlement helper and
the Student schedule RPC. RLS protects membership rows; client roles have no direct
writes. The read-only preflight inventory includes the new table and public RPCs.
The migration has **not been applied to staging or Production**.

`V2_STUDENT_SCHEDULE_ENABLED=true` enables the new routes and Admin enrollment
links only when both existing authoring flags are also enabled. All are off by
default; the existing Production guard still applies. Flags control application
routes; database RPC authorization remains independent of environment flags.

Schedule membership does not reserve seats, take payment or allocate Full Course
registrations. The eight-seat capacity contract remains Phase 3 work. No automatic
backfill or mapping from legacy courses is included.

## Verification

| Check | Result |
| --- | --- |
| Phase 2, including schedule authorization and enrollment concurrency | 154 distinct tests across 13 files passed |
| Phase 1 / legacy regressions | 128 tests across 14 files passed |
| Synthetic browser scenarios | 32 passed; no external requests or browser runtime errors |
| ESLint / TypeScript | Passed |
| Webpack production build | Passed with synthetic localhost configuration |
| Diff whitespace check | Passed |

Total: **282 tests and 32 browser scenarios**. The Phase 2 runner passed 152
checks before two additional route/action cases were added; the expanded ten-case
schedule suite and the final sixteen-case batch suite were rerun and passed.
No final test failures or skips remain. Node 26.12.0, Chromium 155.0.8059.84 and
locked `playwright-core@1.58.2` were used.

The browser suite caught overflow in the new enrollment links for long batch
names. Reusing the existing wrapping card/list styles fixed it; all 320/390/768px
regressions subsequently passed. Initial test-fixture price identity and typed
browser adapter mismatches were corrected before final verification.

[Sanitized browser results and source hashes](enrolled-schedules-browser-2026-10-25.json)
identify the verified screen files. The recorded base commit precedes this local
change; source hashes were checked against the final files. Only external font
imports are removed from the fixture stylesheet.
Tests use synthetic data and disposable Unix-socket PostgreSQL clusters. Browser
fixtures use actual screen sources with synthetic auth/DAL adapters and block
external browser requests. They are UI evidence, not hosted authentication or RLS
acceptance. Database identity tests simulate authenticated roles locally.

Commands:

```sh
npm run test:v2:phase2
npm run test:v2:phase1
CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:v2:browser
npm run lint
npx tsc --noEmit --incremental false
```

The build uses localhost-only synthetic Supabase values with all feature flags
disabled. No live credentials or database connections are required.

## Remaining Phase 2 work

Student schedule eligibility is resolved. Private Meet delivery still needs the
registration contract; content associations and protected recording delivery need
reviewed mappings and preservation evidence. Full Course capacity allocation,
separately approved Phase 2 staging setup, real-session verification and exact-head
CI/Preview checks remain outstanding. No Phase 1 migration was rerun, no shared
records were changed, and no merge or Production operation was performed.
