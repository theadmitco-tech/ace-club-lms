# Pilot V2 Phase 4 — Staging Verification Evidence

Status: Accepted by the Product Owner
Owner: Engineering and Product Owner
Last updated: 18 August 2026

## Authorized boundary

The Product Owner authorized exact Phase 4 Staging migration application and authenticated in-app-browser verification on 18 August 2026. No push, Preview, merge, deployment, Production migration or Production data change occurred.

## Migration application

Engineering used an isolated temporary Supabase work directory containing the already-ledgered Staging migrations plus only the authorized pending migration. The dry run listed exactly `20260818170000_add_student_portal_projection.sql`; excluded migrations, seeds, roles and Vault changes were absent.

| Migration | SHA-256 | Staging result |
|---|---|---|
| `20260818170000_add_student_portal_projection.sql` | `9145a116fedcad7351cb9dee6c2f32fb0a44e8bd2a4c8924c981c82743b0f165` | Applied and ledgered exactly once |
| `20260818173000_fix_student_portal_projection_compatibility.sql` | `18be0ee026e126ea2d46a8fbcd6ed2b05c6aba6f25d0d3937d026b1e36d60de5` | Applied and ledgered exactly once |

The first authenticated request exposed a compatibility finding: Staging `sessions` has no `is_cancelled` column, while the initial projection referenced it twice. Engineering added the ordered corrective migration above. Its focused test, touched-file lint, TypeScript, diff check, exact-hash comparison and isolated single-migration dry run passed before application. The correction preserves active-Student, enrollment/course-access, publication, release-time, function-grant and least-privilege boundaries while removing only the unavailable-column predicates. The authenticated retest passed immediately afterward.

The final read-only ledger check showed both Phase 4 migrations exactly once. The three documented excluded migrations remained excluded.

## Authenticated Student journeys

- Signed-out `/dashboard` access redirected to `/login`.
- One active enrolled Full Course Student loaded Home, Schedule and Resources successfully.
- Full Course Schedule identified the course correctly and grouped chronological published events by Week.
- One active enrolled crash-course Student loaded Home, Schedule and Resources successfully.
- Crash-course Schedule identified the course correctly and grouped its six chronological published events by Day.
- Mock and Support events appeared as first-class Schedule events. A disposable future mock projected its configured venue, reporting time and non-blank instructions correctly.
- Full Course Home showed QA/VA/DI next-class pre-reads and last-class Session materials independently, with multiple QA pre-reads preserved.
- Ended crash-course Home rendered one compact empty state per empty recommendation subsection without Section placeholders.
- Resources exposed present controlled categories, retained Starter Pack discovery, ordered QA/VA/DI topics before non-academic events and narrowed Topic/Category choices immediately without an Apply action.
- Selecting QA, a QA topic and Class Recording updated the URL and result count without a separate submit action.
- At 640px width (the 200%-equivalent review) and 375px width, Home and Resources had no horizontal overflow; navigation and all three dropdowns remained within the viewport.
- The tested browser tab reported no console errors after the compatibility correction.
- With `SUPABASE_SERVICE_ROLE_KEY` supplied only to the local dev-server process, an enrolled Student opened an existing protected worksheet end to end. The page rendered its PDF iframe and received a short-lived signed storage URL; no credential, URL or object path was retained in evidence.
- A disposable future-start crash batch exposed its released Starter Pack through the Student projection before the cohort start date, matching the Home recommendation condition.

## Disposable authorization probe

The bounded `scripts/phase4-staging-probe.mjs` run passed 12/12 checks:

- active enrolled course access;
- future-start course projection;
- released Starter Pack before start;
- pre-release resource denial;
- unpublished-session and attached-resource denial;
- cross-batch resource denial;
- configured mock venue/reporting/instruction projection;
- unenrolled empty-course behavior;
- inactive-account denial;
- signed-out denial;
- draft-batch denial; and
- direct material RLS matching the Student projection.

The probe created only uniquely named future disposable batches/accounts and audited cleanup at zero remaining batches and zero remaining users.

No account identity, authentication artifact, signed URL or private object path is recorded here.

## Automated results

The six focused suites pass 37/37. Phase 4 touched-file ESLint, `npx tsc --noEmit --incremental false`, `git diff --check` and the Production build pass. Full-repository lint retains the signed legacy baseline of 14 errors and 2 warnings outside Phase 4 files.

## Keyboard completion and Product Owner acceptance

On 18 August 2026, Engineering completed a native browser-keyboard traversal using Tab, Shift+Tab, Enter and native select type-ahead against the authenticated Staging-backed localhost Student journey.

- Home focus moved in logical order through the brand, Home, Schedule, Resources, Practice log and Sign out, with reverse traversal returning through the same controls and no trap.
- Schedule focus moved through navigation, day disclosures, event details and resource links. Enter collapsed a day disclosure while retaining focus; Shift+Tab returned to the preceding resource action.
- Resources focus moved through navigation, Sections, Topic, Category and resource actions. Native type-ahead changed Sections to DI and immediately updated the URL without an Apply action.
- The first run found that native Resources selects had no visible focus treatment. Engineering added those selects to the existing 3px gold `:focus-visible` rule. The retest reported a solid `rgb(227, 166, 49)` 3px outline with 3px offset.
- The tested tab reported zero browser-console errors.

After the focus fix, the consolidated 45/45 Pilot V2 tests, TypeScript and guarded Next.js 16.2.4 Production build passed. The Product Owner instructed Engineering to conduct the remaining tests and close Phase 4 and Phase 5. Phase 4 is therefore accepted. This acceptance authorizes no push, Preview, merge, deployment or Production action.
