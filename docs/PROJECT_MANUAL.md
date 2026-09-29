# Ace Club LMS — Project Manual

Status: Active
Owner: Product owner and Engineering
Last updated: 31 August 2026

## Start here

This is the master front door for Ace Club LMS.

For normal continuation, read only:

1. This Project Manual for stable product, system, and operating context.
2. [Current State](CURRENT_STATE.md) for the exact live release, known issues, active work, and next action.

Read a linked feature guide, decision, runbook, or evidence file only when the immediate task requires it. Historical phase and pilot documents are not normal prerequisite reading.

Product authority remains in the [Instruction Register](../instruction/README.md). Engineering and handoff rules live in the [Engineering Handbook](governance/engineering-handbook.md). If documents conflict, follow the authority order and reconcile the lower-authority document.

## 1. Product overview

Ace Club LMS is The Admit Co.'s learning platform for GMAT programmes. It supports:

- full-course cohorts;
- crash courses such as Reading Comprehension and Critical Reasoning;
- reusable course templates and a Full Course Master Base;
- batch-specific schedules and resources;
- timed mocks and result reporting;
- worksheets and per-question manual practice logs;
- controlled Student, Admin, and Super Admin experiences.

Production application: [aceclub.theadmitco.com](https://aceclub.theadmitco.com).

The platform is live. Production contains real Student data, enrollments, attempts, progress, and course content. Production is never a general-purpose testing environment.

## 2. Product authority

| Authority | Document | Purpose |
|---|---|---|
| Binding requirements | [MVP Acceptance Criteria](../instruction/Ace_Club_LMS_MVP_Acceptance_Criteria.md) | Required product behavior and exclusions |
| Binding delivery history | [Product Roadmap](../instruction/Ace_Club_LMS_Product_Roadmap.md) | Approved phases, gates, and ownership |
| Authority router | [Instruction Register](../instruction/README.md) | Conflict order and product-document map |
| Architecture decisions | [Decision records](decisions/) | Accepted structural, security, and data decisions |
| Engineering governance | [Engineering Handbook](governance/engineering-handbook.md) | Source control, migrations, testing, releases, rollback, documentation, and handoffs |
| Exact operational truth | [Current State](CURRENT_STATE.md) | Current deployments, ledgers, regressions, active release, and next action |

Code demonstrates implementation. It does not silently override an accepted product requirement.

## 3. People and roles

### 3.1 Student

A Student:

- signs in through an approved, pre-provisioned Google account;
- sees only courses to which they are enrolled;
- retains access to historical/inactive courses while the enrollment exists;
- chooses among multiple enrolled courses;
- sees released schedule items and resources;
- opens worksheets and maintains their own practice log;
- takes assigned mocks and views their own results;
- cannot access another Student's private progress or unreleased content.

### 3.2 Admin — approved target

Admin is the programme/teaching operations role. The intended Admin recipients are Tanya, Unnati, and Shan after their exact Production accounts are confirmed.

An Admin should:

- move across courses and batches;
- open a clearly marked Student Preview;
- view Student progress and mock reporting;
- take and reset separate tester mock attempts;
- return easily to the Admin area.

An Admin should not:

- create or edit course templates;
- change Master Base or batch course material;
- manage question banks or mock releases;
- create batches;
- manage enrollments or roles;
- write progress as if they were a Student.

### 3.3 Super Admin — approved target

Super Admin is the content and platform-management role.

A Super Admin has Admin capabilities and may also:

- manage reusable templates and Full Course Master Base content;
- create/populate batches and schedules;
- add or update resources, worksheets, and question counts;
- manage question-bank content and mock releases;
- manage enrollments and access roles;
- perform approved operational corrections.

### 3.4 Current role limitation

The currently deployed schema/application recognizes only `student` and `admin`. Existing `admin` is broadly privileged. The Admin/Super Admin separation is planned but not yet implemented or granted. See [Current State](CURRENT_STATE.md).

Authorization must be enforced server-side and in Supabase policies/functions. Hiding navigation is not sufficient.

## 4. Core domain model

```text
Course Template / Full Course Master Base
             │
             │ generate or explicitly sync reusable content
             ▼
Course / Batch
  ├── Enrollments ── Student profiles
  ├── Sessions / Events
  │     └── Event-owned materials
  ├── Whole-course / Section resources
  ├── Mock assignments
  └── Student-selected course context

Reusable material
  ├── Starter pack
  ├── Pre-read
  └── Worksheet ── Master worksheet questions

Batch/event-owned material
  ├── Recording
  └── Session material

Student activity
  ├── Worksheet practice entries
  ├── Mock attempts and responses
  └── Selected course preference
```

### 4.1 Course templates and Master Base

- The Full Course Master Base is the reusable source library for the full programme.
- Crash-course templates hold crash-course-specific reusable structure and resources.
- Templates describe reusable events/resources; a generated batch is its own operational snapshot.
- Admin terminology in older documents often means the currently broad privileged role. Under the target model, authoring belongs to Super Admin.

### 4.2 Courses and batches

A course/batch owns:

- publication and operational status;
- schedule timezone and cohort start date;
- generated or manually managed events;
- enrollments;
- batch-specific resources and mock assignments.

`courses.is_active` controls operations and presentation. It must not revoke a Student's already granted enrollment by itself.

### 4.3 Sessions and events

Sessions/events provide the timeline. They may represent academic classes, mocks, calls, breaks, or support activities depending on the template.

Release timestamps and publication status are database-owned access boundaries. A card being hidden in the UI is not sufficient protection for unreleased content.

## 5. Resource ownership and release contract

| Resource | Reusable origin | Batch ownership | Typical availability |
|---|---|---|---|
| Starter pack | Template | Copied/associated into a batch | From batch creation/publication according to contract |
| Pre-read | Template or Full Course Master Base | Batch material linked to an event/section | Release timestamp; configured programme rules apply |
| Worksheet | Template or Full Course Master Base | Batch material linked to an event/section | After the related class ends |
| Recording | None across batches | One event in one batch | After the batch event according to release rules |
| Session material | None across batches | One event in one batch | After the batch event according to release rules |
| Short instruction/text | Template or batch depending on scope | Controlled association | From configured release |
| YouTube resource | Template or batch depending on category | Controlled association | From configured release |

Recordings and Session materials must never be copied from Master Base or synchronized across batches.

For the detailed accepted reusable-content decision, see [ADR-0002](decisions/adr-0002-cohort-schedule-and-material-sync.md). Historical refinements remain in the linked pilot evidence, but they are not prerequisite reading.

## 6. Student experience

### 6.1 Authentication and access

- Google Sign-In is the approved portal method.
- Accounts must be active and pre-provisioned for portal access.
- Route and data access are enforced server-side.
- Logout must block protected pages.
- Local and Preview environments use Staging; Production remains isolated.

See [ADR-0001 — Google Sign-In](decisions/adr-0001-google-sign-in.md).

### 6.2 Multi-course selection

The approved behavior is:

1. Zero enrollments: show a clear no-course state.
2. One enrollment: open that course directly.
3. Multiple enrollments: show the course chooser after each fresh authentication.
4. Include current and historical/inactive enrolled courses.
5. Persist the selected course while navigating.
6. Keep “Switch course” available.
7. Validate every selection against enrollment server-side.
8. Use the same selected course across Home, Schedule, Resources, Practice log, Mocks, and material routes.

The database and application support exists. See [Current State](CURRENT_STATE.md) for the exact Production and Staging release status.

### 6.3 Home

Home summarizes:

- selected course/batch;
- next event;
- programme position;
- recommended practice;
- recommended reading.

Recommended membership and resource release are separate concepts. A resource may be released without being the current recommendation.

### 6.4 Schedule

Schedule shows the published course timeline and accurate availability states for the selected course.

### 6.5 Resources

Resources show released whole-course, Section, event, and standalone resources for the selected course. Private files are delivered through protected routes and short-lived signed access.

### 6.6 Worksheets and practice log

- Worksheet access follows enrollment, publication, and release rules.
- Worksheet question count is authored in the reusable source and preserved into generated batches.
- Practice entries are per Student, course, worksheet, and question.
- Students may update manual status, time, and comments as supported.
- Admin reporting must not expose one Student's private data to another Student.

Stable references:

- [Master worksheet questions](master-worksheet-questions.md)
- [Worksheet PDF conversion](worksheet-pdf-conversion.md)

### 6.7 Recommended reading and practice

For each academic Section independently:

- the next class may supply its complete pre-read set during the accepted between-class window;
- the previous completed class may supply worksheets and Session materials until the next same-Section class starts;
- missing content does not fall back to another Section or an arbitrarily older class;
- release and authorization timestamps remain authoritative.

Detailed historical acceptance is preserved in [Pilot V2 recommended reading](pilot-v2/recommended-reading-revision.md).

## 7. Mocks

The mock system supports:

- question-bank content and taxonomy;
- immutable published assessment versions;
- batch assignments and release times;
- configurable section order;
- timed sections, saved progress, and resumption;
- completed result analysis;
- Admin reporting;
- assignment-scoped tester access;
- separate tester attempts excluded from Student batch completion.

The current system includes a broad Admin tester path. Under the target role model, both Admin and Super Admin may use tester attempts, but ordinary Student attempts must remain protected.

Stable reference: [Question bank](question-bank.md).

## 8. Admin and content operations

Current broad Admin surfaces include:

- templates and curriculum;
- resources;
- sessions;
- users/enrollments;
- batches;
- Student progress;
- question bank;
- mock builder and reporting.

The approved target splits these surfaces:

- **Admin:** course/batch switching, Student Preview, progress/reporting, tester mocks.
- **Super Admin:** all authoring, configuration, enrollment, release, and role management.

The transition must follow an additive expand-and-contract migration so existing privileged access is not accidentally removed before the compatible application is live.

## 9. Technical architecture

| Layer | Technology | Responsibility |
|---|---|---|
| Web application | Next.js App Router | Student/Admin interfaces, server routes/actions, protected navigation |
| Authentication/data | Supabase Auth and Postgres | Identities, domain data, functions, RLS, migration ledger |
| File storage | Supabase Storage where configured | Private PDFs/media with protected delivery |
| Hosting | Vercel | Preview and Production deployments, environment-scoped configuration |
| Source control | Git and GitHub | Code, migrations, tests, documentation, release history |

### 9.1 Authorization pattern

```text
Authenticated request
      ↓
Active profile and role/capability check
      ↓
Server route/action authorization
      ↓
Supabase RLS or validated security-definer function
      ↓
Only authorized rows/resources returned or mutated
```

Privileged service-role access remains server-only and must be preceded by an authenticated, active, authorized identity check.

### 9.2 Environments

| Environment | Supabase | Rule |
|---|---|---|
| Local | Local or Staging | Never Production |
| Preview/Staging | `eyphkkginlgoaxflauog` | Disposable QA and acceptance |
| Production | `owmlxsnzogfapotmjrqk` | Live data; explicit mutation approval required |

Never record secret values in documentation or evidence.

## 10. Engineering workflow

The standard path is:

```text
Authoritative Production commit
        ↓
Short-lived feature branch
        ↓
Code + migration + tests + docs in one PR
        ↓
Local/CI checks
        ↓
Staging migrations + Staging-backed Preview
        ↓
Disposable acceptance fixtures and cleanup
        ↓
Product acceptance and rollback record
        ↓
Explicit Production authorization
        ↓
Ordered migration/application promotion
        ↓
Production smoke, release record, tag, Current State
```

The complete rules are in the [Engineering Handbook](governance/engineering-handbook.md).

## 11. Documentation model

### 11.1 Normal reading path

- Resume work: Project Manual + Current State.
- Change a feature: add its feature guide and relevant ADR.
- Release: add the release record and acceptance evidence.
- Investigate history: use the historical map below.

### 11.2 Canonical ownership

| Information | Canonical document |
|---|---|
| Product requirement | `instruction/` |
| Stable system overview | Project Manual |
| Exact live status/next action | Current State |
| Engineering/handoff rules | Engineering Handbook |
| Significant decision | ADR |
| Stable feature contract | Feature guide |
| One release | Release record |
| Test/deployment proof | Evidence |
| Old phase narrative | Historical phase/pilot/handoff |

### 11.3 Historical map

- Original MVP phases: [`docs/phase-1/`](phase-1/) through [`docs/phase-8/`](phase-8/)
- Pilot V1: [`docs/pilot-v1/`](pilot-v1/)
- Pilot V2: [`docs/pilot-v2/`](pilot-v2/)
- Pilot V3 mock programme: [`docs/pilot-v3/`](pilot-v3/)
- Preserved handoffs: [`docs/handoffs/`](handoffs/)
- Immutable decisions: [`docs/decisions/`](decisions/)
- Documentation consolidation inventory: [document-inventory.csv](governance/document-inventory.csv)

These records are available for audit and diagnosis. They are not the default continuation path.

## 12. Current roadmap

The immediate release sequence is:

1. **Release 0 — Source and governance reconciliation.** Establish the GitHub-backed authoritative baseline and documentation controls.
2. **Release 1 — Course-selection restoration.** Restore chooser/switching while retaining the Notion fix.
3. **Release 2 — Admin/Super Admin foundation.** Add backward-compatible role and authorization support without grants.
4. **Release 3 — Role activation.** Confirm exact accounts; grant Admin to Tanya, Unnati, and Shan; grant approved Super Admin access; enable the separated experiences.
5. **Release 4 — Authorization contraction.** Restrict content-management authority to Super Admin after acceptance and rollback safety.

Exact status and authorization are always taken from [Current State](CURRENT_STATE.md), not from this stable roadmap summary.

## 13. Ownership and approvals

| Concern | Owner/approval |
|---|---|
| Product behavior and release scope | Product Owner |
| Implementation and technical evidence | Engineering |
| Acceptance journeys | Product Owner and Engineering |
| Production migration/deployment | Explicit Product Owner authorization plus Engineering execution |
| Named role grants | Product Owner approval; exact account verification; audited execution |
| Historical evidence | Preserve; Engineering maintains links and classification |

## 14. Glossary

| Term | Meaning |
|---|---|
| Master Base | Reusable full-course curriculum/content source |
| Course template | Reusable structure/resources for a course mode |
| Course/batch | Operational Student-facing cohort or crash course |
| Historical course | Inactive operationally but still accessible to an enrolled Student |
| Resource | Starter pack, pre-read, worksheet, recording, Session material, video, text, or supported content item |
| Release | Time and authorization boundary at which content becomes accessible |
| Recommendation | Current Home emphasis; does not itself grant access |
| Practice log | Student's per-question worksheet tracking |
| Tester attempt | Non-Student-completion mock attempt used for verification |
| Preview | Vercel application deployment backed by Staging unless explicitly documented otherwise |
| Current State | Single living operational handoff |
| ADR | Append-only architecture decision record |

## 15. How to resume safely

1. Read [Current State](CURRENT_STATE.md).
2. Confirm Git status and the exact branch/commit.
3. Verify live deployment and migration facts read-only when the task depends on them.
4. Read only the linked feature/ADR/runbook needed for the immediate change.
5. State scope, exclusions, risk, tests, and rollback.
6. Do not mutate Production without a new explicit authorization.

If Current State disagrees with verified Production, stop feature work and reconcile Current State first.
