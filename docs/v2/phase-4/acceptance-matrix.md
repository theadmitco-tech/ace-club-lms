# Phase 4 acceptance matrix

Status: planned verification. A row describes a required assertion, not a passed
result. Execution results must identify the exact commit, environment and fixture.

## Recording journey and visual progress

| Case | Action | Expected result |
| --- | --- | --- |
| R01 | Opening a purchased Full Course and select Quant 4 first | No prerequisite session order is enforced; all four resource stages are visible |
| R02 | Opening a pre-read and return to the outline | Visual opened state may update; no watched claim or feedback obligation appears |
| R03 | Reopening the course after a permitted session visit | Resume points only to a currently permitted session for the same caller |
| R04 | Changing the caller or remove access after a stored resume value | Stale or foreign resume data creates no usable protected-resource link |
| R05 | Opening a recording without playing it | No watched threshold is recorded |
| R06 | Seeking near the end or replay already counted segments | Watched coverage is not inflated; unplayed segments remain uncounted |
| R07 | Reaching the confirmed watched threshold | A single session-referenced obligation appears; repeated progress is idempotent |
| R08 | Opening an Admin Student-view preview | No Student progress, attendance, feedback or entitlement mutations occur |
| R09 | Forging progress fields or replay watched observations while feedback is pending | No paid access is granted and no existing feedback obligation is resolved |
| R10 | Reopening an unsupported recording after completed feedback | Explicit watched self-report confirms successfully without creating a false new gate |

## Section gates and feedback

| Case | Action | Expected result |
| --- | --- | --- |
| F01 | Quant 4 becomes feedback-due | Other Quant sessions, including previously opened sessions, are gated |
| F02 | Requesting current Quant 4 material and feedback | Current resources and feedback remain accessible |
| F03 | Selecting entitled Verbal and DI while Quant is gated | Both sections remain available |
| F04 | Requesting a gated session through URL, PDF route or reading API | Requesting is denied before signing a storage URL or fetching external content |
| F05 | Inspecting the course response and client props while gated | Locked resource URLs and meeting secrets are absent, not merely hidden |
| F06 | Submitting the applicable feedback successfully | Only obligations for the same batch and session resolve; unrelated obligations remain and access is recomputed from current entitlement |
| F07 | Losing the response after submission, then retry the same operation | One submission exists and a confirmed result can be recovered |
| F08 | Sending duplicate or stale completion notifications | No duplicate obligation or wrong-session unlock occurs |
| F09 | Two applicable obligations exist in Quant | Resolving one does not silently clear the other; each current session remains reachable |
| F10 | A delayed obligation arrives during feedback submission | Serialization produces an accurate remaining-obligation state |
| F11 | Attempting feedback as another Student, Admin or unauthenticated caller | Foreign Student obligations and answers remain inaccessible |
| F12 | Expiring or revoke access before feedback submission | Submission cannot recreate paid access or release expired resources |
| F13 | Republishing or unpublish between opening and submission | Published-resource authorization is recalculated; history remains retained |
| F14 | Accessing an equivalent/shared recording through another batch | The approved subject/session gate contract cannot be bypassed by changing only the batch route |

## Live learning and non-attendance

| Case | Action | Expected result |
| --- | --- | --- |
| L01 | Comparing eligible registered and unregistered Students | Only the eligible registrant receives private live details |
| L02 | Attempting a different batch's Meet endpoint | Registration and entitlement for another batch grant no access |
| L03 | Marking a live class completed | Completion audit is distinct from attendance; applicable feedback follows the confirmed contract |
| L04 | Submitting non-attendance for a completed live class | No false attended state is stored; recording access remains available |
| L05 | Submitting non-attendance while no recording exists | Valid feedback does not require a recording watch |
| L06 | Reopening the completed class | Joining remains unavailable; course materials remain independently authorized |
| L07 | Live registration, entitlement or active profile is removed | Direct meeting requests immediately fail |
| L08 | A completion correction is requested | No reversal is available without an approved correction contract; audit and submission history remain intact |

## Rendering, privacy and release

| Case | Action | Expected result |
| --- | --- | --- |
| V01 | Using desktop and narrow mobile viewports | No horizontal overflow; controls remain readable and keyboard reachable |
| V02 | Navigating the outline, gated CTA and feedback with a keyboard | Focus and accessible labels identify the current action and error state |
| V03 | Interrupting feedback/progress transport | No false success; retry preserves the relevant session and form context |
| V04 | Exercising empty, unpublished, expired and unavailable courses | The page gives an honest state without sample material or fabricated access |
| V05 | Comparing shared imported recording references | No duplicate upload or mutation of legacy resources is introduced |
| V06 | Running Phase 1/2 regression checks and inspect mocks diff | Existing entitlement/publishing contracts and mock implementation remain unchanged |
| V07 | Inspecting browser requests and sanitized reports | No service credentials, private session tokens or foreign records appear |
| V08 | Finishing designated staging QA cleanup | Only exact new fixtures are removed and the fresh pre-QA baseline is restored |
| V09 | Verifying the final Preview and Git branch | Exact deployed commit is READY; Production remains unchanged |

Local browser fixtures establish presentation behavior only. Database tests
establish local SQL behavior only. Hosted caller-session checks, real imported
resources and exact fixture cleanup require separate evidence.

A 404 for an unavailable synthetic reading or PDF is a denial smoke check only;
it does not independently establish a feedback gate because the same reference
could fail for an unlocked session. Gate acceptance combines the caller-session
matrix, omission of locked references from hosted responses, and route tests that
prove denial before provider access. Real imported resources require separate
hosted rendering evidence.
