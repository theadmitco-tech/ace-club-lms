# Course model correction — 25 October 2026

Status: Approved product correction, supplied by the user from the project owner.
Phase 2 review is paused. PR #24 must remain Draft. No shared Phase 2 migration,
merge or Production operation is authorized.

## Authoritative model

- Individual Quant offering, containing the complete Quant course.
- Individual Verbal offering, containing the complete Verbal course. CR and RC
  are topics within Verbal, never separate V2 offerings.
- Individual DI offering, containing the complete DI course.
- Full Course offering, containing Quant + Verbal + DI.

Every course retains sessions, materials, recordings, pre-session reads and
post-session reads. Only actual live classes require event scheduling. Purchasing
an individual course does not mean purchasing a shortened curriculum. There is
no one-week default or mandatory schedule for individual course content.

This confirms approved A1, B1 and D1 in the preserved 20 October decision source.
It supersedes the older 2 October “Crash Course” terminology and compressed-course
assumptions. The earlier candidate-source question about combining legacy short
templates is withdrawn; those seed schedules cannot substitute for complete
course content. Current content must be preserved before any reviewed mapping.

## Implementation and compatibility

Phase 2 uses `quant`, `verbal`, `di` and `full_course` offering codes, a
`v2_course_offerings` catalogue, and `v2_course_batches` /
`v2_course_batch_revisions` for optional course cohorts and schedule snapshots.
Canonical offering sections remain exact; buying all three individual offerings
does not silently grant the separately purchased Full Course offering.

Phase 1's accepted migration is already applied and must not be rewritten or
rerun. Its stored identifiers (`quant_crash`, `verbal_crash`, `di_crash`,
`full_batch`) remain only at the explicit entitlement compatibility boundary.
The proposed Phase 2 catalogue maps each canonical code to its existing Phase 1
product. Existing purchases, grants, price versions and expiry rules remain intact.
This is not a request to rename or mutate deployed commercial records.

The unpublished Phase 2 migration definitions can be corrected before application.
Any database where an earlier Phase 2 draft was independently applied requires a
separate inspection and migration plan; these revised files are not an in-place
upgrade script for that situation.

Session content is stored in private template revisions and preserved in pinned
batch revisions. Schedule publication deliberately projects schedule metadata
only. Protected Student content delivery remains a separate acceptance item;
private recording/material URLs must never be exposed through the schedule API.

## Review boundaries

Prepare a corrected implementation, tests, documentation and exact-head Preview
before resuming review. A passing build is not hosted acceptance: Phase 2 schema
application remains prohibited until separately authorized. Preserve the prior
reconciliation report as historical evidence, not approval of the corrected model.
