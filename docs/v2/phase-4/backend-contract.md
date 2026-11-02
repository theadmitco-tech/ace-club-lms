# Phase 4 learning database contract

The additive migration `20261102170000_add_v2_learning_feedback.sql` applies after
the ten Phase 2 migrations. Phase 3 checkout migrations are not prerequisites.
Existing purchase records, price versions, applied migrations, publication rows,
legacy learning data and mocks receive no data rewrite.

## Accepted policies

The temporary LMS feedback form records usefulness and clarity ratings from one
to five, an optional comment, and a route-specific attendance answer. A missed
live class accepts null ratings. Its provenance is `lms`; no Tally callback or
external verification is claimed. A later external form requires a separately
reviewed integration. Successful database confirmation alone clears an obligation.

Supported players create recording feedback at 80% unique observed playback time.
Millisecond intervals preserve fractional playback continuity. Overlapping intervals and retries cannot add duplicate credit; elapsed server time
bounds progress up to normal 2× playback, and larger seek jumps receive no credit. Playback samples are browser
observations, not cryptographic proof of attention or attendance. Unsupported
providers use an explicitly labelled watched self-report. Neither opening a
pre-read nor entering a session creates an obligation.

Every distinct source obligation is retained. One immutable feedback submission
per Student/batch/content-session satisfies its recording and live routes; delayed
same-session triggers link to the existing submission. Multiple pending sessions
in one subject stay accessible together. Other sessions in that subject are locked
across batches, preventing alternate-batch bypass. Other entitled subjects remain
open. No inferred cross-batch session identity is introduced.

## Caller RPCs

- `get_my_v2_learning_state(batch)` returns outline-only session metadata, pending
  obligations in the displayed subjects, visual progress, a currently accessible
  resume target, and live details only for eligible registered Students.
- `get_my_v2_published_course(batch)` retains its existing response shape but omits
  locked sessions entirely, including their private material URLs. Existing file
  and reading endpoints inherit this database boundary.
- `get_my_v2_batch_schedules()` omits live events and live capacity metadata for
  unregistered Students. `get_my_v2_meeting(batch,event)` independently verifies
  entitlement, registration, publication, completion and subject-feedback access.
- `mark_v2_learning_progress(batch,session,item,state,publicationRevision)` records
  a session opening or pre-read opened/read state. It supplies no hard completion
  analytics and cannot mark recordings or attendance complete.
- `begin_v2_recording_watch(batch,session,recording,publicationRevision)` starts or
  resumes the current recording observation. `record_v2_recording_sample` accepts
  a watch ID, unique request ID, position, duration and playing state. The canonical
  published resource hash, revision and caller ownership are rechecked each time.
- `report_v2_recording_watched` accepts the supported explicit self-report only for
  providers without the integrated player observation mechanism.
- `submit_v2_session_feedback(obligation,request,response)` derives identity from
  the authenticated session. Its response contains `usefulness`, `clarity`,
  `comment` and `attendance` (`recording`, `attended` or `missed`). Missed responses
  require null ratings; other responses require integer ratings. A prior source
  publication becoming unavailable does not prevent an active Student from
  resolving an owned obligation. Paid content still requires current entitlement.

## Admin live-class mapping

Live event IDs and course-content session IDs are independent in Phase 2. The new
`set_v2_live_session_mapping` RPC requires an explicit, same-subject mapping in the
current published revision. Mapping edits are audited; completed-class mappings
cannot be changed. `list_v2_live_session_mappings` supplies the Admin selector.

`complete_v2_learning_live_class` requires this reviewed mapping and delegates to
the existing one-way completion operation. A database trigger creates obligations
for currently registered, enrolled and entitled Students. Calling the older
completion RPC cannot bypass obligations when a mapping exists. Existing completed
classes are not backfilled; historical registrations and attendance are not inferred.

## Access boundaries and local evidence

All seven new tables use RLS and deny direct reads and writes to browser and service
roles. Narrow caller RPCs own mutations. Internal helpers cannot be invoked through
PostgREST by those roles. Existing paid-access predicates remain authoritative.

`scripts/v2-learning-feedback-database.test.mjs` exercises caller isolation, paid
access denial, section and cross-batch locks, retained multiple obligations,
parallel idempotent feedback, missed-live responses, resource filtering, original
schedule/meeting guards, and recording observation/replay/replacement checks in
disposable local PostgreSQL. Hosted application and provider evidence remains a
separate activation requirement.
