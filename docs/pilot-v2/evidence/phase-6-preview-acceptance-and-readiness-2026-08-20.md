# Pilot V2 Phase 6 — Immutable Preview Acceptance and Phase 7 Readiness

Status: Accepted by the Product Owner
Date: 20 August 2026
Accepted source: `547581efccf74300f3902df024db8bf47a27fa25`
Immutable Preview: `https://ace-club-91q2ijwym-theadmitco-techs-projects.vercel.app`
Vercel deployment: `dpl_5rfTN5pyze99mCPzHnuhNyHymsDU` (`READY`, Preview target)

## Authority and boundary

The Product Owner authorized the Phase 6 tests, reviewed the corrected immutable Preview and explicitly accepted Pilot V2 Phase 6 against the exact source/Preview pair above on 20 August 2026.

This evidence records read-only Staging and Production readiness queries. No Production migration, application deployment, data mutation, merge or fixture was authorized or performed. Production remains on the Pilot V1 application and migration baseline.

## Preview correction and verification

The first Phase 6 Preview exposed one blocker: template event up/down controls changed display order without moving the event into the destination relative-day/time slot. Engineering rejected that Preview, changed the reorder helper to preserve positional schedule slots, and added move-down/move-back regression coverage.

Verification for the accepted correction:

- focused template suite: `10/10` passed;
- consolidated Pilot V2 suite: `46/46` passed;
- touched-file ESLint: passed;
- TypeScript with incremental output disabled: passed;
- `git diff --check`: passed; and
- replacement Vercel Preview build: `READY` against the exact accepted commit.

The Product Owner then accepted the corrected Preview. Phase 6 is closed; this does not authorize Phase 7 Production actions.

## Read-only Staging compatibility baseline

Staging project: `eyphkkginlgoaxflauog`.

| Check | Result |
|---|---:|
| Courses / sessions / materials | `12 / 221 / 59` |
| Enrollments / tracker rows | `1 / 300` |
| Expected V2 migrations ledgered | `7 / 7` |
| Template-backed batch snapshots | `8` |
| Snapshots pinned to a non-current template revision | `7` |
| Orphan sessions/materials/enrollments/tracker rows | `0` |
| Cross-batch event-material mismatches | `0` |
| Recording/Session-material ownership violations | `0` |
| Active schedule inversions | `0` |
| Phase 5 disposable course/profile markers | `0 / 0` |

Sanitized comparison digests:

| Scope | Digest |
|---|---|
| Courses | `965099d7deb6f75ff5941daf0ec184d1` |
| Schedule | `c625278721a80078f573879ecfc93026` |
| Material relationships | `d14280e5a2805fef24815bd78d908132` |
| Enrollment membership | `c331dea020f382e60d32e40caf55550a` |
| Tracker identity | `bcf17c5b19784faf4054b8528f7490f7` |

During the Phase 6 batch-reorder review, two future events in the Staging-only `Full Batch Test` fixture were temporarily swapped and then restored to their exact original visible order, dates and material relationships. The normal reorder function advanced that batch's internal schedule revision twice; the current maximum Staging schedule revision is `3`. No row count, ownership relationship or release association was added or deleted.

## Read-only Production preflight baseline

Production project: `owmlxsnzogfapotmjrqk`.

| Check | Result |
|---|---:|
| Courses / sessions / materials | `1 / 30 / 51` |
| Enrollments / tracker rows | `11 / 4,378` |
| Admin-owned tracker rows | `0` |
| Ledgered Pilot V1 migrations | `20260811170000`, `20260813081141` |
| Excluded or Pilot V2 migrations ledgered | `0` |
| Orphan sessions/materials/enrollments/tracker rows | `0` |
| Session-material ownership violations | `0` |
| Schedule inversions | `0` |
| Private course-material objects | `26`; bucket remains private |

Production has received normal operational data since the 13 August Pilot V1 rollout baseline: the course and 30-session schedule counts remain unchanged, while enrollments, materials, tracker rows and private objects increased. No Pilot V2 action touched Production. The values below are the new sanitized preflight baseline for a later, separately authorized Phase 7 before/after comparison.

| Scope | Digest |
|---|---|
| Courses | `1d540d735c9a0c961d34d417200e135d` |
| Schedule | `351020909153a761460fb47beb186073` |
| Material relationships | `ec7d80da688c33cf97aad47f57debb73` |
| Enrollment membership | `6e41cb6e5f1e34db0132007ca3b65667` |
| Tracker identity | `f839c47db355ce7b75472b849529c08e` |

## Decision

Phase 6 is accepted. The next phase is Phase 7 conditional Production planning. Before any Production action, prepare a dated release plan naming the exact source, migrations, environment checks, rollback target and smoke actions, then obtain a new Product Owner instruction authorizing every exact merge, migration, deployment and Production check.
