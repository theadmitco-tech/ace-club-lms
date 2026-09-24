# Ace Club LMS — Current State

Status: Active
Owner: Product owner and Engineering
As of: 24 September 2026, 11:02 IST

This is the single active operational handoff. Git history preserves earlier versions; do not append a growing chronological diary here.

Stable context: [Project Manual](PROJECT_MANUAL.md). Engineering and handoff rules: [Engineering Handbook](governance/engineering-handbook.md).

## 1. Production identity

| Item | Verified state |
|---|---|
| Application | [aceclub.theadmitco.com](https://aceclub.theadmitco.com) |
| Vercel project | `ace-club-lms` / `prj_2lW0zANcAnI81eURRZrJTMSCxuLr` |
| Current Production deployment | `dpl_DPSTQTeEcdJoTtzjF8N4ef5dz1L9` — `READY` |
| Deployment source | `codex/template-worksheet-tracker` |
| Production Git commit | `8e6052336f9274922ecad63c8d9772e644473c01` |
| Commit purpose | Restore the existing worksheet tracker for template-native courses without changing the Student flow |
| Production Supabase | `owmlxsnzogfapotmjrqk` |
| Latest Production migration | `20260907064221_add_material_tracker_rls_policies` |
| Production migration count | 47 |

The deployment identity and migration boundary were reverified read-only on 24 September 2026. Security Advisor and authenticated read-only Production RPC acceptance were last run on 7 September 2026.

### Application rollback candidate

The immediate application rollback is `dpl_5YJZJx6zM5bxNJfZgr5Us8fMHvo7`, the previously live and verified Release 1.1 deployment.

It includes the final Notion fix, worksheet counts, the login chooser, and “Switch course”, but not the template-native worksheet tracker. If Release 1.2 database behavior must also be disabled, use the documented non-destructive rollback SQL; do not drop the new tables.

## 2. Staging state

| Item | Verified state |
|---|---|
| Staging Supabase | `eyphkkginlgoaxflauog` |
| Latest Staging migration | `20260906133456_add_material_tracker_rls_policies` |
| Staging migration count | 44 |
| Accepted current application candidate | `codex/template-worksheet-tracker` |
| Accepted Staging-backed Preview | `dpl_B4GKdMvCZqdLrhWJPm99QxS4zfYt` — `READY`, target Preview |
| Preview URL | `https://ace-club-kf3qofcht-theadmitco-techs-projects.vercel.app` |
| Accepted security-patch candidate | `codex/next-security-patch` at `9437533` |
| Security-patch Preview | `dpl_5KmtqCLpqPMk6WnrwHk7u1YnQFez` — `READY`, target Preview |
| Security-patch Preview URL | `https://ace-club-3d0r47j07-theadmitco-techs-projects.vercel.app` |
| Active disposable fixtures | None; exact-ID audits returned zero profiles, courses, template revisions, and Master Base sessions for both QA cycles |

### Ledger differences requiring deliberate handling

Production contains versions not present in the Staging ledger:

- `20260821113000_fix_mock_answer_key_slot_count`
- `20260821123000_add_mock_builder_release`
- `20260821150000_add_mock_taxonomy_management`
- `20260827143000_add_portal_identity_projection`

Staging instead contains:

- `20260821105003_fix_mock_answer_key_slot_count`

The similarly named answer-key migrations reflect a known ledger/version reconciliation history. Do not claim Staging/Production ledger parity and do not run a blind `db push`. Release 0 must compare committed migration files, both ledgers, and effective schema/function definitions before normal CI/CD is enabled.

No migration or durable Staging data change was made for Release 1. One disposable Student, two courses, two enrollments, and one selection preference were created for acceptance and completely removed afterward.

Release 1.1 reused the same environment-locked fixture pattern. Its disposable Student, two courses, enrollments, and preference were also completely removed; the cleanup audit returned zero profile and course residue and removed the private manifest.

Release 1.2 adds a material-backed compatibility catalog for template-native worksheets while retaining the Master Base tracker unchanged. Its Staging acceptance covered released RC, locked DI, template-based Full Course, Master Base Full Course, save/reload, non-enrolled denial, Admin reporting, protected preview rendering, and zero-residue cleanup. Production received the two verified migrations and a fresh Production-environment build on 7 September 2026; the Staging-backed Preview itself was not promoted.

## 3. Source-control state

### GitHub application repository

- GitHub repository: `theadmitco-tech/ace-club-lms`.
- GitHub `main`: `be1a6ccba4e1ba896b059051fbf712708c70fafb`.
- Current Production commit is available on GitHub branch `codex/pilot-v3-notion-fix`.
- GitHub `main` is not the authoritative Production source baseline; it predates the Pilot V3 Production lineage.

### Reconciled Release 0 candidate and Release 1 Staging branch

- Working branch: `codex/release-0-reconciled-baseline`.
- GitHub publication: complete through `e92a829`; no pull request, merge, or deployment was created.
- Candidate lineage includes accepted worksheet-question-count and course-selection work through `838b782`, documentation consolidation through `85ae2ba`, and the Production Notion fix cherry-picked as `1b5a01e`.
- Shared ancestry was proved at `65aa63f`; no history was discarded or force-pushed.
- The candidate contains `/courses`, the “Switch course” Student-header entry, Notion-link normalization, reusable worksheet question counts, the three August 30 migrations, rollback SQL, and the consolidated documentation set.
- The Release 0 branch was not merged into stale `main`; its reconciled application source was carried forward to Release 1 and is now deployed through the separately accepted branch.
- Release evidence: [Release 0 source-lineage reconciliation](releases/2026-08-31-release-0-source-lineage-reconciliation.md).
- Release 1 branch: `codex/release-1-course-selection-staging`, published through `341281b` before the acceptance-evidence commit.
- Release 1 adds only a reusable, environment-locked disposable Staging fixture workflow; the application behavior is the reconciled Release 0 behavior.
- Release 1 acceptance evidence: [Course-selection Staging acceptance](releases/2026-09-01-release-1-course-selection-staging-acceptance.md).
- Release 1 Production evidence: [Course-selection Production rollout](releases/2026-09-01-release-1-course-selection-production.md).
- Release 1 Production application source was `82b5a91` and is now the immediate rollback.
- Release 1.1 branch: `codex/release-1-1-login-course-chooser`, published at application commit `682b529`.
- Release 1.1 routes fresh Student authentication through `/post-login`: multi-course Students reach `/courses` even with a saved preference, while single-course Students reach `/dashboard` and Admins reach `/admin`.
- Release 1.1 Staging evidence: [Login course chooser Staging acceptance](releases/2026-09-01-release-1-1-login-course-chooser-staging-acceptance.md).
- Release 1.1 Production source is `9117d40`; its difference from accepted application commit `682b529` is documentation only.
- Release 1.1 Production evidence: [Login course chooser Production rollout](releases/2026-09-01-release-1-1-login-course-chooser-production.md).
- Release 1.2 branch: `codex/template-worksheet-tracker`, based on the current Release 1.1 Production source.
- Release 1.2 preserves the existing Student UI and RPC contracts while supplying question rows for template-native worksheets from their saved `question_count`.
- Release 1.2 design: [ADR-0005](decisions/adr-0005-template-native-worksheet-tracking.md).
- Release 1.2 Staging evidence: [Template worksheet tracker Staging record](releases/2026-09-06-release-1-2-template-worksheet-tracker-staging.md).
- Release 1.2 Production evidence: [Template worksheet tracker Production rollout](releases/2026-09-07-release-1-2-template-worksheet-tracker-production.md).
- Security patch branch: `codex/next-security-patch`, based on the documented Release 1.2 branch head.
- Its application commit changes only `package.json` and `package-lock.json`, updating Next.js and its ESLint configuration from `16.2.4` to `16.3.6`.
- Production dependency audit, regression suites, Preview build, route smoke checks, and runtime-log scan passed. Pull request #21 remains Draft; `main` and Production are unchanged.
- Security patch evidence: [Next.js security patch Preview acceptance](releases/2026-09-24-next-security-patch-staging.md).

## 4. Confirmed user-visible state

### Working

- Production Home loads for the active test Student.
- The active selected course can load its dashboard, schedule, resources, mocks, and practice surfaces subject to their own content state.
- The public Notion pre-read normalization/embed fix is deployed.
- Template worksheet question-count and course-selection database migrations remain applied.
- Released template-native RC worksheets now expose the existing Practice Log/manual tracker; future DI worksheets remain locked until their configured release times.
- Existing Master Base Full Course worksheets continue through the unchanged tracker store.
- Historical enrollment is preserved in the database.

### Resolved — multi-course selection UI

The designated multi-course Production test Student currently has three enrollments:

- historical/inactive `Aug 7th Batch`;
- `Reading Comprehension - CC`;
- `Data Interpretation - CC`.

The current Production application now:

- contains `/courses`;
- shows “Switch course” in the Student header;
- lists both active and historical enrolled courses;
- redirects a multi-course Student to the chooser after every fresh authentication, including when a saved preference exists;
- marks the saved preference “Continue with this course”;
- opens the selected course after the Student confirms it.

Single-course Students continue directly to their dashboard, Admins continue to `/admin`, and normal in-session navigation does not reopen the chooser.

The Production database still contains:

- `student_course_preferences`;
- `get_student_course_options()`;
- `select_student_course(uuid)`;
- selected-course-aware timeline resolution.

The prior cause was a split Git lineage: the Notion hotfix was released without the later course-selection frontend. Release 0 reconciled the lineages and Release 1 promoted the combined source.

### Release 1.1 Production acceptance

Authenticated smoke testing as the designated multi-course test Student passed:

- the existing RC selection opened `Reading Comprehension - CC`;
- “Switch course” was visible;
- `/courses` displayed current RC and historical `Aug 7th Batch`;
- selecting the historical course loaded its real dashboard, worksheets, update-log links, pre-reads, and Session materials;
- switching back to RC succeeded and persisted after reload;
- the test account finished on its original RC selection;
- the existing Admin Mock reporting view remained healthy;
- no browser console errors were observed.

One error-level Vercel log was caused deliberately by the signed-out smoke browser presenting an expired refresh cookie. The request correctly redirected to `/login`; after Google sign-in, the authenticated journey produced no browser error and no fatal Production log was recorded.

### Release 1.2 Production acceptance

- Production generated 147 of 147 configured RC tracker rows and 80 of 80 configured DI tracker rows, with zero mismatches.
- No Student material-log row was created by the rollout or smoke tests.
- The released RC `RC: Intro 2` worksheet returned 42 questions for the enrolled test Student.
- Existing Master Base Full Course `CR: Inferences` continued to return 30 questions.
- The Student's saved `Aug 7th Batch` Practice Log continued to return 14 released worksheets.
- DI `Worksheet 1` remained inaccessible before its configured release time.
- Master Base row baselines remained 548 questions and 6,576 Student logs.
- Four explicit RLS policies were present, direct client table privileges were absent, Security Advisor returned zero errors, and the new Vercel deployment emitted no error-level logs during rollout.

### Staging acceptance — restoration candidate

The Release 1 Preview passed with a fresh disposable multi-course Student:

- first authenticated portal entry redirected to `/courses` because no preference existed;
- both an active RC crash course and an inactive historical CR crash course appeared;
- the historical inactive course opened and remained accessible;
- Home, Schedule, Resources, Mocks, and Practice log loaded for the selected historical course;
- “Switch course” appeared on every Student surface checked;
- switching to the active course updated the dashboard and persisted after reload;
- the database preference matched the browser selection;
- browser console and Vercel Preview error/fatal logs were empty;
- fixture cleanup and the independent residue audit both returned zero rows.

The Staging evidence remains the clean fresh-preference proof; Production acceptance proves the real two-enrollment account and live content path.

### Staging acceptance — Release 1.1 login chooser

The Release 1.1 Preview passed with a disposable multi-course Student:

- first login with no preference opened `/courses`;
- selecting a course opened its dashboard and persisted the preference;
- after sign-out and a second fresh login, `/courses` appeared again;
- the saved course was marked “Continue with this course”;
- an inactive historical enrollment remained selectable and opened its dashboard;
- “Switch course” remained available and returned to both choices;
- the database verifier matched the browser preference;
- browser console and Vercel Preview error-level logs were empty;
- cleanup returned zero residue and removed the private credential manifest.

No migration or Production change was made.

### Staging acceptance — Release 1.2 template worksheet tracker

The Release 1.2 Staging-backed preview passed authenticated acceptance with disposable RC, DI, template-based Full Course, and Master Base Full Course fixtures. The deployed RC worksheet rendered its existing manual tracker with the expected five rows; the future DI worksheet remained absent from Practice Log and displayed the protected upcoming-material screen; both Full Course storage paths remained functional.

Status, time, and comment persistence, Admin progress, non-enrolled denial, the four-course chooser, Preview environment separation, and runtime error scanning also passed. A complete second fixture cycle proved setup, verification, deployed-page acceptance, and zero-residue cleanup. Production remains unchanged pending explicit approval.

### Production acceptance — Release 1.1 login chooser

Authenticated Production smoke testing passed:

- the designated multi-course test Student landed on `/courses` after a fresh Google login despite having an existing RC preference;
- current RC and historical `Aug 7th Batch` both appeared;
- RC was marked “Continue with this course” and opened its dashboard;
- “Switch course” remained visible;
- the account remained on its original RC preference;
- the designated active Admin account opened `/admin` directly and rendered the operational dashboard;
- both sessions signed out;
- `/post-login` redirected a signed-out browser to the Google-only login;
- browser console and Production deployment error-level logs were empty.

The live alias remained on the new `READY` deployment. No rollback condition was met.

## 5. Role state

- Current supported profile roles: `student`, `admin`.
- Current `admin` remains broadly privileged across content and operational surfaces.
- `super_admin` does not exist in the deployed role constraint/application contract.
- Admin/Super Admin separation is approved as the target design but not implemented.
- No Admin access has been granted to Tanya, Unnati, or Shan through this work.
- Their exact Production accounts must be confirmed before any access operation.

## 6. Active documentation release

### Objective

Consolidate documentation into:

1. [Project Manual](PROJECT_MANUAL.md) — stable master front door.
2. Current State — exact operational handoff.
3. [Engineering Handbook](governance/engineering-handbook.md) — reusable rules.
4. Preserved ADRs, feature references, release records, and historical evidence.

### Completed

- Engineering Handbook activated by the Product Owner on 24 September 2026.
- Documentation Consolidation Project created.
- Initial structural inventory completed.
- 134 documentation/instruction artifacts classified with no unclassified paths.
- Future handoff rules written.
- Project Manual created.
- Current State created from verified Vercel, Supabase, Git, database, source, and browser findings.
- Documentation and instruction routers simplified to the two-document resume path.
- Primary running handoffs and Pilot V2 bootstrap marked archived for continuation.
- Reusable coding/document-convention rules consolidated into the Engineering Handbook.
- Automated documentation checks pass for the current documentation corpus and inventory; see the latest command output in the active release evidence commit.
- Documentation release record and changelog created.
- Root `AGENTS.md` now requires every future engineering chat or agent to read Project Manual and Current State before acting, follow the Engineering Handbook, maintain the single-handoff model, preserve privacy, and close changes with verification and rollback evidence.
- Product Owner accepted the two-document continuation path and requested its automatic repository bootstrap.

### Pending

- Preserve all signed evidence and product-authority content during later Git reconciliation.
- Product Owner review of the completed Release 1 Production evidence.
- Product Owner review of the completed Release 1.1 Production evidence.

### Explicit exclusions

- no application-code change;
- no Supabase mutation or migration;
- no Vercel deployment or configuration change;
- no role or access grant;
- no Production data change;
- no deletion of historical evidence.

## 7. Exact next action

> Review pull request #21 and its Preview evidence. Merge it into `codex/template-worksheet-tracker` only after explicit approval, then refresh pull request #20 checks. Do not merge to `main` or promote to Production without a separate explicit approval and Production release gate.

After the framework patch is resolved, resume Release 1.2 monitoring and design Release 2 Admin/Super Admin capabilities, schema/RLS boundaries, and rollback before implementing or granting access.

No database, access, or role change is authorized by this handoff alone.

## 8. Planned release sequence after documentation consolidation

1. **Release 0 — Source and governance reconciliation.** Complete: candidate assembled, locally verified, documented, and published to GitHub without merge or deployment.
2. **Release 1 — Course-selection restoration.** Complete in Production with authenticated Student and Admin smoke checks.
3. **Release 1.1 — Login course chooser.** Complete in Production with authenticated Student and corrected Admin smoke checks.
4. **Release 1.2 — Template-native worksheet tracker.** Complete in Production with RC, DI lock, Master Base compatibility, RLS, security, and rollback verification.
5. **Release 2 — Admin/Super Admin foundation.** Add backward-compatible role/capability and RLS support without grants.
6. **Release 3 — Role activation.** Confirm exact accounts and grant Admin to Tanya, Unnati, and Shan; assign approved Super Admins; verify denial boundaries.
7. **Release 4 — Authorization contraction.** Restrict content management to Super Admin after rollback safety expires.

Each release is separate and requires its own Staging acceptance, rollback record, Production authorization, promotion, smoke checks, tag, release record, and Current State update.

## 9. Rollback for this documentation project

The documentation consolidation has no remote runtime effect. Rollback is a Git revert of the focused documentation commits.

Do not mix these documentation commits with application, database, role, access, or deployment changes.

## 10. Authoritative links

- [Project Manual](PROJECT_MANUAL.md)
- [Engineering Handbook](governance/engineering-handbook.md)
- [Documentation Consolidation Project](governance/documentation-consolidation-project.md)
- [Document Inventory](governance/document-inventory.csv)
- [Release 0 source-lineage reconciliation](releases/2026-08-31-release-0-source-lineage-reconciliation.md)
- [Release 1 course-selection Staging acceptance](releases/2026-09-01-release-1-course-selection-staging-acceptance.md)
- [Release 1 course-selection Production rollout](releases/2026-09-01-release-1-course-selection-production.md)
- [Release 1.1 login course chooser Staging acceptance](releases/2026-09-01-release-1-1-login-course-chooser-staging-acceptance.md)
- [Release 1.1 login course chooser Production rollout](releases/2026-09-01-release-1-1-login-course-chooser-production.md)
- [Next.js security patch Preview acceptance](releases/2026-09-24-next-security-patch-staging.md)
- [Course-selection Production release evidence](pilot-v3/phase-7/evidence/worksheet-count-course-selection-production-release-2026-08-30.md)
- [Course-selection rollback rehearsal](pilot-v3/phase-7/evidence/worksheet-count-course-selection-rollback-rehearsal-2026-08-30.md)
- [Pilot V3 mock release evidence](pilot-v3/phase-7/evidence/phase-7-production-release-2026-08-25.md)

## 11. Pending decisions and confirmations

- Exact Production identities for Tanya, Unnati, and Shan.
- Approved list of Super Admin recipients.
- Product Owner review of Release 1 Production acceptance evidence.
- Product Owner review of Release 1.1 Production acceptance evidence.
- Release 2 capability matrix and approved Super Admin recipients.
