# Admin workflow repairs — 19 November 2026

The repairs address the three high-priority workflow findings and the republication guidance finding from the parallel Admin audit. Existing publication, identity, access and revision controls remain in force. No schema migration is required.

| Finding | Implemented behavior |
| --- | --- |
| Unfinished batch lost through browser Back | Initial subject, batch name, class inputs and session choice are retained in account-specific tab recovery before review. Returning offers Restore edits or Discard recovery. The form cannot overwrite an unresolved recovery record. Prepared save requests retain their original identifiers. |
| Default live batch cannot reach class completion | New batch setup requires either copied course sessions or explicit confirmation to create feedback sessions for its classes. Those new sessions are visible in the draft and remain unlinked until the Admin confirms the class mapping. Existing zero-session batches receive an Add a course session recovery link. |
| New session must be published empty | The Add session form accepts optional readings, recordings and worksheets before saving. The complete session is saved privately in one draft. Edit session draft opens the matching session in the existing batch editor, where resources can be finished before publication. |
| Meeting republication silently requires mapping reconfirmation | Publication review explains the requirement. A confirmed publication provides Set up class completion, opening the mapping section directly. Unpublication does not retain that action. |

The missing-session recovery link uses document navigation so that even an identical destination URL opens the course editor rather than preserving the publication tab. The existing leave warning still permits cancellation; confirmed navigation preserves the recoverable review and opens the draft outline. Both identical-URL and changed-query paths were exercised before and after the correction.

The new-session resource fields accept HTTPS links and existing protected PDF references. This repair does not add a private-upload picker to that form. The normal course-content sidebar continues to show published sessions; unpublished resources are prepared in Add session and continued through the explicit draft-editing link.

## Verification

- [Batch repair evidence](batch-repairs.md) records actual browser Back/reload recovery, account isolation, malformed recovery rejection, explicit session creation, stable retry identities and continued private editing of all four resource types.
- [Content repair evidence](content-repairs.md) records the 35-case content suite and two final-source confirmations, including validation, complete payload preservation, retry and mobile accessibility checks.
- [Delivery repair evidence](delivery-repairs.md) records publication guidance, legacy-batch recovery, the mapping destination and independent database verification.
- Full-project ESLint, standalone TypeScript and the Next.js production build passed. The existing multiple-lockfile workspace warning remained non-blocking.
- Four recovery/authoring test files passed. The new recovery suite is included in the existing Phase 2 verification entry used by CI.
- The three mapping-guidance checks are included in the Phase 4 verification entry. The exact browser-generated two-class request passed ten connected database assertions through private resources, publication, explicit mapping, completion and separate Student feedback obligations.

[Final application source hashes and coordinating checks](repair-validation.json) identify the tested working tree. Workflow evidence retains the source hashes for each earlier attempt and targeted continuation.

Original failed audit journeys remain recorded separately. Initial fixture-build and test-selector failures in repair runs are attributed in the workflow evidence; successful targeted continuations do not erase those attempts. Browser fixtures substitute authentication and server responses. Connected database checks use disposable synthetic records. These layers do not claim a single hosted authenticated browser-to-database acceptance run or human usability sign-off.

## Website access and release state

The previously supplied Admin Preview login URL returned HTTP 302 to Vercel's SSO endpoint during this review. Deployment discovery returned HTTP 403 for the connected account, and the available CLI had no credentials. This confirms an outer hosting access barrier; changing the LMS login path cannot remove it. No accessible new hosted URL or latest hosted commit was verified.

The deployment owner remains responsible for an accessible Preview/share link and deployment of the reviewed candidate under the adopted local-to-staging procedure. The current Phase 3 branch still has automatic deployment disabled. No hosted credentials, application records, payment settings, Production configuration or PR readiness were changed.
