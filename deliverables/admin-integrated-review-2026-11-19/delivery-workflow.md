# Admin delivery workflow review

The connected local journey preserves the main access boundaries, but the default live-only batch path reaches a completion dead end. This review does not certify the whole Admin journey as accepted.

Candidate: `9f8890e882a3b8ae221b11a65636bbe3b9cb5bf2`.

## Findings

### DELIVERY-01 — High: live-only batch cannot complete through the learning-enabled Admin workflow

`NewLiveBatch.tsx:57` copies no sessions when no saved course is selected. The visible default at line 97 is **Live classes only**, described as an optional course-session selection. Actual database calls successfully created, reviewed, published, enrolled and registered a Student in that configuration. Private meeting delivery also succeeded.

The same batch has zero published sessions. `LiveSessionMappings.tsx:25` supplies options only from same-subject published sessions; the control therefore has no valid option. `LiveOperations.tsx:48` disables completion without a current-publication mapping. `complete_v2_learning_live_class` independently rejects completion, and `set_v2_live_session_mapping` rejects any session outside that batch's published outline. No completion or feedback obligation can be recorded through this supported UI path.

This is a cross-workflow defect rather than an authorization failure. The creation path presents a normal choice which cannot finish the live-class lifecycle once learning is enabled. Recommended correction: provide a deliberate, explicit feedback-session creation/mapping step for live-only classes, or require suitable course sessions before publication and explain why. An automatic match based on similar titles would conflict with the existing explicit-mapping rule.

### DELIVERY-02 — Medium: meeting-only republishing requires mapping reconfirmation

A session mapping was confirmed for publication 1. Only the private meeting draft was changed, then publication 2 was created. The mapping remained recorded against publication 1, so completion stayed unavailable until the Admin confirmed it again for publication 2. The database guard is intentional and safe; the workflow needs a visible next step following republication. This review does not recommend bypassing the guard or silently moving mappings.

## Connected checks

The final disposable-PostgreSQL run completed **26 assertions** against the repository's Phase 1–6 bootstrap plus all three Phase 3 payment migrations. Synthetic identities and purchase grants were used; no provider payment occurred.

- Draft enrollment did not reveal an unpublished course, schedule or meeting.
- Publication exposed course content to the entitled, enrolled Student without opening live access.
- Missing entitlement, wrong subject, missing enrollment, Admin identity and absent identity were denied.
- Live registration exposed the scheduled class and exact reviewed private meeting only to the eligible Student.
- Course, learning and schedule responses excluded the private meeting URL.
- Stale enrollment and registration changes were rejected; only three confirmed registration transitions appeared in audit history.
- A saved meeting edit stayed hidden until republished.
- Explicit session mapping was required; stale completion was rejected.
- Completion removed meeting access and created one feedback obligation; replay did not duplicate it.
- A missed-class response with no ratings resolved the obligation without recording attendance.
- Removing enrollment immediately denied all Student readers.
- Unpublishing denied course, schedule, learning and meeting readers without revoking the purchase.
- Republishing restored the course while the already completed meeting remained closed.
- Inactivity and purchase revocation overrode existing enrollment and registration.
- The live-only completion defect was reproduced by successful setup followed by expected mapping/completion rejections.

Passing a defect-reproduction assertion means the defect was confirmed, not that the product path passed acceptance.

## UI, server and data boundary trace

Enrollment confirmation calls `setEnrollmentAction`, which calls the guarded session-client adapter and `set_v2_batch_enrollment`; confirmed changes invalidate Admin and Student schedule paths. Live registration uses the analogous guarded adapter and `set_v2_live_registration`. Live operations refresh the Admin roster following confirmed results.

Student schedule/course/meeting readers check feature enablement, authenticated Student role and identifier shape before calling caller-bound routines. Responses are validated before rendering. The direct meeting route performs a fresh permission check, redirects with HTTP 303 only for an eligible meeting, and returns HTTP 404 otherwise. Both paths send `private, no-store` and `Vary: Cookie`; the redirect also sends `Referrer-Policy: no-referrer`.

These adapters and routes were source-traced. The existing delivery/security adapter tests passed with mocked identity and RPC responses. This agent did not exercise a browser session against the disposable database, so the browser-to-database connection remains a separate acceptance boundary.

## Reproduction and evidence

The full neutral synthetic runner, source hashes, command results and limitations are embedded in `delivery-evidence.json`. From the reviewed worktree root, the runner can be restored and executed:

```sh
node --input-type=module -e "import fs from 'node:fs'; const e=JSON.parse(fs.readFileSync('deliverables/admin-integrated-review-2026-11-19/delivery-evidence.json','utf8')); fs.writeFileSync('/tmp/ace-admin-delivery-audit.mjs',e.runnerSource);"
node /tmp/ace-admin-delivery-audit.mjs
node --test scripts/v2-student-delivery.test.mjs scripts/v2-learning-security.test.mjs
```

The database helper creates and removes its own private temporary PostgreSQL cluster and accepts no hosted connection string. The runner writes only its synthetic result under `/tmp`. Final commands exited 0. The adapter command reported two passing file-level tests. Earlier harness iterations corrected an expected error message after the mapping setup changed; those iterations are recorded in the evidence.

No application code, migrations, hosted records, credentials, Production configuration or provider settings were changed. Hosted Supabase behavior, real payment fulfillment, concurrent multi-Admin use and human usability acceptance are outside this result.
