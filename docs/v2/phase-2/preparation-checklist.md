# V2 Phase 2 preparation checklist

Status: Active — mapping and approved local authoring verified; full acceptance pending
Owner: Engineering and product owner
Last updated: 20 October 2026

Current checkpoint, 25 October: Phase 1 is merged into `codex/v2-integration` at
`6447f5b`; reconciled Draft PR #24 is at `c67cfe7` with passing CI/LMS Preview.
The enrolled-batch-only decision is implemented on the separate local follow-up
branch. [Content-preservation tooling](content-preservation.md) is now available
for local synthetic verification. The original discovery/checkpoint below remains
historical; its pending Student eligibility and Phase 1 integration statements
are superseded by this update. Content mappings, capacity allocation and shared
Phase 2 setup/acceptance remain pending.

Phase 2 adds product-specific batch publishing for Full Course and the three individual courses. Task 1 maps the existing tools to those products before choosing a data
model or changing application behavior. Checked discovery items below mean source
inspection is complete; they do not mean the feature passes in staging.

[Part 2 data relationships and Admin form plan](data-and-admin-form-plan.md)
contains the proposed design. Planning and implementation are tracked locally;
explicit permission is required before any push or external publication. The
[implementation checkpoint](README.md) records subsequent local code and test
evidence; unchecked acceptance items below remain pending.

## Current approval update — 20 October 2026

Use the [approval reconciliation](../decisions/README.md) and
[active delivery report](../phase-2/approved-delivery-report.md) for current work.
The older per-session reservation, universal date prerequisites and WhatsApp
requirements below are superseded. Historical results are retained, not new
acceptance evidence. Six-month access denial is confirmed by the
[Phase 1 follow-up](../decisions/phase-1-expiry-confirmation-2026-10-20.md).
Student batch visibility is now enrolled-batch-only; hosted release decisions remain separate.

## Working checkpoint

| Item | Recorded state |
|---|---|
| Originally inspected branch/commit | `intern/v2-onboarding` at `3207cba41b0561ef78c0adf5a44302d753d48bdb`; source mapping below refers to that revision |
| Current branch/code | `intern/v2-phase-2-review` at `26ec141561a0749dba371409273c1f1ee9906049`; separate Phase 2 candidate |
| Phase 1 | Draft PR #23 at `d3020c1`; staging verification and product acceptance remain pending |
| Current task | Approved undated outlines and Admin reviewed publication implemented; Student reader remains blocked on eligibility |
| Runtime evidence | 229 local tests across 21 files, lint, TypeScript and build passed; browser/hosted verification remain pending; see [dated evidence](evidence/isolated-review-2026-10-20.md) |

