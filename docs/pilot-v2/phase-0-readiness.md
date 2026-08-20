# Pilot V2 — Phase 0 Readiness

Status: Complete — Phase 1 transferred to Engineering
Owner: Engineering and Product owner
Last updated: 17 August 2026

## Outcome

Pilot V2 now has a verified Git, deployment, Supabase ledger/schema, representative batch and application-flow baseline. The technical Phase 0 handoff is complete. No application code, migration, database row, storage object, environment variable or deployment was changed by this Phase 0 work.

The technical baseline and the Product Owner's confirmed [template/interface specification](template-interface-specification.md) close Phase 0. On 17 August 2026 the Product Owner approved the exact template defaults, existing Admin visual language, plan set, local implementation and creation of one additive migration. No staging or Production application is authorized.

## Authorization boundary

Approved now:

- documentation;
- read-only Git, Vercel and Supabase discovery;
- interface and implementation planning; and
- creation of the Phase 0 working branch.

Not approved:

- application implementation;
- a migration or migration-ledger repair;
- staging or Production mutation;
- modification of an existing batch;
- Preview or Production deployment; or
- merge to `main`.

## Git and deployment baseline

| Item | Recorded state |
|---|---|
| Freshly fetched `origin/main` | `c3bc1851553d44aaa48c88f542e64bf9ae68da1d` |
| Start commit | `c3bc1851553d44aaa48c88f542e64bf9ae68da1d` |
| Phase 0 branch | `codex/pilot-v2` |
| Working tree at branch creation | Clean |
| Branch source | Exact updated `origin/main` |
| Pilot V1 Production merge | `7c35466a34d20726945544ae98d2e368ca277b01` |
| Current Production deployment | `dpl_8E58rULukrL5p4rpuR6VzsqXWXhf`, Ready |
| Current Production source | `c3bc1851553d44aaa48c88f542e64bf9ae68da1d` |
| Current Production origin | `aceclub.theadmitco.com` |

The current Production source is no longer the Pilot V1 merge alone. PR #17 deployed the approved Recommended Reading correction before this Phase 0 session. Pilot V2 planning must treat that behavior as inherited baseline rather than reimplementing it.

The prior `codex/pilot-v2-handoff` worktree remains untouched with its pre-existing uncommitted documentation changes.

## Environment baseline

| Scope | Project/reference | Read-only result |
|---|---|---|
| Staging Supabase | `eyphkkginlgoaxflauog` | Reachable; schema and ledger inventoried |
| Production Supabase | `owmlxsnzogfapotmjrqk` | Reachable; schema and ledger inventoried |
| Vercel project | `ace-club-lms` | Current Production deployment is Ready at the start commit |
| Local/Preview rule | Staging only | Preserved |
| Production rule | Production only | Preserved |

No environment-variable values were read or recorded. The repository continues to require separate public URL/key and server-only service-role variables, with `NEXT_PUBLIC_*` treated as browser-visible.

## Migration ledger inventory

Staging and Production report the same 16 ledgered versions:

1. `20260731051000`
2. `20260731062700`
3. `20260731110000`
4. `20260731150000`
5. `20260731160000`
6. `20260731170000`
7. `20260731180000`
8. `20260801085900`
9. `20260801090000`
10. `20260802100000`
11. `20260802180000`
12. `20260802230000`
13. `20260802234500`
14. `20260802235900`
15. `20260811170000`
16. `20260813081141`

The repository also contains these three explicitly excluded versions, absent from both ledgers:

- `20260803120000_add_student_practice_log.sql`;
- `20260803160000_add_admin_practice_progress.sql`; and
- `20260804120000_realign_weekly_course_schedule.sql`.

Do not apply, repair, rename, delete or mark any excluded version as applied. The tracker/Admin objects exist despite their two missing ledger entries, and the Production schedule generator has semantic similarities to the excluded weekly migration despite that version remaining absent. This is reconciliation evidence, not repair authorization.

## Schema and storage baseline

- Staging and Production expose the same 21 public tables, all with RLS enabled.
- Key table column, constraint, index and policy inventories match across environments for `courses`, `sessions`, `materials`, `master_sessions`, `master_materials`, `enrollments` and `student_question_logs`.
- Both environments have the private `course-materials` bucket with a 50 MB limit and PDF-only MIME allowlist.
- Existing `courses` store one start date and `Asia/Kolkata` timezone but no template identity or immutable template revision.
- Existing `sessions` store batch, Master link, title, integer order, start/end, publication, class type and instructor. They do not separate event type from academic Section and do not store all approved mock/venue/reporting/instruction fields.
- Existing `materials` require one session and support only the shipped types. They cannot represent whole-batch, Section-only or standalone resources.
- Existing `master_sessions` and `master_materials` represent the current reusable Full Course only; they are not a four-template editor model.

## Representative batch inventory

No course titles, IDs, Student identities, file paths or URLs were recorded.

| Environment | Anonymous batch sample | Sessions | Published | Reusable snapshots | Batch-owned resources | Enrollment count |
|---|---:|---:|---:|---:|---:|---:|
| Staging | 1 | 31 | 31 | 2 | 2 | 0 |
| Staging | 2 | 31 | 31 | 2 | 1 | 0 |
| Staging | 3 | 31 | 31 | 2 | 0 | 0 |
| Staging | 4 | 31 | 31 | 13 | 6 | 1 |
| Production | 1 | 30 | 30 | 33 | 11 | 11 |

