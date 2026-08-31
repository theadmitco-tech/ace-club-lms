# Ace Club LMS — Engineering Handbook

Status: Draft
Owner: Product owner and Engineering
Last updated: 31 August 2026

## 1. Purpose

This handbook defines how Ace Club LMS changes are proposed, built, reviewed, tested, documented, released, observed, and rolled back.

It exists to make small changes safe and resumable. A future engineer or agent should be able to answer all of the following without reconstructing history from chat:

- What is currently running in Production?
- Which Git commit and database migrations produced it?
- What changed, why was it changed, and what was deliberately excluded?
- Which Staging and Production checks passed?
- Which user or operational data was changed?
- What is the rollback target?
- What work remains, and where should it resume?

This handbook is a living governance document. Signed evidence, accepted architecture decision records, and historical release records remain immutable.

## 2. Authority and scope

This handbook governs:

- application code;
- Supabase schema, functions, triggers, grants, and RLS policies;
- Vercel configuration and releases;
- roles and access grants;
- operational data corrections;
- testing and acceptance;
- release and rollback records;
- engineering handoffs.

The authority order is:

1. Explicit Product Owner instruction and signed product requirements.
2. Accepted architecture decision records in `docs/decisions/`.
3. This handbook and other active governance documents.
4. Active feature, phase, and implementation plans.
5. Historical handoffs and evidence.
6. Code comments and informal notes.

When two sources conflict, do not silently choose one. Record the conflict, identify the higher authority, and update or supersede the lower-authority document in the same pull request as the resolution.

## 3. System boundaries

### 3.1 Environments

| Environment | Application purpose | Supabase project | Data rule |
|---|---|---|---|
| Local | Development and automated tests | Staging or local Supabase only | Never connect local development to Production |
| Preview/Staging | Migration, identity, privacy, UI, and acceptance testing | `eyphkkginlgoaxflauog` | Use disposable or explicitly approved QA fixtures |
| Production | Live Student and Admin service | `owmlxsnzogfapotmjrqk` | Live data; read-only unless the exact change is approved |

Production application: `https://aceclub.theadmitco.com`.

Environment identifiers may be documented. Secret keys, tokens, passwords, OAuth codes, magic links, unrestricted connection strings, and private student records must never be committed.

### 3.2 Source of truth

GitHub is the source of truth for code, migrations, documentation, and release history.

A local directory, temporary worktree, Vercel deployment, Supabase database, chat, or personal note is not an independent source of truth. If it contains a legitimate change that GitHub does not contain, the release is not fully reconciled until that change is represented by a reviewed commit.

### 3.3 Production identity

Every Production release must be identifiable by all of the following:

- Git repository and branch;
- merged pull request;
- full commit SHA;
- release tag;
- Vercel deployment ID and URL;
- Supabase migration versions;
- release record;
- rollback target.

If any item is unknown, treat Production lineage as an incident to reconcile before the next feature release.

## 4. Non-negotiable engineering rules

1. **No local-only Production deployments.** Production must come from a pushed, reviewable Git commit.
2. **No undocumented remote schema changes.** Supabase changes must be represented by committed migration files.
3. **No mixed releases.** Each release has one coherent objective and explicit exclusions.
4. **Staging before Production.** Risk-bearing changes must pass against the separate Staging database and a Staging-backed application deployment.
5. **Promote an identified artifact.** Staging acceptance and Production promotion must use the same approved source commit.
6. **Production requires explicit authorization.** Approval for planning, Staging, or a previous release does not authorize a new Production change.
7. **Authorization is server-owned.** Hiding a button is not access control. Enforce permissions in server code and Supabase RLS/functions.
8. **Historical courses remain accessible to enrolled Students.** Operational course activity must not silently revoke an existing enrollment.
9. **Tests must restore state.** Disposable QA fixtures must be named, bounded, recorded, and removed after verification.
10. **Documentation ships with the change.** A change is incomplete until its durable documentation and evidence are updated.
11. **Signed evidence is append-only.** Correct historical mistakes through a new dated record; never rewrite prior evidence to make the story cleaner.
12. **Rollback must be known before release.** Do not discover the recovery path after an incident starts.

## 5. Git and branch management

### 5.1 Branch roles

