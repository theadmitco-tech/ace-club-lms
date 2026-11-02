# Phase 4 hosted acceptance

Status: authenticated workflow, real supported-player playback and responsive
visual checks have passed. Exact fixture cleanup and generated-account removal
remain open. Phase 4 is not yet complete.

## Evidence and scope

| Record | Result and boundary |
| --- | --- |
| [Hosted workflow](hosted-results.json) | 81 distinct passing assertions and two inconclusive Notion API observations. The 84 recorded entries include one repeated environment assertion during a guarded continuation. Both original Notion embeds rendered successfully |
| [Provider check](provider-results.json) | Eleven checks passed on `c0c4e3e`: actual published Quant/DI recording references match Full Course; real YouTube playback advanced 10.003 seconds and produced three successful observation responses without creating feedback. Verbal has no recordings in this inventory |
| [Final visual check](visual-results.json) | Passed on implementation `c0c4e3e65129bd24e7c46de57a82f29916f2a74f`: exact staging environment, 31 outline entries, desktop and 390px mobile layout, no horizontal overflow, bounded mobile outline and nearby selected content |
| [Local verification](../phase4-preview-activation/evidence/local-verification.json) | Five Phase 4 suites / 20 tests passed; database behavior and security boundaries remain distinct from hosted provider acceptance |
| [Local browser verification](../phase4-preview-activation/evidence/local-browser.json) | Thirteen isolated browser journeys passed, including observed-player behavior, interruption handling, multiple obligations and keyboard access through a long mobile outline |
| [Setup receipt](setup-result.json) | Operator-supplied staging SQL Editor result: two synthetic batches, seven test purchases, nine QA accounts and one temporary real-course enrollment |
| [Fixture manifest](fixture-manifest.json) | Exact designated identities, generated course identifiers, candidate commit and preservation baseline; no credentials |

The main workflow ran against commit `9f865dfe83bda1b121493ed186899ae6c9532684`.
The later commit `c0c4e3e65129bd24e7c46de57a82f29916f2a74f` changes the outline
layout and its browser evidence; its hosted visual and real-provider checks are
recorded separately.
The [reviewed Preview](https://ace-club-dd78or5n2-theadmitco-techs-projects.vercel.app)
uses staging project `eyphkkginlgoaxflauog`.

Five real course PDFs passed authorized delivery, unauthorized Student denial and
anonymous denial. Both real readings rendered through their unchanged original
Notion embeds. Their provider API responses did not establish valid page rendering;
those observations remain explicitly inconclusive.

The synthetic material and reading denial checks are smoke checks only: unavailable
fixture references cannot independently prove a feedback gate. The stronger evidence
combines real authorized/unauthorized resource checks, database eligibility tests,
local route tests and hosted omission of locked references from responses and HTML.
The synthetic shared-recording comparison is supplemented by actual published
recording-reference comparisons in the provider report.

## Retained attempts

[Attempt 01](attempt-01.json) stopped before waiting for the streamed course outline.
[Attempt 02](attempt-02.json) retains passing checks before a feedback-label selector
interruption. The final workflow report includes the reviewed continuation from
that checkpoint. These historical attempts are not represented as independent
passing runs. The [first provider attempt](provider-first-attempt.json) and subsequent
provider-attempt records remain archived. The initial harness waited for a player
control while the recording was outside the viewport; scrolling, hovering and
waiting for actual provider metadata resolved that test interaction. The passing
provider report uses actual playback and responses, with no fabricated positions
or completion. A ten-second observation does not establish full viewing or attendance.

## Cleanup contract

The generated run is `a56891e7-5197-41ca-afa6-e5a45e0003c7`.
The baseline covers **85 application tables**, excluding only the nine designated
QA profiles, with fingerprint `27145d216badf73e85ee4a42930499a2`.

The [cleanup packet](02-CLEANUP-FIXTURES.sql) removes only generated purchases,
batches and associated QA state, plus the designated Full Course QA enrollment and
its progress/watch state. Existing content, published revisions and unrelated
records remain protected by exact scope checks and transaction rollback on baseline
mismatch. A successful SQL receipt must precede removal of the nine generated Auth
accounts. Neither cleanup nor account removal has been verified yet.

The resumed workspace lost its temporary private credential and session files.
Staging access and only the two designated QA sessions required for provider
verification were recovered. Saved manifests contain no passwords or service keys;
unrelated identities and real Student accounts were not part of that recovery.

The [twelve-gate checklist](EXIT-GATES.md) identifies demonstrated behavior and the
remaining acceptance boundary. Payment fulfillment, provider-level DRM and verified
attendance are outside these test claims.
