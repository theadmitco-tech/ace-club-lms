# Pilot V3 Phase 5 — Integrated safety verification

Status: **Passed; Phase 5 closed on Local/Staging/Preview**
Environment: Local, Staging (`eyphkkginlgoaxflauog`) and Vercel Preview only
Date: 24 August 2026

## Authorization and boundary

The Product Owner requested Phase 5 on 24 August 2026. Work remained limited to the integrated safety and non-regression outcome in the accepted V3 roadmap. Production was not queried, migrated, deployed or otherwise contacted.

The Staging probe created only UUID-scoped disposable users, one disposable batch, enrollments, one assignment and one attempt. Its `finally` cleanup removed only those fixtures. Exact aggregate restoration and zero remaining disposable users/batches were asserted.

## Source changes

Commit `500d1af` adds:

- `scripts/pilot-v3-phase5-safety.test.mjs` and consolidated `npm run test:pilot-v3` coverage;
- `scripts/pilot-v3-phase5-staging-probe.mjs` for the bounded live isolation and cleanup proof;
- explicit `Cache-Control: private, no-store` on every Student attempt/start/mutation/reset/note API response; and
- result-layout min-width containment so 720 px/200%-zoom-equivalent views keep wide charts local instead of widening the document.

No SQL migration was added or changed.

## Automated and compatibility results

| Gate | Result |
|---|---|
| `npm run test:pilot-v3` | Pass — 32/32 |
| `npm run test:pilot-v2` | Pass — 46/46 existing-LMS regression tests |
| `npx tsc --noEmit --incremental false` | Pass |
| Touched-file ESLint | Pass — zero errors/warnings for JS/TS; CSS is outside the configured ESLint file set |
| `npm run build` | Pass — Next.js 16.2.4, 52 routes generated |
| `git diff --check` | Pass |
| Repository-wide `npm run lint` | Inherited baseline unchanged: 14 errors and 2 warnings outside Phase 5 files |

The V3 suite covers Admin and Student authorization entry points, RLS ownership, private keys/media, idempotency, stale-write rejection, server timing, completed-attempt locks, immutable snapshots, legacy-table non-mutation, application-only rollback, native semantics, visible focus and responsive containment.

## Staging database verification

### Migration and database lint

`supabase migration list --linked` preserved the three known historical local-only exclusions `20260803120000`, `20260803160000` and `20260804120000`, the remote-only `20260821105003` exception, and the already documented manually reconciled Phase 2 ledger state. No push or ledger mutation was performed.

`supabase db lint --linked --schema public,private --level warning --fail-on none` returned no error. It reported only:

- an inherited shadowed/unused variable warning in `reorder_batch_events`; and
- an unused local variable warning in `mutate_mock_attempt`.

Neither warning changes runtime authorization, correctness or privacy.

### Supabase advisors

The read-only Management API advisor result contained no `ERROR` finding.

Mock-related security findings were 15 `INFO` deny-all/RLS-with-no-client-policy findings and eight `WARN` authenticated security-definer RPC findings. The deny-all tables are intentionally server-only. Every flagged Mock RPC sets an empty search path and performs its own Admin membership or Student ownership/entitlement check; the live probe below verified those boundaries fail closed.

Mock-related performance findings were 34 `INFO` and 26 `WARN` recommendations covering foreign-key indexes, unused indexes, RLS init-plan optimization and multiple permissive policies. They are optimization work, not critical/high security or privacy defects, and no Phase 5 exit condition requires a behavior-changing policy rewrite.

### Live isolation probe

`PILOT_V3_PHASE5_LOAD_SERVICE_KEY=supabase-cli node scripts/pilot-v3-phase5-staging-probe.mjs` passed 15/15:

| Check | Result |
|---|---|
| Signed-out assignment denied | Pass |
| Active enrolled Student sees released assignment | Pass |
| Unenrolled Student denied | Pass |
| Inactive enrolled Student denied | Pass |
| Exact start retry is idempotent | Pass |
| Idempotency-key reuse with a changed request is denied | Pass |
| Cross-Student attempt read denied | Pass |
| Cross-Student mutation denied with `42501` | Pass |
| Admin cross-role start denied with `42501` | Pass |
| Signed-out start denied | Pass |
| Question and completed-attempt answer-key readers denied | Pass |
| Pre-review Question Bank direct read denied | Pass |
| Direct private-media download denied | Pass |
| All 64 attempt items retain question/response snapshots | Pass |
| Note creation before attempt completion denied | Pass |

Cleanup result: exact tracked aggregate restoration `true`; disposable batches `0`; disposable auth users `0`.

## Preview and browser verification

Exact source commit `500d1af` deployed successfully:

- Deployment: `dpl_AMysKwGhYz3hmARNFhwB8r6CNzvJ`
- Preview: `https://ace-club-7wew1lz2z-theadmitco-techs-projects.vercel.app`
- State: `READY`
- Preview environment validation: passed
- Authenticated function region: `sin1`

### Admin

- Mock reporting showed Completed, Not Started and In Progress assignment states.
- Desktop and 760 px checks showed semantic tables, named controls, image alternatives and no document overflow.
- Result detail exposed the four semantic tabs, visible 3 px focus outline, raw `8/64` and `13%`, and no mutation control.
- The initial 720 px/200%-zoom-equivalent check found document overflow from result-grid min-content sizing. The Phase 5 CSS correction moved wide behavior back inside the chart container.
- The exact corrected Preview at 720 px reported document widths `714/714`, locally scrollable chart content, 20 DI rows and 20 focusable question links.

### Student

- The Mock library at 720 px showed completed, not-started and in-progress journeys with no document overflow, unnamed control or missing image alternative.
- The completed result reconciled at `8/64`, `13%`, four section tabs, 20 DI rows and one semantic pacing chart.
- Question 1 showed the exact selected answer, correct answer and existing Student note; no explanation appeared.
- The Student result and question detail had no document overflow or browser console warning/error.

### Private cache boundary

An authenticated Vercel CLI request to the exact deployment's Student attempt endpoint returned `401`, `Cache-Control: private, no-store`, `x-vercel-cache: MISS`, and a `sin1` function response.

## Rollback and non-regression rehearsal

- Phase 5 adds no schema dependency, so application rollback does not require deleting or rewriting Mock history.
- The closed Phase 4 Preview/source continued to read the current Staging schema and render Admin reporting, which proves the prior application remains compatible with the additive database state.
- Reverting the application from `500d1af` to accepted Phase 4 head `648629a` would remove only the Phase 5 response-header/layout/test changes; all questions, versions, assignments, attempts, answers, notes and media remain retained.
- The 46/46 Pilot V2 suite verifies existing Practice, Schedule, Resources, Progress, batch, recording, Session-material and tracker contracts remain unchanged.

## Final assessment

No critical/high authorization, privacy, isolation, history, compatibility or rollback issue remains open. The advisor recommendations are recorded as non-blocking optimization work. Phase 5 is closed on Local/Staging/Preview; Phase 6 and every Production action remain separate decisions.