The intended model is:

- `main`: protected, authoritative Production-ready history;
- short-lived feature branches: one bounded change, created from the current authoritative baseline;
- emergency hotfix branches: created from the exact current Production commit;
- tags: immutable Production release markers.

Do not maintain multiple long-lived branches that can each independently become Production. If a temporary release branch is necessary, document its purpose, owner, base SHA, and retirement condition.

### 5.2 Branch naming

Examples:

```text
codex/course-selection-login
codex/admin-super-admin-foundation
codex/admin-role-activation
codex/hotfix-notion-embed
```

Names should describe one outcome, not a broad period such as `latest-fixes`.

### 5.3 Commit rules

- Keep each commit coherent and reviewable.
- Do not combine unrelated fixes, generated evidence, and formatting churn.
- Do not amend, squash, rebase, or force-push signed release history unless an approved recovery plan explicitly requires it.
- Never commit secrets or unsanitized Production data.
- Push the branch before treating it as a release candidate.

Examples:

```text
feat: restore enrolled course selection
feat: add super admin authorization boundary
test: cover historical course switching
docs: record course selection staging acceptance
fix: preserve Notion embed support in course selector release
```

### 5.4 Protected branch controls

`main` should require:

- pull requests;
- passing required checks;
- resolved review conversations;
- at least one approval for ordinary changes;
- Product Owner acceptance for user-visible behavior;
- designated review for migrations, authorization, secrets, and deployment configuration;
- blocked force pushes and deletion.

Use `CODEOWNERS` when repository collaborators are stable enough to own sensitive paths such as:

```text
supabase/migrations/
src/lib/server/
src/app/api/admin/
src/utils/supabase/
.github/workflows/
docs/governance/
```

## 6. Change classification

Classify the change before implementation. When multiple rows apply, use the highest risk.

| Risk | Examples | Minimum evidence | Production approach |
|---|---|---|---|
| Low | Copy, spacing, non-functional documentation | Targeted checks and visual review | Normal promotion |
| Medium | Student navigation, course chooser, Admin UI without new authority | Automated tests plus Staging journey | Sequential release with app rollback |
| High | Migration, RLS, role change, payment, mock-attempt mutation, enrollment behavior | Local reset, Staging probe, authorization tests, rollback rehearsal | Explicit approval and monitored release |
| Critical | Destructive data correction, authentication provider, secret rotation, Production backfill | Written runbook, backup/recovery proof, two-person review where available | Maintenance window or controlled incident procedure |

Example:

> Adding a “Switch course” link is Medium risk because it changes Student navigation. Changing the function that chooses the Student's course is High risk because it affects authorization and all Student data projections.

## 7. Pull-request contract

Every pull request must state:

### 7.1 Required description

```text
Objective:
Why now:
Included:
Excluded:
User-visible behavior:
Database impact:
Authorization/privacy impact:
Operational-data impact:
Tests run:
Staging evidence:
Rollback:
Documentation updated:
```

### 7.2 Review questions

- Is the branch based on the authoritative Production lineage?
- Does the diff contain unrelated changes?
- Is the behavior defined for zero, one, and multiple records?
- Are inactive/historical records handled deliberately?
- Are server authorization and RLS aligned?
- Are retries and duplicate submissions safe?
- Does any change expose private data or a privileged key?
- Can the old app run safely with the new database migration?
- Can the new app run safely before all data changes are complete?
- Is rollback executable without deleting live data?
- Are documentation and evidence sufficient for another person to resume?

### 7.3 Required automated checks

As applicable:

- formatting and `git diff --check`;
- lint for touched files;
- TypeScript checking;
- unit and contract tests;
- migration replay from a clean database;
- production build;
- environment-boundary validation;
- authorization and RLS probes;
- browser acceptance smoke tests;
- documentation link checks.

## 8. Database and migration discipline

### 8.1 Golden rule

Every schema, function, trigger, RLS, grant, and database-owned behavior change must be represented in `supabase/migrations/` and committed with the application code that depends on it.

Do not use the remote SQL editor as the normal deployment path. An emergency remote correction must be:

1. explicitly approved;
2. bounded by exact preconditions;
3. recorded with before/after evidence;
4. reconciled into source control immediately;
5. followed by a migration-ledger comparison.

