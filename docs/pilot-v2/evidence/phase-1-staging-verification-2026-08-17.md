# Pilot V2 Phase 1 Staging Verification — 17 August 2026

Status: Engineering checks passed; Product Owner accepted Phase 1
Environment: Supabase Staging `eyphkkginlgoaxflauog`; local Next.js application backed by Staging
Production impact: None

## Authorized scope and migration isolation

The Product Owner authorized Staging-only application of `20260817090845_add_versioned_course_templates.sql` and Phase 1 Staging verification. Engineering linked to the exact Staging project, built an isolated migration work directory and verified the migration SHA-256 as `e8f4fb8d3ccb6a50ff148395ef172619ff2b612736169967798c1c4bc249e72c` in both locations.

The dry run listed exactly `20260817090845_add_versioned_course_templates.sql`. The migration applied successfully and is ledgered exactly once. The excluded versions `20260803120000`, `20260803160000` and `20260804120000` remain absent. No Production command, Preview, deployment, merge or push occurred.

## Schema, seed and authorization results

| Check | Result |
|---|---:|
| Stable templates | 4 |
| Initial revisions | 4 |
| Current template events | Full 31; CR 6; RC 6; DI 5 |
| Seed Sections | 7 |
| Initial seeded events | 48 |
| Initial reusable associations | 13 |
| Crash events with wrong 20:00/60-minute defaults | 0 |
| Crash events with wrong instructor | 0 |
| Forbidden recording/Session-material template resources | 0 |
| Template tables without RLS | 0 |
| Template policies | 10 |
| Anonymous template-table privileges | 0 |
| Anonymous revision-function execution | Revoked |
| Authenticated revision-function execution | Granted |
| Revision function | `SECURITY INVOKER` |
| Template constraints | 51 |
| Current-revision ownership trigger | 1 |

The Supabase Security Advisor and Performance Advisor each reported zero errors after the migration. Their Staging project contains 60 pre-existing security warnings, 177 pre-existing performance warnings and 43 performance suggestions; the visible warning results contained no Phase 1 `course_template` object. Direct CLI advisor and database-lint commands could not authenticate the Supabase temporary login role, so the signed-in Staging dashboard was used for the advisor result. The direct schema, grant, RLS and function checks above remain the authoritative Phase 1 object evidence.

## Authenticated Admin journey

An active Staging Admin opened `/admin/templates` through the local application backed by Staging and verified:

- exactly four templates render with event counts 31, 6, 6 and 5;
- the CR definition renders all six approved topics at 20:00 IST for 60 minutes with Tanya;
- preview includes event order, event type, Section, relative day/time, duration, instructor/venue, publication default and reusable-resource count;
- a zero-minute duration is blocked before save with the actionable message `Event 1 duration must be between 15 and 720 minutes.`;
- a valid optional-venue edit appears in the preview and saves as a new immutable revision;
- the saved revision reloads with the previewed value;
- a stale expected revision is rejected without creating a revision; and
- temporary verification values were removed in a later immutable revision, leaving the current CR definition identical to the approved seed.

The journey exposed and fixed one Server Actions module-boundary defect before acceptance: the `'use server'` module exported a non-function initial-state object. The state now lives in the Client Component; focused tests, targeted ESLint and TypeScript passed after the fix.

Staging retains immutable CR revision history through Revision 6. This history is intentional verification evidence; the current revision contains no temporary verification venue or instruction.

## Existing-batch non-regression

The four anonymous Phase 0 Staging batch aggregates were re-read after the migration and revision journey. All values remained identical:

| Sample | Sessions | Published | Reusable snapshots | Batch-owned resources | Enrollments |
|---:|---:|---:|---:|---:|---:|
| 1 | 31 | 31 | 2 | 2 | 0 |
| 2 | 31 | 31 | 2 | 1 | 0 |
| 3 | 31 | 31 | 2 | 0 | 0 |
| 4 | 31 | 31 | 13 | 6 | 1 |

The migration does not alter `courses`, `sessions`, `materials`, enrollments or tracker objects. No batch is assigned a template identity in Phase 1. Recordings and Session materials remain batch-owned and cannot be template resources.

## Access and UI findings

- Signed-out `/admin/templates` access redirected to sign-in.
- An inactive Staging account was denied portal access.
- An active Admin could list, preview and save revisions.
- A missing keyboard focus ring on template-selector buttons was found during the browser journey and corrected in the touched Admin stylesheet.
- The Product Owner must still perform the subjective desktop, keyboard and 200% zoom review before accepting the Phase 1 interface.

## Exit position

All four Phase 1 engineering exit checks in the Product Roadmap pass.

## Product Owner acceptance addendum

On 17 August 2026, the Product Owner reviewed and accepted the four current template revisions and the final editing workflow. The accepted current Staging display was:

| Template | Current events | Revision |
|---|---:|---:|
| Full Course | 30 | 3 |
| Critical Reasoning Crash Course | 6 | 7 |
| Reading Comprehension Crash Course | 6 | 1 |
| Data Interpretation Crash Course | 6 | 2 |

The Product Owner confirmed that these current definitions look correct and may be revised later through the versioned editor. The original seed counts recorded earlier in this evidence remain the historical migration result, not a claim about the later accepted current revisions.

The final browser review verified:

- keyboard Tab order through navigation, all four template selectors, Template title, Review changes, Save template and Revision history;
- visible focus treatment on buttons and the existing border/box-shadow treatment on form controls;
- Enter activation for template selection, the top-right no-change review notification and Revision history;
- no page-level horizontal overflow at the normal 1440px desktop layout; and
- no page-level horizontal overflow with all critical controls visible at a 720px CSS viewport, the layout equivalent of 200% zoom from 1440px.

All current Instructions values were blank. The Product Owner retained Instructions for future Student display with the binding rule that blank/whitespace-only Instructions render no Student-facing element or placeholder.

Phase 1 is accepted. Phase 2, push, merge, deployment and every Production action remain separately gated.