The staging samples demonstrate independent batch snapshots and different batch-owned recording/Session-material counts. Production aggregates have changed since the Pilot V1 rollout evidence as expected for a live programme; Phase 0 made no change.

## Schedule-generator drift

| Property | Staging | Production |
|---|---|---|
| Expected generated sessions | 31 | 30 |
| Orientation handling | Active one-hour Orientation case | No active Orientation in generated set |
| `anon` execute | Granted | Revoked |
| `authenticated` execute | Granted | Granted |
| Definition fingerprint | `af482b31baf65df4587f6d3680714073` | `65c26f69c89a89692d2d3972e9b82ae9` |

Both implementations perform an internal Admin check, but the direct grant and semantic drift must be reconciled in the later reviewed V2 migration plan. No general migration push is safe.

## Current application flow map

| Surface | Current shape | Phase 0 implication |
|---|---|---|
| Admin batches | `src/app/admin/courses/page.tsx`, 732-line Client Component with direct table writes and generator/sync RPC calls | Replace the V2 creation path with a small interactive client over a server-only authorized boundary and one atomic/idempotent database operation |
| Admin schedule | `src/app/admin/sessions/page.tsx`, direct reads/writes, drag reorder and bulk date/material updates | Consequence preview and confirmation require server-owned eligibility, locking, revision and release calculations |
| Session detail | `src/app/admin/sessions/[id]/page.tsx`, direct session/material/practice mutations | Do not extend the legacy broad editor as the primary V2 event/resource architecture |
| Master curriculum | `src/app/admin/curriculum/page.tsx`, edits one `master_sessions`/`master_materials` model | Introduce four versioned templates without structurally syncing existing batches |
| Batch resources | `src/app/admin/recordings/page.tsx`, recording RPCs plus protected Session-material Route Handlers | Preserve batch ownership and private-file boundaries while adding new resource scopes |
| Student Home | `src/app/dashboard/page.tsx`, Server Component with server-side role check and timeline RPC | Reuse the server boundary; add Home/Schedule/Resources projections without client-side authorization |
| Recommendations | `src/lib/studentTimeline.ts` and `src/lib/server/studentTimeline.ts` | PR #17 is inherited baseline; preserve section-wise collections and timing |
| Private files | protected Route Handlers plus `materialFiles.ts` | Continue active-account, enrollment, publication, release, path-prefix, no-store and short-lived signed delivery checks |

## Next.js 16 conventions recorded

Repository version: Next.js `16.2.4`, React `19.2.4`. The branch does not enable Cache Components.

The following bundled guides were selected from the installed dependency matching the lockfile:

- `01-app/01-getting-started/05-server-and-client-components.md`;
- `01-app/01-getting-started/15-route-handlers.md`;
- `01-app/02-guides/authentication.md`;
- `01-app/02-guides/data-security.md`;
- `01-app/02-guides/forms.md`;
- `01-app/02-guides/caching-without-cache-components.md`;
- `01-app/01-getting-started/10-error-handling.md`; and
- `01-app/01-getting-started/17-deploying.md`.

Recorded implementation rules:

- default to Server Components and keep Client Components narrow and interactive;
- keep privileged data access in `server-only` modules;
- treat Server Actions and Route Handlers as public endpoints and re-authorize every mutation;
- validate client input and resource ownership at the server boundary;
- use a consistent data-access layer rather than mixing privileged access throughout components;
- model expected validation/conflict errors as return values and unexpected failures through route error boundaries;
- do not cache personalized or release-sensitive data; the project uses the non-Cache-Components model; and
- deploy only after the repository environment guard, build and authorization checks pass.

## Findings

| ID | Severity | Finding | Disposition |
|---|---|---|---|
| V2-P0-01 | Medium | The handoff still described Pilot V1 as the current Production source, while Vercel serves PR #17 commit `c3bc185` | Correct the Phase 0 baseline and treat Recommended Reading as inherited behavior |
| V2-P0-02 | High planning risk | Staging and Production generator definitions/grants differ despite matching ledgers | Preserve both environments; design one explicit additive V2 migration and staging reconciliation plan; never general-push migrations |
| V2-P0-03 | Phase 1 implementation | Current schema cannot represent four editable templates, independent event type/Section or non-session resources | Product Owner later approved one local additive Phase 1 migration file; remote application remains separately gated |
| V2-P0-04 | Medium implementation risk | Current Admin batch/schedule flows are large Client Components with multi-step direct writes | Move V2 mutations behind server authorization and atomic/idempotent database functions |
| V2-P0-05 | Closed 17 August 2026 | Product Owner supplied the three crash-course curriculum screenshots and confirmed schedule, instructor, Full Course, resource and Admin-interface defaults | Exact approved rows and interface contract recorded in `template-interface-specification.md` |

## Exit-gate state

- [x] Four exact template definitions are approved.
- [x] Admin Phase 1 interface specification is approved; Phase 1 makes no Student interface change.
- [x] Git, deployment, environment, schema and ledger state are recorded.
- [x] Existing batches are classified as immutable independent snapshots by default.
- [x] Implementation, additive data, compatibility/rollback and staging-verification plans are drafted.
- [x] The Phase 0 plan set received Product Owner approval on 17 August 2026.

Exact next action: Engineering implements and verifies Phase 1 locally. Do not apply the additive migration to staging or Production without a new exact Product Owner instruction.