### 8.2 Immutable migrations

After a migration has been applied to any shared environment:

- do not edit or rename it;
- add a new correction migration;
- preserve the original evidence;
- document why the later correction was necessary.

Bad example:

```text
Edit 20260830133000_add_student_course_selection.sql after Staging applied it.
```

Good example:

```text
20260830133000_add_student_course_selection.sql
20260830161500_fix_course_selection_identity_projection.sql
```

### 8.3 Expand-and-contract pattern

For role or contract changes:

1. **Expand:** add new columns, roles, functions, or compatibility behavior without breaking the old app.
2. Deploy application code that understands old and new states.
3. Migrate or grant data through an audited operation.
4. Verify Production behavior.
5. **Contract:** remove old behavior only in a later release when rollback no longer depends on it.

Admin/Super Admin example:

```text
Release A: allow both admin and super_admin through existing privileged policies.
Release B: deploy separate Admin and Super Admin interfaces.
Release C: assign named accounts and verify access.
Release D: restrict content-management policies to super_admin only.
```

This avoids locking all current Admins out during the transition.

### 8.4 Migration verification

Before Production:

- reset/replay locally when feasible;
- compare local, Staging, and Production migration ledgers;
- apply only pending migrations to Staging;
- run positive and negative authorization probes;
- verify repeat execution or idempotency assumptions;
- confirm locks and expected runtime;
- record the rollback or forward-correction strategy.

### 8.5 Data changes are not schema migrations by default

Named access grants, enrollment corrections, and fixture creation are operational changes. Use a reviewed, idempotent operational script or an audited Admin workflow.

An access-grant operation should:

- require the exact normalized email or immutable user ID;
- fail if zero or multiple accounts match;
- verify the account is active;
- show current and requested roles before mutation;
- update only the intended rows;
- emit a sanitized result;
- record executor, approver, timestamp, and reason;
- provide an inverse operation.

Never infer a Production identity from a first name.

## 9. Authorization and role model

### 9.1 Target roles

| Capability | Student | Admin | Super Admin |
|---|---:|---:|---:|
| Access enrolled courses, including historical courses | Yes | Through preview | Through preview |
| Select among available courses/batches | Enrolled only | All approved Admin-visible courses | All courses |
| View Student experience | Own experience | Marked preview | Marked preview |
| View Student progress and mock results | Own only | Yes | Yes |
| Take or retake tester mocks | No ordinary reset | Yes, separate tester attempts | Yes, separate tester attempts |
| Edit course material/templates | No | No | Yes |
| Create/populate batches | No | No | Yes |
| Manage worksheets/question counts | No | No | Yes |
| Manage question bank/mock releases | No | No | Yes |
| Manage enrollments and roles | No | No | Yes |

The intended Admin recipients are Tanya, Unnati, and Shan. Their exact Production accounts must be confirmed before any grant. Do not grant access based solely on name matching.

### 9.2 Student preview

Admin Student view should be a preview context, not silent impersonation.

Requirements:

- show a persistent “Admin preview” banner;
- display the selected course/batch;
- prevent writes that would create Student progress, worksheet entries, or real mock completion;
- use Admin-owned tester attempts for mock retakes;
- provide an obvious return to Admin;
- audit course switches and any permitted reset operation.

Example:

```text
Admin Tanya selects “Reading Comprehension - CC”.
The application opens the Student dashboard with an Admin Preview banner.
Opening a worksheet shows availability and questions but does not write Tanya into Student batch completion.
A mock creates or resets Tanya's tester attempt, which reporting excludes from Student completion.
```

### 9.3 Defense in depth

Each privileged capability must be protected by:

- authenticated identity;
- active profile status;
- server-side role/capability check;
- RLS or security-definer function validation;
- input validation;
- audit logging for sensitive operations;
- tests for allowed and denied roles.

Client-side navigation and hidden controls are usability measures, not security boundaries.

## 10. Multi-course Student contract

The course-selection behavior is:

1. A Student can access every course to which they remain enrolled, regardless of `courses.is_active`.
2. A Student with zero enrollments receives a clear no-course state.
3. A Student with one enrollment may go directly to that course.
4. A Student with multiple enrollments sees a chooser after each fresh authentication.
5. The selection persists while navigating the portal.
6. “Switch course” remains available after selection.
7. Switching validates the enrollment server-side.
8. The dashboard, schedule, resources, practice log, mocks, and material routes use the same selected-course context.