The [roadmap handoff rule](../review/product-roadmap.md#intern-handoff-rule)
requires acceptance of the preceding phase before implementation. The local,
untracked `intern-collaboration-sop.md:29–42` also describes a recorded exception.
Local development and commits before Phase 1 acceptance are permitted under
the limited sequencing exception recorded in the
[implementation checkpoint](README.md#scope-and-sequencing). It does not accept Phase 1. The
[Phase 1 baseline decision](../phase-1/review-and-release.md#baseline-decision-before-merge-and-release)
remains relevant before implementation is based on a different release lineage.

## Product mapping

Canonical Phase 2 offering codes are defined in `src/lib/v2Templates.ts` and the approved
[product decisions](../review/product-and-business-decisions.md#v2-dec-02--product-types-and-offers).
The repository's [older template seeds][template-seeds] are a different catalogue.
Similar labels do not establish equivalent curriculum, access, or schedules.

| V2 product | Purchased sections | Documented schedule | Existing template relationship | Task 1 finding |
|---|---|---|---|---|
| `full_course` | `quant`, `verbal`, `di` together | Approximately eight weeks | `full-course`, with `qa`, `va`, `di` and `programme` sections | Candidate structure for reuse; requires explicit section/content mapping and V2 product binding |
| `quant` | `quant` only | No default duration; schedule only actual live classes | No dedicated complete Quant template established by the inspected seed | Requires a Quant template; copying a subset of Full Course content is a proposal requiring curriculum review |
| `verbal` | `verbal` only | No default duration; schedule only actual live classes | Separate `cr-crash-course` and `rc-crash-course` templates | Neither is automatically the complete Verbal product; the relationship between both curricula and Verbal needs review |
| `di` | `di` only | No default duration; schedule only actual live classes | `di-crash-course` | Candidate structure for reuse; matching section keys do not prove approved content or schedule |

Full Course remains one complete product. Buying all three individual courses does not
grant the Full Course schedule. All products include recordings; live participation
is optional. An individual course must remain available through recordings/materials
when no live batch exists. Sources: [product and live criteria][product-live-criteria].

## Existing tools and required changes

These are findings from the inspected source revision, not a report of the deployed
schema or current Preview behavior. “Reuse” describes a candidate for the design.

| Area | Verified source fact | V2 consequence |
|---|---|---|
| Product identity | Four V2 product codes and three entitlement section codes exist. [Types][product-types] | Bind schedules to a product code; do not infer access from a title or `full`/`crash` mode |
| Template identities | SQL restricts template keys to Full, CR, RC and DI. [Constraint][template-constraint] | New V2 templates cannot be added by UI naming changes alone; preserve existing identities and review an additive schema approach |
| Template versions | Templates have revision history, section/event/resource associations and current revision IDs. [Model][template-model] | Reuse immutable revisions and explicit associations where possible; editing a template must not silently rewrite running batches |
| Schedule proposal | The builder previews a schedule and its resources before confirmation and offers initial Draft/Published states. [Builder][batch-builder] | Reuse the review flow; add explicit product, section scope and delivery mode |
| Creation contract | The proposal requires a start date and the database rejects templates with zero events. [Input][batch-input], [RPC][batch-create] | The current live-batch path alone does not represent a product with no live schedule |
| Batch storage | Creation writes `courses` and `sessions`, with template revision, course mode and publication flags but no V2 product binding. [RPC][batch-create] | Define the product-to-batch relationship before reusing these writes |
| Schedule changes | Admin actions support saving, shifting, cancelling and reordering events. [Actions][schedule-actions] | Reuse reviewed change behavior where compatible; verify V2 isolation, stale edits and student refresh separately |
| Time zone | Schedule generation uses `Asia/Kolkata`. [Schedule logic][batch-input] | Record this existing assumption; confirm the V2 display/entry convention rather than using the browser's local zone implicitly |
| Capacity | Available seats subtract enrolled students and pending payment reservations from course capacity. [Calculation][capacity-calculation] | Approved V2 uses eight registrations per live course; validate this legacy behavior against the still-unspecified Full Course registration unit and preserve recording-only purchase access |
| Publication | Creation maps published state to `courses.is_active` and each event's `is_published`. A later timeline migration intentionally retains enrolled access to inactive batches. [Creation][batch-create], [Timeline][legacy-timeline] | Do not treat deactivating a course as a complete V2 unpublish or entitlement-revocation operation |
| Recordings and materials | Template resources exclude recordings; flexible recordings belong to one batch event. [Template types][template-model], [Resource validation][resource-validation] | Plan shared class/content references and a recording-only path; the existing resource model cannot simply stand in for V2 delivery |
| Material timing | Existing batch inheritance schedules event pre-reads seven days before class and worksheets at session end. [Inheritance][resource-inheritance] | Preserve legacy release rules. V2 continuous pre-read access belongs to the later learning-delivery work and must not inherit an accidental live-date dependency |
| Student schedule | The current timeline selects the latest course enrollment and checks `can_access_course`. [Timeline][legacy-timeline] | V2 needs an entitlement-aware schedule read path; multiple purchased products cannot be reduced to the most recent legacy enrollment |
| Authorization | Batch creation checks Admin role; Phase 1 provides a caller-session product guard that denies access on errors. [Admin action][admin-action], [Product guard][product-guard] | Reuse the boundaries, then enforce them in every new server/database entry point; hiding controls is insufficient |
| Existing tests | Template, batch, resource and product-reader suites exist. Some batch tests match SQL text instead of executing it. [Batch tests][batch-tests], [CI][verification-workflow] | Retain useful regressions; add actual database and application behavior coverage for new V2 paths before claiming they pass |

Existing `_v2` RPC names and “Phase 2” labels in older tests refer to earlier work;
their names are not evidence that this V2 roadmap phase is already implemented.

## Task 1 checklist

### Requirements and evidence

- [x] The branch and application commit are recorded above.
- [x] `AGENTS.md`, V2 product decisions, acceptance criteria and roadmap were read; applicable development and documentation rules were inspected.
- [x] The existing running handoff was checked for preservation boundaries; signed MVP history remains separate from this V2 preparation.
- [x] The four V2 products are mapped to existing template identities, with missing or ambiguous mappings identified.
- [x] Each substantive reuse or gap finding has a repository path and source line reference.
- [x] Source inspection, proposed design choices and unverified runtime behavior are distinguished.
- [x] Missing source versions are recorded: `intern-onboarding.md` and the separately referenced SOP v1.0 were not found in this checkout. The untracked collaboration SOP does not establish either missing version.
- [x] Scope differences are recorded: older coding rules describe fixed MVP curriculum and legacy release rules; the V2 documents require configurable product templates and continuous pre-read access. Existing MVP behavior must remain intact.

### Mapping completeness

- [x] Product identity is separated from template identity, template revision, batch, scheduled event, class/content reference, purchase and live-course registration.
- [x] `qa`/`va` and `cr`/`rc` legacy sections are identified separately from `quant`/`verbal` V2 sections; no automatic renaming or conversion is assumed.
- [x] Template creation, batch confirmation, schedule mutation and student schedule reading entry points are identified.
- [x] The absence of product binding in the inspected batch creation path is recorded.
- [x] The no-live-batch and recording-only requirements are compared with the current mandatory start date/event and event-owned recording model.
- [x] Capacity, publication and enrollment are identified as separate concepts that the current course model partially combines.
- [x] Existing price editing and bulk enrollment in the course editor are identified as legacy behavior to keep outside the new batch-publishing flow. [Course editor][course-editor]
- [x] Test coverage that can be retained is distinguished from new V2 acceptance evidence still required.

### Decisions required before dependent implementation

- [ ] The content-ID mapping is reviewed, including the Quant source. CR/RC within Verbal is approved in B1.
- [ ] Product-to-template, product-to-batch and class-to-recording associations are specified with explicit cardinalities and legacy compatibility.
- [ ] The selection rule for multiple current/upcoming batches of one purchased product is recorded.
- [x] Admin draft, published and unpublished transitions are locally implemented separately from product availability, activation and expiry; Student read behavior remains pending.
- [ ] Recording-only delivery has a defined representation that does not require a fictitious live event.
- [ ] Public batch information, entitled schedule information and registered-course Google Meet eligibility are separated in the complete read contract.
- [x] C1 excludes per-session reservations and fixes eight registrations per live course; Full Course allocation and actual enforcement remain pending.
- [ ] Representative schedules and required publication fields are supplied or explicitly marked as synthetic fixtures.
- [x] G excludes WhatsApp groups, generation and sending; A2 requires updates in the LMS.
- [x] The limited local implementation sequencing exception is recorded; Phase 1 acceptance and the integration baseline remain pending.

## Decisions and inputs register

| ID | Required resolution | Responsible role | Work affected |
|---|---|---|---|
| D1 | B1 resolves CR/RC as Verbal topics. Supply exact class/content IDs for Quant, Verbal and DI before existing-content mapping. | Product owner supplies curriculum; Engineering records explicit associations | Real template fixtures and shared content references |
| D2 | Supply representative Full Course and individual course schedules: class order, dates or day offsets, times, duration and instructor assignments. Confirm `Asia/Kolkata` for entry/display. | Product owner | Real template population and schedule acceptance; synthetic data can support design |
| D3 | Determine whether a purchase exposes all eligible batches or a selected batch, and how multiple batches are displayed without affecting expiry. | Product owner and Engineering | Batch association and student schedule reader |
| D4 | C1 resolves eight registrations per live course and no per-session reservations/cancellations/waitlist. Define Full Course allocation and concurrent payment handling. | Product owner and Engineering | LIVE-04 enforcement with Phase 3; protected Meet eligibility |
| D5 | A1 permits undated outlines; live sessions need exact topic/date/time. Admin publish/unpublish/republish is implemented locally, retaining purchased access. | Engineering implements; product owner reviews | Remaining Student rendering and content association acceptance |
| D6 | G removes WhatsApp from scope. A2 schedule changes update the LMS once Student delivery exists. | Product owner | No external messaging integration or communication prerequisite |
| D7 | Choose an additive schema/read-path design after reviewing existing constraints and the accepted application/schema baseline. Define application rollback and migration ordering. | Engineering; authorized operator for shared migration approval/application | Implementation brief and database changes |

Sources: [DEC-07 through DEC-09][live-decisions], [Phase 2 and later roadmap scope][phase-2-scope],
[LIVE-01 through LIVE-05][live-criteria]. These questions concern unresolved details;
they do not reopen approved prices, section boundaries or the eight-seat default.

Historical review status, 19 October 2026: D5 remained unresolved and publishing stayed blocked
until prerequisites are confirmed. D3 remains undecided; neither all-batch nor
assigned-batch student visibility is implemented. Private Admin meeting drafts
could proceed independently because they granted no student access and did not publish.
The 20 October decisions supersede that publication hold; D3 is still unresolved.

## Form and data contract checklist for the next part

The following contract is a review checklist, not a new schema or approved UI.
The [Part 2 draft](data-and-admin-form-plan.md#proposed-admin-journey) supplies the
proposed fields and behavior; these acceptance boxes remain open until reviewed.

- [ ] Product code and included sections come from the V2 catalogue; Full Course sections cannot be individually removed.
- [ ] Batch title, selected template revision and delivery mode are explicit.
- [ ] Live mode has validated date/time, time zone, duration, event order, instructor and separate protected Meet details.
- [ ] Recording-only mode does not require live dates, a Meet link or a live seat.
- [ ] Class/content and recording/material references are explicit and restricted to the appropriate product/section.
- [ ] Capacity enforces eight registrations per live course, with Full Course allocation explicitly agreed and concurrent payments handled.
- [ ] Publication status and previewed revision are explicit; incomplete drafts cannot accidentally become published records.
- [ ] Explicitly republished edits update the Student schedule without rewriting purchases, restarting expiry or changing another product's schedule.
- [ ] Duplicate submissions and stale concurrent edits have defined outcomes; failure leaves no partial published batch.
- [ ] Shared content reuse does not mean shared mutable schedules or copied student-specific recordings.
- [ ] A small entitled-student schedule surface is included for the Phase 2 exit gate; the complete learning portal remains Phase 4.
- [ ] Loading, empty, validation-error, failed-save, retry and success states are specified, including keyboard and mobile use.

The complete payment flow is Phase 3. Recording hosting, protected learning
delivery and the full material editor remain with their assigned later phases.
Phase 2 still needs explicit resource associations and cannot expose unprotected
recording or Meet links as a shortcut. Waitlists, attendance analytics, scheduled
material publishing and automatic migration of existing students are excluded.
Sources: [roadmap](../review/product-roadmap.md#phase-3--self-registration-and-payment),
[security criteria](../review/acceptance-criteria.md#6-security-and-quality).

## Acceptance and test checklist

Every complete acceptance item below is pending. Local authoring/publication
results are recorded in the [implementation checkpoint](README.md#local-verification);
they do not satisfy Student delivery or staging acceptance. Evidence must name the tested commit, fixture,
expected result, actual result and a sanitized artifact or test output.

| Check | Expected outcome | Requirement | Evidence required |
|---|---|---|---|
| [ ] Four product templates | Full Course has all three sections; each individual course has exactly its section; arbitrary display names do not alter access | PRODUCT-02/03/04, ADMIN-01 | Domain/database tests and Admin Preview journey |
| [ ] Publish lifecycle | Draft, publish, edit, unpublish and republish follow the agreed transitions without partial writes | Phase 2 work, LIVE-02/05 | Database tests and Admin/Student staging comparison |
| [ ] Independent schedules | Editing Full Course, a individual course or one of two batches leaves the other schedules and purchases unchanged | PRODUCT-04, LIVE-05 | Before/after assertions plus staging journey |
| [ ] No live batch | Each individual course product remains publishable for recording/material delivery; no fabricated live booking is required | LIVE-01/03 | Domain/data tests and recording-only staging journey |
| [ ] Current schedule | Entitled students see the latest published schedule, including agreed cancelled/unpublished states; multiple purchases remain distinct | LIVE-05 | Reader tests and staging refresh/navigation checks |
| [ ] Wrong product | A Quant-only student cannot access Verbal, DI or Full Course-only schedule/links; all three individual purchases still do not grant Full Course | PRODUCT-02/03, SEC-02 | Direct read/RPC/URL tests, not only hidden navigation |
| [ ] Inactive or expired access | Signed-out, inactive, expired and revoked callers cannot retrieve protected schedule links; boundary failures deny access | PRODUCT-06, SEC-01 | Real database policies and server-reader tests |
| [ ] Admin-only writes | Student and anonymous callers cannot publish, edit or bypass validation by calling the API/RPC directly | SEC-01/03 | Server action and database permission tests |
| [ ] Live registration | The agreed course registration path enforces eight, rejects a ninth simultaneous registration and handles duplicate retries without consuming extra places | LIVE-04; D4 allocation must be resolved | Database concurrency and staging registration tests with Phase 3 |
| [ ] Meet privacy | A Student lacking the approved course registration eligibility cannot obtain protected Meet links through public payloads, direct requests or another Student's record | LIVE-04, SEC-01/02 | Boundary and isolation tests after eligibility decision |
| [ ] Online access survives live changes | Full capacity, nonattendance or live unpublish does not remove already purchased website/recording access | LIVE-01/04/05 | Access checks before and after each live change |
| [ ] Date and editing failures | Invalid dates, incorrect section associations, stale revisions and repeated confirmation cannot corrupt a schedule | PRODUCT-04, SEC-04 | Domain and executed database tests |
| [ ] Legacy compatibility | Existing templates, inactive-but-enrolled batches, released resources and student tracker records retain their behavior and ownership | ADMIN-05, SEC-03 | Synthetic legacy snapshots and existing regression suites |
| [ ] UI quality | Admin and Student journeys support keyboard/mobile use and actionable loading, empty, error and retry states | Coding rules, SEC-04 | Preview screenshots or recordings without private data |
| [ ] Schedule updates | Confirmed republication updates the LMS; no WhatsApp group/message functionality is required | A2/G | Student staging refresh and product review |
| [ ] Verification pipeline | Focused V2 tests, relevant legacy regressions, TypeScript, lint and production build pass for the proposed commit | SEC-04 | CI results and local results with commands recorded |
| [ ] Staging and review | The deployed Preview matches the reviewed commit and staging schema; Admin/Student checks pass and acceptance is explicitly recorded | Phase 2 exit gate, SEC-03/04 | Deployment/schema evidence and product review |

Useful existing suites: `test:templates`, `test:batch-schedule`,
`test:flexible-resources`, `test:student-portal`, `test:v2-products` and
`test:v2-readers`. `test:pilot-v2` already groups the legacy feature suites;
the same suites need not be run twice without a reason. New behavior needs focused
tests beyond the existing SQL-text assertions. No tests were executed for the
original documentation-only task. Later implementation results are recorded in
the [implementation checkpoint](README.md#local-verification).

## Staging dependencies and handoff

### Draft navigation browser checks

Run these on the exact authorized Phase 2 Preview using synthetic drafts.
The [local component-handler evidence](evidence/draft-navigation-2026-10-20.md)
does not mark these browser checks passed.

- [ ] For each template, batch and private meeting editor, change a field and
  select a sidebar destination or Sign Out. Cancel the prompt: the URL, session
  and entered values remain intact. Confirm: the requested action proceeds.
- [ ] Repeat with the links between templates and batches and the meeting-draft
  link. Opening a link in a new tab leaves the original edits intact without a
  discard prompt.
- [ ] A successful save removes the warning. A failed/interrupted save keeps
  edited values and the warning; an unchanged retry recovers the submission.
- [ ] After leaving an editor, ordinary Admin navigation has no stale prompt.
  Changing authentication state still triggers the normal role/access redirect.
- [ ] Refresh/close after an edit requests the browser's native confirmation
  where supported. Check desktop, mobile and keyboard navigation separately.
- [ ] Record browser Back/Forward behavior explicitly. Client-side history
  traversal is not intercepted by this fix; it is not a verified protection
  against losing unsaved edits. Save before using browser history.

### Environment and review prerequisites

- [ ] The Preview for the implementation commit is accessible; approval of an older shared deployment is not evidence for a new branch Preview.
- [ ] The authorized operator confirms the Preview's staging target and reconciles the actual schema/migration ledger before any reviewed shared migration.
- [ ] The designated test Admin and two Students can authenticate through the supported staging flow. Basic Admin and one Student sign-in were observed on the Phase 1 Preview; a second Student and the Phase 2 journeys remain unverified. The [login UI][login-ui] uses Google Sign-In.
- [ ] Synthetic product grants, batches and any additional capacity-test identities have a bounded setup/cleanup plan. Passwords, tokens and real student data are excluded from evidence.
- [ ] Required checks and the reviewed branch/commit are verified before merge; Preview access does not require Vercel dashboard membership.
- [ ] Product review records acceptance or specific remaining exceptions; a green build alone does not complete the phase.

Update, 20 October: basic Admin and one Student sign-in were observed on the Phase 1
Preview, superseding the earlier provisioning mismatch described above. A second
Student identity for isolation and the Phase 2 authoring journeys remain pending.
The public V2 catalogue probe returned HTTP 404 / `PGRST205`; its quote check did
not run. The [consolidated handoff](review-and-release.md) groups operator inspection,
product decisions and subsequent implementation/acceptance into one review.

Historical Phase 1 evidence retains earlier account and rewritten-head statuses.
The current access inventory is in the Phase 1 index and its dated evidence.
This local follow-up did not re-query GitHub or establish new hosted evidence.

Task 1's source mapping and [Part 2 design draft](data-and-admin-form-plan.md) are
recorded. Template and batch draft implementation is tracked in the checkpoint.
The next design task is to resolve Student eligibility and walk through synthetic
Admin and Student examples, including existing-student compatibility, before
implementing the Student reader. Mapping approval, the accepted shared schema and runtime
acceptance remain open. Local branch/commit tracking does not publish this work
or authorize shared migrations or deployment.

## Source references

Line references apply to the inspected application commit; they may move after implementation.

[product-types]: ../../../src/lib/v2Products.ts#L2
[template-seeds]: ../../../supabase/migrations/20260817090845_add_versioned_course_templates.sql#L193
[template-constraint]: ../../../supabase/migrations/20260817090845_add_versioned_course_templates.sql#L11
[template-model]: ../../../src/lib/courseTemplates.ts#L10
[batch-builder]: ../../../src/app/admin/courses/BatchCreationBuilder.tsx#L72
[batch-input]: ../../../src/lib/batchSchedule.ts#L3
[batch-create]: ../../../supabase/migrations/20260817143000_add_batch_schedule_builder.sql#L70
[schedule-actions]: ../../../src/app/admin/sessions/actions.ts#L9
[capacity-calculation]: ../../../src/app/admin/courses/CoursesClient.tsx#L71
[legacy-timeline]: ../../../supabase/migrations/20260820114212_restore_enrolled_student_inactive_batch_access.sql#L3
[resource-validation]: ../../../src/lib/flexibleResources.ts#L98
[resource-inheritance]: ../../../supabase/migrations/20260818113000_add_flexible_batch_resources.sql#L546
[admin-action]: ../../../src/app/admin/courses/actions.ts#L15
[product-guard]: ../../../src/lib/server/v2Products.ts#L33
[course-editor]: ../../../src/app/admin/courses/CoursesClient.tsx#L150
[batch-tests]: ../../../scripts/batch-schedule.test.mjs#L50
[verification-workflow]: ../../../.github/workflows/verify.yml#L59
[login-ui]: ../../../src/app/login/page.tsx#L62
[product-live-criteria]: ../review/acceptance-criteria.md#1-product-model
[live-criteria]: ../review/acceptance-criteria.md#3-live-delivery
[live-decisions]: ../review/product-and-business-decisions.md#b-live-classes-and-schedule
[phase-2-scope]: ../review/product-roadmap.md#phase-2--full-course-and-individual-course-publishing
