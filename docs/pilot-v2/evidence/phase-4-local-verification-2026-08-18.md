# Pilot V2 Phase 4 — Local Verification Evidence

Status: Passed locally; Staging verification pending
Owner: Engineering and Product Owner
Last updated: 18 August 2026

## Authorized scope

The Product Owner instructed Engineering to start Phase 4 implementation on 18 August 2026. This record covers local code, one new ordered migration file and non-mutating engineering checks only. No migration was applied, no Staging or Production data was changed, and no push, Preview, merge or deployment occurred.

## Implemented outcome

- Added Home, Schedule and Resources as the three primary Student destinations while retaining Practice log as a secondary destination.
- Reworked Home into a compact summary containing course identity, next event, Recommended Reading and Recommended Practice; removed Next Mock, Recently Released and Explore after Product Owner review.
- Made recommendations section-wise: the immediately previous completed class supplies worksheets and Session materials until the next same-Section class starts; next-class pre-reads appear only after the previous same-Section class ends and remain until the next class starts.
- Omitted empty Section-level recommendation placeholders and retained one compact empty state only when an entire recommendation subsection has no items.
- Added Full Course Week and crash-course Day Schedule views with chronological ordering and no generated empty groups; removed Schedule Section mode after Product Owner review.
- Kept completed published events reachable through Schedule.
- Added released-resource browsing as consistent instant-selection Sections, Topic and Category dropdowns with no Apply button. QA, VA and DI are ordered academically, Topic is limited to the selected Section, Category options reflect the selected Section/Topic, and a server-side RLS-preserving fallback loads flexible-resource metadata before the Phase 4 projection migration is applied. Starter Packs, batch and standalone resources remain visible under All Sections and All Topics without a fake event.
- Added every released Starter Pack to Home Recommended Reading before the batch start date; after that date, Starter Packs remain in Resources.
- Added a legacy-safe crash-course inference so existing crash batches with no projected `course_mode` still group Schedule by Day.
- Presented mocks as first-class events with date/time, venue, reporting time, non-blank instructions and preparation resources.
- Added loading, empty, failure and retry states for the new routes.
- Kept pages as Server Components with narrow Client Components only for disclosure interaction and retry behavior.

## Student projection migration

| Item | Value |
|---|---|
| File | `supabase/migrations/20260818170000_add_student_portal_projection.sql` |
| SHA-256 | `9145a116fedcad7351cb9dee6c2f32fb0a44e8bd2a4c8924c981c82743b0f165` |
| Local state | Created and reviewed; unapplied |
| Staging ledger | Unchanged |
| Production ledger | Unchanged |

The migration replaces `get_student_timeline()` through a new ordered migration while preserving its existing course/session/material shape for current session-detail, recommendation and tracker consumers. It adds course mode, flexible event metadata and a released-resource collection. The security-definer projection requires an active Student profile, current enrollment/course access, published non-cancelled events and release timestamps before resource URLs or content enter the released collection. It adds no table, destructive statement or excluded migration.

## Automated and quality results

| Check | Result |
|---|---|
| `npm run test:templates` | Pass — 9/9 |
| `npm run test:batch-schedule` | Pass — 6/6 |
| `npm run test:flexible-resources` | Pass — 4/4 |
| `npm run test:student-portal` | Pass — 7/7 |
| `npm run test:recommendations` | Pass — 7/7 |
| `npm run test:session-materials` | Pass — 4/4 |
| Phase 4 touched-file ESLint | Pass — zero findings |
| `npx tsc --noEmit --incremental false` | Pass |
| `npm run build` | Pass — Next.js 16.2.4; `/dashboard`, `/schedule` and `/resources` included |
| `git diff --check` | Pass |
| Full `npm run lint` | Signed legacy baseline remains: 14 errors and 2 warnings, all outside Phase 4 touched files |

The six focused suites pass 37/37 checks. The existing Node typeless-package warnings remain non-failing. Changed-file review found no credential, authentication artifact, signed URL, private Student identity or private object path.

### Product-review re-verification — 18 August 2026

After the Product Owner's final Home/Resources card simplification and instant dropdown-filter review, Engineering reran the complete local gate. The six suites passed 37/37, Phase 4 touched-file ESLint had zero findings, `npx tsc --noEmit --incremental false`, `git diff --check` and a clean `npm run build` all passed. The full lint baseline remained exactly 14 errors and 2 warnings outside Phase 4 files.

A read-only `supabase migration list --linked` check confirmed the repository remains linked to documented Staging project `eyphkkginlgoaxflauog`, migrations through `20260818113000` remain ledgered, the three documented excluded migrations remain unapplied, and `20260818170000` remains unapplied. Its SHA-256 remained `9145a116fedcad7351cb9dee6c2f32fb0a44e8bd2a4c8924c981c82743b0f165`. No database row, migration ledger, account, deployment or environment was changed.

## Remaining Staging and manual evidence

Phase 4 is not accepted yet. The next separately authorized work is:

1. dry-run and apply only `20260818170000_add_student_portal_projection.sql` to Staging;
2. inspect the exact function definition, owner, grants and ledger result;
3. verify active enrolled access plus signed-out, inactive, unenrolled, unpublished, pre-release and cross-batch denial;
4. use one sanitized Full Course Student and one crash-course Student to verify Week and Day views respectively;
5. verify one mock with complete venue/reporting/instruction/preparation information;
6. verify batch, Section, event and standalone resource discovery, including protected PDF delivery; and
7. complete keyboard, supported desktop and 200%-zoom review without recording account identities.

No Staging action is authorized by this local record.

## Subsequent status

The Product Owner later authorized Staging application and bounded Student journeys. The resulting application, compatibility correction and remaining checks are recorded separately in the [Phase 4 Staging evidence](phase-4-staging-verification-2026-08-18.md). This local record remains an accurate pre-application snapshot.