Example:

```text
Ishan is enrolled in historical “Aug 7th Batch” and current “Reading Comprehension - CC”.
After Google Sign-In, both appear in the chooser.
Selecting the historical batch must work even though it is operationally inactive.
After opening RC, the header still offers “Switch course”.
```

The stored preference may identify the currently highlighted course, but it must not suppress the fresh-login chooser when the Product Owner requires a choice at login.

## 11. Testing strategy

### 11.1 Layers

Use the smallest sufficient set, but cover the full story for high-risk changes:

1. **Static checks:** formatting, lint, TypeScript, build.
2. **Unit/contract tests:** parsing, authorization helpers, timing, selection rules.
3. **Database tests:** migrations, functions, triggers, grants, RLS.
4. **Integration tests:** application server against Staging Supabase.
5. **Browser acceptance:** signed-in user journeys.
6. **Production smoke:** minimal, non-destructive verification after promotion.

### 11.2 Positive and negative authorization tests

For each role/resource pair, test both allowance and denial.

Example role probe:

```text
Student can read own selected course.
Student cannot select an unenrolled course.
Admin can open Admin Preview.
Admin cannot update a course template.
Super Admin can update a course template.
Inactive Admin and inactive Super Admin are denied.
Anonymous user is denied.
```

### 11.3 Disposable fixtures

Fixtures must have:

- a unique run identifier;
- an explicit Staging-only assertion;
- a recorded list of created rows/files/users;
- bounded timestamps and course IDs;
- cleanup in reverse dependency order;
- a post-cleanup zero-row assertion.

Example:

```text
qa_run: course-selection-20260831-001
creates: 1 Student, 2 courses, 2 enrollments, 1 preference
tests: current selection, historical selection, unauthorized selection
cleanup: preference → enrollments → courses → profile/auth user
postcondition: no rows contain qa_run identifier
```

Never reuse a live Student as a disposable fixture.

### 11.4 Acceptance evidence

Evidence should record:

- environment and date;
- tested commit SHA;
- migration versions;
- fixture identifier;
- steps and expected results;
- pass/fail result;
- sanitized screenshots or outputs where useful;
- cleanup result;
- verifier and Product Owner acceptance where required.

## 12. Release process

### 12.1 Release sequence

1. Confirm authoritative Production commit and migration ledger.
2. Create a short-lived branch from that baseline.
3. Write or update the requirement/ADR before irreversible design work.
4. Implement code, migrations, tests, and documentation together.
5. Run local checks.
6. Push the branch and open a pull request.
7. Deploy a Staging-backed Preview.
8. Apply pending migrations to Staging only.
9. Create disposable QA fixtures.
10. Run automated and browser acceptance.
11. Clean up fixtures and prove cleanup.
12. Record Staging evidence and rollback target.
13. Obtain explicit Production approval.
14. Apply approved Production migrations in order.
15. Promote the exact approved application commit/deployment.
16. Run bounded Production smoke checks.
17. Record deployment and migration IDs.
18. Tag the release and update the handoff/current-state record.

Application-first or migration-first ordering must be explicitly decided for each release based on compatibility. “Always database first” is not a safe universal rule.

### 12.2 Release gates

A release cannot advance while its gate is incomplete.

| Gate | Required outcome |
|---|---|
| Scope | Objective, exclusions, owner, risk, and acceptance criteria are written |
| Source | Branch is pushed and based on authoritative Production lineage |
| Local | Required automated checks pass |
| Staging database | Expected migrations only; probes pass |
| Preview | Exact commit runs against Staging |
| Acceptance | Product journeys pass and fixtures are cleaned |
| Rollback | Previous application target and database recovery are documented |
| Authorization | Product Owner explicitly approves Production scope |
| Production | Migration, promotion, and smoke checks pass |
| Closeout | Tag, changelog, evidence, and handoff are updated |

### 12.3 One-after-another rule

Do not overlap Production releases that share application, schema, or authorization surfaces. Finish and record one release before starting the next Production promotion.

Current intended sequence:

