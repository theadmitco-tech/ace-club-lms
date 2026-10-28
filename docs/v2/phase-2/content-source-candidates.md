# Candidate legacy content sources

**Superseded by the [25 October course-model correction](../decisions/course-model-correction-2026-10-25.md).** The source-choice question is withdrawn. Legacy short-format schedules below are historical findings, not candidate substitutes for complete course content. No mapping was approved.

Status: Proposed sources from repository inspection; no curriculum mapping
approval or hosted verification. Recorded 25 October 2026 after local `527e672`.

The repository supplies the template names, so they need not be reconstructed
from memory. The remaining choice is which sources should supply each V2 product.

| V2 destination | Candidate legacy source | Repository evidence | Still to confirm |
| --- | --- | --- | --- |
| `full_batch` | Full Course (`full-course`) | Quant `qa`, Verbal `va`, DI `di`, plus Programme `programme` sections | Current revision, included academic content and treatment of Programme events |
| `quant_crash` | Quant section of Full Course | Six academic Quant curriculum keys; no separate Quant Crash template is seeded | Whether these six sessions are the intended Crash curriculum, and its order/duration |
| `verbal_crash` | Critical Reasoning Crash Course (`cr-crash-course`) plus Reading Comprehension Crash Course (`rc-crash-course`) | Each seeds five teaching events and one mock; CR/RC belong to Verbal under the approved section decision | Whether these are the intended content sources, combined order and treatment of the two mocks |
| `di_crash` | Data Interpretation Crash Course (`di-crash-course`) | Four teaching events plus one mock | Curriculum fit, exact source materials and current revision |

Full Course's Verbal and DI sections are alternative candidates, not automatically
equivalent to the Crash curricula. In particular, the legacy DI Crash name says
“Data Interpretation,” while the Full Course section says “Data Insights.” A
matching `di` section key alone cannot settle content equivalence.

## Material availability is not established by schedule seeds

The initial template migration copies **pre-reads and worksheets only** into the
Full Course template by joining each event's `source_master_session_id` to
`master_materials`. It does not seed resources for the three Crash templates and
does not seed recordings through that operation. Consequently, a Crash schedule
with named topics is not evidence of available learning material or recordings.
Later Admin edits may have populated them; this inspection did not query hosted
rows or verify current revisions.

The later flexible-resource migration supports Notion, PDF and text template
resources, including placeholder defaults. These declarations do not prove that
a current material link is complete, usable or suitable for V2. Actual material
IDs and asset checks remain necessary before a real association proposal.

## Stable seed identities

These are seed identities, not verified current hosted rows. Do not assume that
revision 1 remains current.

| Template key | Seed template ID |
| --- | --- |
| `full-course` | `10000000-0000-4000-8000-000000000001` |
| `cr-crash-course` | `10000000-0000-4000-8000-000000000002` |
| `rc-crash-course` | `10000000-0000-4000-8000-000000000003` |
| `di-crash-course` | `10000000-0000-4000-8000-000000000004` |

Candidate Quant curriculum keys, in the refined academic sequence:

- `w01-sun-quant-1`: Fractions, percentages, ratios/mixtures and SI/CI.
- `w02-sun-quant-2`: Pipes/cisterns, work/time and speed/time/distance.
- `w03-sun-quant-3`: Probability and permutation/combination.
- `w05-sun-quant-4`: Polynomials, functions, equations and inequalities.
- `w06-sun-quant-5`: Number properties, multiples/factors, powers/roots and exponents.
- `w07-sun-quant-6`: Averages, descriptive statistics, set theory and progressions.

These keys identify candidate source sessions. They are not V2 event UUIDs or an
approved new teaching schedule. No dates, instructor assignments or asset links
were copied into a V2 draft.

## Evidence and next step

Inspected sources:

- [Template seed](../../../supabase/migrations/20260817090845_add_versioned_course_templates.sql),
  SHA-256 `390d649fbc85acb9f915a492b14157c3c4161fbdd709de45e41975c7c9e3683e`.
- [Academic title refinement](../../../supabase/migrations/20260801090000_refine_academic_curriculum_titles.sql),
  SHA-256 `e7d47d6939958b2ee617a5bbf47cf27653e1ee50421c43dd94da34514d6b3902`.
- [Flexible template resource definitions](../../../supabase/migrations/20260818113000_add_flexible_batch_resources.sql).

No SQL was executed and no tests were rerun for this documentation-only inspection.
No shared data, PR metadata, remote branches or Production settings changed.

Confirm the candidate source choice first. Then use separately authorized current
source evidence to identify revisions, events, material IDs, resource scope and
recording availability. Prepare explicit target drafts and a
[mapping review](content-mapping.md), preserving originals. Selecting source names
does not authorize migration, publication or reuse of every item in those sources.
