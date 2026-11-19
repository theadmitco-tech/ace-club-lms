# Admin workflow integration review — 19 November 2026

This document preserves the pre-repair findings. Subsequent implementation and verification are recorded in [repair status](REPAIRS.md).

The local review found working scheduling, publication and access controls, but three significant gaps prevent a smooth first-time Admin journey. This is an audit of candidate `9f8890e882a3b8ae221b11a65636bbe3b9cb5bf2`; no application repair or deployment was performed during this review.

Three parallel reviewers covered content authoring, batch creation and Student delivery. A coordinating reviewer checked navigation contracts, inspected screenshots and ran the supporting browser regression suite.

## Findings and repair order

| Priority | Finding | Admin impact | Recommended acceptance condition |
| --- | --- | --- | --- |
| High | Browser Back loses an unreviewed new batch. Explicit navigation warns, but same-document browser Back does not; returning to Create batch shows empty fields and no recovery notice. | A mistaken Back action discards the batch name and class inputs. | Initial form fields survive Back/Forward or a confirmed leave flow; recovery remains isolated by Admin account and preserves dates, times and subject. |
| High | The default “Live classes only” batch has no course sessions. Publication, enrollment, registration and meeting delivery succeed, but learning-enabled class completion requires a matching published session. | A valid default setup reaches a disabled completion action with no mapping choice. Adding a session and republishing is an extra, unexplained detour. | Creation either prepares the required feedback sessions explicitly or explains and guides the required setup before publication; completion and feedback remain auditable. |
| High | A newly added session is saved as an empty draft but does not appear in the published-session content browser. | The Admin cannot prepare its resources in the normal content screen before publishing the session structure. | A new draft session remains selectable for resource preparation and preview before a single explicit publication decision, while existing Student content remains unchanged. |
| Medium | Even a meeting-only republication invalidates the current class-to-session mapping revision. | Completion needs mapping reconfirmation after an apparently unrelated meeting change. | The publication review explains this consequence and provides a direct mapping step; any automatic preservation requires equivalent server-side safety. |

## Workflow checklist

| Workflow boundary | Local result | Evidence level |
| --- | --- | --- |
| Subject → existing session → resource draft → placement → reviewed publication response → reopen | Passed, including interrupted-save recovery | Actual browser components with synthetic responses |
| Add session → resource preparation before publication | Gap reproduced | Browser observation and publication-dependent source contract |
| Rename → draft indication → sidebar reorder/review | Passed on the exercised existing-session path | Actual browser components with synthetic responses |
| New batch → optional copied sessions → multiple independently timed classes → schedule review → saved batch | Passed | Actual browser components with synthetic responses |
| Saved batch → publication → unpublication → reopen | Passed | Browser journey; separate real database publication checks |
| New-batch keyboard/calendar and narrow-screen review | Passed on exercised paths | Chromium at 320/390 pixels |
| Initial unsaved batch → browser Back → return | Failed: inputs lost | Chromium reproduction using actual Admin navigation |
| Meeting draft → validation/review/save → reload after interrupted confirmation | Passed | Supporting synthetic browser suite |
| Enrollment → review/confirm → removal and interrupted-confirmation reload | Passed | Supporting synthetic browser suite |
| Publication → enrollment → live registration → private meeting visibility | Passed | Connected disposable PostgreSQL journey using current migrations |
| Missing entitlement/enrollment/registration → private meeting denial | Passed | Real local database checks |
| Mapped class → completion → feedback obligation → duplicate completion | Passed | Real local database checks |
| Default live-only batch → completion | Gap reproduced | Real local database rejection plus matching UI/source condition |
| Unpublish → Student denial → republish | Passed | Real local database checks |
| Genuine hosted login → browser → server action → database → Student view | Not exercised as one connected run | Owner-managed Preview acceptance remains separate |

## Evidence and limits

- [Content journey](content-workflow.md) and [content evidence](content-evidence.json).
- [Batch journey](batch-workflow.md) and [batch evidence](batch-evidence.json).
- [Delivery journey](delivery-workflow.md) and [delivery evidence](delivery-evidence.json).
- [Supporting browser results](supporting-browser-results.json): 43 passed, zero failed; this broad regression suite also includes Student and earlier-workspace checks, so these are not 43 distinct new Admin integration workflows.

Browser fixtures run the actual application components but substitute authentication and server/data responses. The database journey separately executes real migrations and functions against disposable synthetic records. These two evidence layers are not a single authenticated browser-to-database test. Upload transport, external document/video providers, genuine OAuth, payments and hosted configuration were not verified here.

The supporting Phase 2 fixture uses its earlier feature configuration and surrounding navigation. Its meeting and enrollment editor checks remain useful, but its screenshots do not represent the current three-destination Admin shell. Dedicated content and batch journeys exercise the current shell. Screenshots remain private; the coordinating review inspected the new-session boundary, reopened multi-class batch and meeting editor captures.

The content runner's initial selector interruption and its targeted continuation are recorded separately. The batch runner's failed Back-navigation check remains a failure even though a follow-up successfully reproduced it. No failed workflow is counted as repaired.

No hosted accounts, real course records, credentials, payments or Production settings were used. The pre-existing deployment-handoff edit remains untouched. Reports do not confer phase exit-gate acceptance, PR readiness or human usability approval.