1. **Release 0 — Source and governance reconciliation.** Establish one GitHub-backed baseline and release controls.
2. **Release 1 — Course-selection restoration.** Restore chooser and switching while retaining the Notion fix.
3. **Release 2 — Admin/Super Admin foundation.** Add backward-compatible role and policy support without granting new access.
4. **Release 3 — Role activation.** Confirm exact accounts, assign Tanya, Unnati, and Shan as Admins, assign approved Super Admins, and enable the new experience.
5. **Release 4 — Authorization contraction.** After acceptance and rollback expiry, restrict content-management operations to Super Admin only.

Each release has a separate PR, deployment, acceptance record, approval, rollback target, and tag.

## 13. Rollback and recovery

### 13.1 Application rollback

Before Production promotion, record the exact previously healthy Vercel deployment.

If the new application fails and the database remains backward-compatible:

1. stop further changes;
2. reassign Production to the recorded healthy deployment;
3. run basic health and authentication checks;
4. record the incident and observed symptoms;
5. fix forward on a branch from the correct lineage.

### 13.2 Database recovery

Do not assume a destructive “down migration” is safe.

Preferred order:

1. disable or bypass the new application behavior;
2. roll back the application if the new schema is backward-compatible;
3. preserve new tables/columns/data when harmless;
4. revoke new execution paths if necessary;
5. use a reviewed forward-correction migration;
6. restore data from a verified backup only when correction is insufficient.

Never delete preferences, attempts, enrollments, course materials, or audit history merely to make the old application work unless an explicitly approved data-recovery plan requires it.

### 13.3 Rollback record example

```text
Trigger: /courses returns 500 or Student cannot open either enrollment.
Application rollback target: <known-good Vercel deployment ID>
Database compatibility: new preference table is additive and may remain.
Containment: revoke authenticated execution on new selection RPC only if the old app can call it unsafely.
Verification: /login, /dashboard, one Student course, Admin login, logout.
Data recovery: none expected; preserve course preferences for later diagnosis.
```

## 14. Documentation system

### 14.1 Document types

| Document | Purpose | Update behavior |
|---|---|---|
| `docs/README.md` | Documentation router | Update in place |
| `docs/governance/engineering-handbook.md` | Engineering operating rules | Update in place with review |
| `docs/CURRENT_STATE.md` | Exact current deploy, schema, open incidents, next release | Update after every release |
| `docs/decisions/adr-NNNN-*.md` | Significant decision and trade-offs | Append-only after acceptance |
| `docs/features/<feature>/` | Stable feature behavior and operations | Update with feature |
| `docs/releases/YYYY-MM-DD-*.md` | One release plan and actual result | Preserve after closeout |
| `docs/handoffs/` | Cross-phase continuity | Append signed sections |
| `docs/**/evidence/` | Sanitized test and deployment proof | Dated and immutable |
| `CHANGELOG.md` | Human-readable shipped changes | Update per release |

`docs/CURRENT_STATE.md`, `docs/releases/`, and `CHANGELOG.md` are target conventions introduced by this draft. They should be created during Release 0 rather than fabricated retrospectively without verification.

### 14.2 Architecture decision records

Create an ADR for decisions that are expensive to reverse or affect security, data ownership, environments, or major product behavior.

ADR template:

```markdown
# ADR-NNNN — Decision title

Status: Proposed | Accepted | Superseded
Owner: Product owner and Engineering
Date: DD Month YYYY

## Context

What problem and constraints require a decision?

## Options considered

1. Option A — benefits and costs.
2. Option B — benefits and costs.

## Decision

State the chosen rule precisely.

## Consequences

- Positive outcomes.
- Trade-offs and risks.
- Follow-up work.

## Verification

How will the team prove the decision is implemented?
```

Example ADR decisions for the current work:

- multi-course choice appears after fresh authentication and includes historical enrollments;
- Admin preview is not Student impersonation;
- content authoring is restricted to Super Admin;
- Production deployments are promoted only from an authoritative Git commit.

### 14.3 Release record template

