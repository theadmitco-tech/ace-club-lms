# Release smoke checks and handoff

Status: **prepared, not executed**. All results remain pending. Each report must name the exact Production artifact, commit, project, observation time and authorized fixture scope. The approved test accounts and private resource identifiers remain outside Git.

| Check | Owner role | Expected result / authorization boundary |
| --- | --- | --- |
| Deployment and domain | Release operator | Approved Production artifact receives only the approved domains; Production project and public-client configuration match. |
| Public catalogue | QA | Approved names, Full Course separation, one/two/three subject prices and valid subject combinations match server quotes. |
| Student login / legacy MVP | QA | Existing enrolled Student retains legacy course, reading and worksheet access; no legacy record is rewritten merely for smoke testing. |
| Admin access | QA | Active Admin opens templates, batches and content; Student, inactive and signed-out callers cannot obtain Admin data or mutate it. |
| Paid access | Payment operator / QA | Full Course and Quant/Verbal/DI fulfillment, original price/expiry, upgrades and retry-safe callbacks match Phase 3 evidence. A real charge/refund requires separately named amount, account and permission; synthetic grants do not pass this check. |
| Capacity | QA | Eight-place invariant and failure/release behavior already passed integrated concurrency tests; authorized Production smoke checks availability without occupying real student places. Any mutation requires designated fixtures and cleanup. |
| Content and sessions | Content operations / QA | Ordered pre-class read, recording, post-class read and worksheet; five reading placements; reviewed Production library/resources, without staging sample content. |
| Private resource access | QA | Entitled Student can open approved PDF/recording; expired, revoked, wrong-subject, other-account and signed-out callers are denied, including stale/unpublished resource URLs. |
| Learning / feedback | QA | Playback observations remain distinct from attendance; labeled self-report works for unsupported players; all pending same-subject obligations remain enforced, other subjects remain independent. Authorized temporary feedback writes are fixture-only. |
| Scheduling / live class | QA | IST dates, explicit enrollment and live registration, private meeting access and mapped completion work within approved fixtures. No real class is completed by a smoke test. |
| Admin publication | QA | Preview creates no learning writes; stale confirmations return bounded conflicts; any publish/replace/delete smoke uses separately authorized private test content and exact cleanup. |
| Retention and privacy | QA / Operations | No QA identities, private share links, secrets, source exports or simulated walkthrough grants reach the Production content transfer or published evidence. |

Existing protected resources may fail because an external provider is unavailable. A controlled failure/fallback is recorded with its limitation; it is not a passing full-provider availability claim. Tally replacement remains separate from the approved temporary in-page feedback form unless the final candidate explicitly changes it.

## Observation windows

Operations records baseline request/error levels before assignment, then reviews the first 15 minutes, one hour and next business-day window. Payment operations reviews callback failures, unfulfilled captures, duplicates and capacity consistency at the same checkpoints. These are proposed manual checks; no scheduled job, alert integration or message has been created.

Any authorization/privacy/payment/overselling failure triggers the approved containment procedure immediately. Other thresholds must be agreed from actual baseline traffic before release; missing telemetry is a readiness gap. Monitoring access, responsible roles and escalation coverage must be confirmed in the release record.

## Final handoff fields

- Exact accepted source SHA, CI run, Production deployment ID/URL, domains and deployment time.
- Migration versions/source hashes, reconciled before/after ledger and preservation results.
- Environment review result without values; provider mode and verified callback destination.
- Approved data/content manifest, import/publication results and legacy compatibility evidence.
- Recovery snapshot/rehearsal reference, measured recovery objectives and tested rollback artifact.
- Each smoke outcome, authorized write scope, fixture cleanup and independent absence checks.
- Monitoring windows/results, unresolved limitations, role owners and next actions.
- Explicit Product Owner release acceptance or rejection. Pending, not tested and deferred outcomes remain visible.