```markdown
# Release — Short name — YYYY-MM-DD

Status: Planned | Staging accepted | Production approved | Released | Rolled back
Owner: Engineering

## Objective
## Included scope
## Explicit exclusions
## Risk classification
## Source commit and pull request
## Migrations
## Environment/configuration impact
## Staging verification
## Fixture cleanup
## Production authorization
## Production deployment
## Smoke checks
## Rollback target and trigger
## Documentation updated
## Remaining work
```

### 14.4 Handoff quality

A useful handoff states facts, not confidence language.

Bad:

> Everything should be working. Continue with roles.

Good:

> Production serves commit `<sha>` via deployment `<id>`. Migrations through `<version>` are applied. Course selection passed the two-enrollment and historical-course journeys for fixture `<id>`, which was removed. No role migrations are applied. Resume from Release 2 on a branch created from tag `<tag>`.

### 14.5 Documentation enforcement

A pull request cannot be closed as complete until it either:

- updates the applicable durable documentation; or
- states `Documentation impact: none` with a reviewable reason.

Chat summaries do not satisfy this requirement.

### 14.6 Future handoff standard

The active engineering handoff is `docs/CURRENT_STATE.md` once that convention is adopted. Do not create another growing “running handoff” for a new pilot, phase, or feature.

#### Required update events

Update Current State in the same commit or release closeout when:

- Production is promoted or rolled back;
- a Production migration is applied or its ledger is corrected;
- an accepted Staging candidate changes;
- a release gate passes or becomes blocked;
- a material incident or regression is confirmed;
- an access role is activated or revoked;
- the exact next action changes;
- a Product Owner decision changes scope or acceptance.

#### Mandatory handoff sections

```markdown
# Ace Club LMS — Current State

Status: Active
Owner: Product owner and Engineering
As of: YYYY-MM-DD HH:MM TZ

## Production identity
- Git commit and tag
- Vercel deployment
- Supabase migration boundary

## Staging candidate
- Git commit and Preview
- Pending Staging migrations

## User-visible state
- Confirmed working journeys
- Known regressions

## Active release
- Objective and gate
- Completed work
- Pending work
- Explicit exclusions

## Exact next action
- One bounded action
- Preconditions and required approval

## Rollback
- Application target
- Database compatibility/recovery

## Pending decisions and account confirmations

## Authoritative links
- Release record
- Relevant ADR/feature reference
- Acceptance evidence
```

#### Handoff quality rules

1. Normal prerequisite reading is limited to the Project Manual and Current State.
2. Use exact commit, migration, deployment, environment, and fixture identifiers.
3. Do not use “latest,” “the branch,” “the preview,” “everything passed,” or similar language without identifiers and evidence.
4. State one exact next action. Put later work in a linked release plan or backlog.
5. Separate completed, pending, blocked, and excluded work.
6. Record whether fixtures were cleaned and how that was verified.
7. Record explicit Product Owner approval boundaries; earlier approval must not be reused for a later Production change.
8. Link to detailed history instead of copying it.
9. Never include secrets, private Student data, magic links, tokens, or unrestricted URLs.
10. Verify every link and identifier before committing.
11. Update the handoff in the same PR/commit as the state change whenever possible.
12. Git history preserves old Current State versions; do not append years of narrative to the live file.

#### Handoff example

Bad:

> The selector work is done and everything is on Production. Next do Admins. Read the earlier handoffs for context.

Good:

> Production serves commit `<sha>` through Vercel deployment `<deployment-id>`. Supabase migrations through `<version>` are applied. The two-course fixture passed current and historical selection and was removed with a zero-row cleanup check. Release 1 is closed. Release 2 has no applied migration or access grant. Next: draft and review ADR-000X for Admin/Super Admin authorization; no Production change is authorized.

#### Stale handoff rule

If Current State contradicts verified Production or is missing a release:

1. stop feature execution;
2. perform read-only reconciliation;
3. correct Current State in a focused documentation commit;
4. link the evidence that established the correction;
5. resume only from the reconciled Production lineage.

## 15. Operational changes and access grants

Operational changes require a record even when no application code changes.

Record:

- request and approver;
- exact environment;
- exact targets;
- preconditions;
- intended before/after state;
- command, script, or Admin workflow used;
- sanitized result;
- verification;
- inverse or recovery action.

Admin grant example:

```text
Environment: Production
Requested role: admin
Targets: exact confirmed accounts for Tanya, Unnati, and Shan
Precondition: each account exists exactly once and is active
Existing role: recorded before mutation
Mutation: idempotent audited operation
Verification: Admin navigation and preview allowed; template editing denied
Inverse: restore prior role for the exact user IDs
```

Role grants should occur only after the compatible application and database authorization are live. Never grant a new role before every protected route understands it.

## 16. Incident and hotfix procedure

An urgent change still requires lineage, evidence, and documentation.

1. Record the visible symptom, impact, start time, and environment.
2. Identify the exact Production commit/deployment and recent changes.
3. Prefer rollback when a known-good compatible deployment exists.
4. If a hotfix is necessary, branch from the exact Production commit.
5. Keep the fix minimal and avoid opportunistic refactoring.
6. Test the failed journey and one adjacent non-regression journey.
7. Obtain explicit Production approval.
8. Deploy, smoke test, and record the result.
9. Reconcile the hotfix into `main` immediately.
10. Write a short incident record covering cause, detection gap, correction, and prevention.

Example prevention from the course-selector regression:

```text
Cause: a Notion hotfix was deployed from a baseline that predated the course-selector UI.
Detection gap: the release did not compare the candidate commit with the currently accepted feature lineage.
Preventive gate: every release record must identify its base Production SHA and list previously shipped journeys that must remain present.
Regression test: Production candidate must expose /courses and “Switch course” for the multi-course fixture.
```

## 17. Security, privacy, and audit rules

- Use least privilege.
- Use individual named accounts; avoid shared privileged accounts.
- Keep service-role keys server-only.
- Do not authorize through client JavaScript alone.
- Do not expose private Student progress in screenshots or committed evidence.
- Sanitize emails unless the operational record genuinely requires a confirmed named account.
- Log role changes, sensitive resets, and privileged content mutations.
- Keep test attempts separate from Student completion reporting.
- Test inactive-account and anonymous denial.
- Review privileged access periodically and remove access that is no longer required.

## 18. Definition of done

A change is done only when:

- scope and acceptance criteria are written;
- the authoritative base commit is known;
- code, migrations, tests, and documentation are committed;
- the branch is pushed and reviewed;
- required local and CI checks pass;
- Staging uses the expected database and application commit;
- acceptance journeys pass;
- fixtures are cleaned and cleanup is verified;
- rollback is documented and, for high-risk changes, rehearsed;
- Production was explicitly approved when applicable;
- Production smoke checks pass;
- the release tag, changelog, release record, and current-state handoff are updated;
- no secrets or private Student evidence were committed;
- remaining work and exclusions are explicit.

“The code is deployed” is not equivalent to “the change is done.”

## 19. Resume checklist for a new engineer or agent

Before changing anything:

1. Read `AGENTS.md`.
2. Read `instruction/README.md` for product authority.
3. Read `docs/README.md` and this handbook.
4. Read `docs/CURRENT_STATE.md` when it exists.
5. Read the latest signed handoff and relevant ADR/feature guide.
6. Inspect Git status, current branch, remotes, tags, and recent commits.
7. Identify the exact current Production deployment and commit.
8. Compare local and remote migration ledgers read-only.
9. Confirm Local/Preview points to Staging.
10. Preserve unrelated and uncommitted user work.
11. State the proposed scope, exclusions, risk, tests, and rollback before implementation.

Do not assume the newest local commit is deployed, the default branch is current, or a Vercel `Ready` status proves the authenticated application journeys work.

## 20. Adoption plan

This handbook is Draft until reviewed by the Product Owner. Adoption should happen through Release 0:

1. Verify and document the authoritative current Production lineage.
2. Push all legitimate local-only release history to GitHub.
3. Reconcile the default branch without discarding signed history.
4. Add branch protection and required checks.
5. Add a pull-request template and, when owners are confirmed, `CODEOWNERS`.
6. Create `docs/CURRENT_STATE.md`, `docs/releases/`, and `CHANGELOG.md` from verified facts.
7. Record ADRs for course selection and Admin/Super Admin authorization.
8. Test the workflow with the course-selection restoration release.
9. Mark this handbook Active after the process and responsibilities are accepted.

Until then, this document describes the proposed standard; it does not itself authorize a Production change or access grant.
