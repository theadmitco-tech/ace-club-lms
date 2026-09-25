# Ace Club LMS — Current State

Status: Active
Owner: Product owner and Engineering
As of: 25 September 2026, 18:07 IST

This is the single active operational handoff. Git history preserves earlier versions; do not append a growing chronological diary here.

Stable context: [Project Manual](PROJECT_MANUAL.md). Engineering and handoff rules: [Engineering Handbook](governance/engineering-handbook.md).

## 1. Production identity

| Item | Verified state |
|---|---|
| Application | [aceclub.theadmitco.com](https://aceclub.theadmitco.com) |
| Vercel project | `ace-club-lms` / `prj_2lW0zANcAnI81eURRZrJTMSCxuLr` |
| Current Production deployment | `dpl_Hk1X2tMnSUU8rzDGgs9u3ewt96Ds` — `READY` |
| Deployment source | `codex/flexible-mocks-security-integration` |
| Production Git commit | `3681f6b5a645a3cbf5c9f682d430b469911e550c` |
| Commit purpose | Deploy flexible sectional mocks with the accepted Next.js 16.3.6 security integration |
| Production Supabase | `owmlxsnzogfapotmjrqk` |
| Latest Production migration | `20260925100000_scope_mock_attempt_order_by_category` |
| Production migration count | 49 |

The deployment identity, migration boundary, authenticated Student/Admin smoke, runtime logs, and Security Advisor were verified on 25 September 2026. Flexible sectional mock schema and application support are live; the supplied RC mock is not imported or released in Production.

### Application rollback candidate

The immediate application rollback is `dpl_DPSTQTeEcdJoTtzjF8N4ef5dz1L9`, the previously live and verified Release 1.2 deployment.

It includes the template-native worksheet tracker but not flexible sectional mock authoring or the Next.js 16.3.6 integration. Because the prior Mock Builder cannot author against the new non-null category schema, keep mock authoring frozen during application rollback and prefer a reviewed forward correction. Do not drop category columns or restore the old uniqueness constraints.

## 2. Staging state

| Item | Verified state |
|---|---|
| Staging Supabase | `eyphkkginlgoaxflauog` |
| Latest Staging migration | `20260925100000_scope_mock_attempt_order_by_category` |
| Staging migration count | 46 |
| Flexible-mock candidate | `codex/flexible-sectional-mocks`; accepted application correction at `65464bd` |
| Flexible-mock Preview | `dpl_EnqC5waqKdBjvc1BJWFKa4GKxhmF` — `READY`, target Preview |
| Flexible-mock Preview URL | `https://ace-club-m4tg32yxy-theadmitco-techs-projects.vercel.app` |
| Accepted security-patch candidate | `codex/next-security-patch` at `fcbd42f`; application commit `9437533` |
| Security-patch Preview | `dpl_5KmtqCLpqPMk6WnrwHk7u1YnQFez` — `READY`, target Preview |
| Accepted integration candidate | `codex/flexible-mocks-security-integration`; application correction `8ad5756` |
| Accepted integrated Preview | `dpl_G91Rg5sd1VzZMuWSfKgG4FyTEhLL` — `READY`, target Preview |
| Integrated Preview URL | `https://ace-club-4ema4l08t-theadmitco-techs-projects.vercel.app` |
| Active Staging fixtures | One imported RC package and two published/assigned acceptance mocks remain active; see the flexible-mock release record |

The RC-only tester attempt was reset successfully during review after a transient browser request failure. The application correction at `65464bd` prevents start/reset dialogs from remaining permanently busy after a failed or stalled request; it does not change the database. The refreshed Preview reproduced and visibly recovered from a transient failed start, then passed a direct RC-only start and successful reset. Both RC verification attempts were removed, leaving the tester card ready to start.

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
- Current Production commit is available on GitHub branch `codex/flexible-mocks-security-integration`.
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
- Production dependency audit, regression suites, Preview build, route smoke checks, and runtime-log scan passed. Pull request #21 remains Draft and unmerged; its accepted dependency change reached Production only through the separately approved integration branch. `main` remains unchanged.
- Security patch evidence: [Next.js security patch Preview acceptance](releases/2026-09-24-next-security-patch-staging.md).
- Flexible sectional mock Production evidence: [Flexible sectional mocks Production rollout](releases/2026-09-25-flexible-sectional-mocks-production.md).

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

### Flexible sectional GMAT mocks — Production application/schema accepted (25 September 2026)

- Work is isolated on branch `codex/flexible-sectional-mocks`, based on `codex/template-worksheet-tracker`; PR #21 and its security-patch worktree remain unchanged.
- Application and migration implementation commit: `b62e65ef489c63871764bdb8d16bbe1ba0708ec0`.
- The isolated branch implements category-level sectional mocks with any non-empty subset of QA, RC, CR, VA, and DI, positive per-category question counts, proportional published timing inherited from Quant/Verbal/Data Insights baselines, and dynamic Student section flow. VA may combine RC and CR questions; the narrower RC-only and CR-only forms remain available.
- Published snapshots retain `category_key`, parent GMAT section, question count, display order, and calculated seconds. Existing snapshots without `category_key` retain their full Quant/Verbal/Data Insights behavior through a compatibility fallback.
- Local verification for commits through `e9b20df` passed: TypeScript, touched-file lint, the complete Pilot V3 suite (40 tests), the Next.js 16.2.4 Production build with all 54 static pages, documentation checks, and `git diff --check`.
- The first Staging transaction attempt on 24 September rolled back automatically before ledgering because the legacy item backfill derived categories from question type and collided where an earlier release had routed Data Sufficiency into Data Insights. The migration now preserves each legacy item's stored parent section (`qa`, `va`, or `di`); no durable Staging schema or data change resulted from the failed transaction.
- The first Preview builder pass then exposed stale client composition while switching directly from one assessment to another. The target draft had zero persisted items; the builder now clears composition and assignment/tester controls immediately and ignores out-of-order assessment responses before any later mock can be saved or published.
- Staging's ledger still differs from the committed migration directory, so a blind `supabase db push --include-all` remains prohibited. Migration `20260924120000_add_mock_category_snapshots.sql` was applied as an explicit transaction and its single ledger record was verified.
- The isolated flexible branch remains preserved on its accepted feature lineage. The separate integration branch now combines it with PR #21 head `fcbd42f` without modifying or merging PR #21.
- Staging imported the approved RC package exactly once and published two acceptance fixtures: RC-only version 1 (`510d2350-b886-4bce-8da7-b5fd4fdae567`) and QA + CR + DI version 2 (`0568d9c3-8d0c-4934-867e-306613e0f91f`). Both are assigned to the Staging-only `DI Test batch`; assignment-scoped tester copies also remain visible.
- Authenticated Student acceptance proved that the RC-only fixture exposes one section, one question, and 1.95 minutes. The mixed fixture exposed only QA, CR, and DI in the order dialog, but attempt creation failed on the legacy parent-section display-order uniqueness constraint.
- Product direction on 25 September removes order selection from every sectional mock. Sectional mocks now start in their immutable published order; only legacy full Quant/Verbal/Data Insights mocks retain the six-order chooser. Migration `20260925100000_scope_mock_attempt_order_by_category` now scopes the remaining attempt-item display-order constraint to `category_key` on Staging.
- The 25 September correction passes TypeScript, touched-file lint, all 42 Pilot V3 tests, the 54-page Next.js production build, documentation checks, and `git diff --check`.
- Staging verification passed on Preview `dpl_5bCDP34CkcHDMnz45JdXg1WrNZTY`: RC-only started directly as section 1 of 1 with a 1:57 timer; QA + CR + DI started directly, used 2:09 / 1:57 / 2:15 timers, offered breaks only between those three sections, and completed; the existing 135-minute full mock retained all six orders.
- Reset-request recovery is accepted on Preview `dpl_EnqC5waqKdBjvc1BJWFKa4GKxhmF`: a transient failed start recovered with visible retry copy and enabled controls; retry, direct RC-only start, and reset then passed.
- Production readiness preparation is documented in [the flexible-mock Production readiness plan](releases/2026-09-25-flexible-sectional-mocks-production-readiness.md). The two reviewed migrations are now applied and ledgered exactly once in Production. Historical ledger differences remain, so a blind migration push remains prohibited.
- The integration candidate uses Next.js 16.3.6 from PR #21 and the accepted flexible-mock changes. PR #21 remains open, mergeable, green, and unchanged.
- Once the category migrations are applied, the prior Admin Mock Builder cannot create/save mocks because it omits non-null `category_key`. An approved rollout therefore requires a mock-authoring freeze and immediate integrated application deployment; application rollback keeps mock authoring frozen pending a forward correction.
- One empty Vercel project named `ace-club-flexible-mocks` was created accidentally during the first CLI deployment attempt. Its deployment `dpl_H1hiCpiFchzAgvaTpZ7aWu1CsjPN` failed before application deployment because no environment variables existed. It is separate from `ace-club-lms`, has no effect on Production, and has not been deleted without explicit approval.
- The Product Owner approved the separate integration branch and explicitly directed that accepted manual Staging work not be repeated. Integration acceptance is therefore delta-based: automated checks/build plus RC-only direct start, legacy full-mock ordering, reset recovery, and runtime logs. The mixed QA + CR + DI journey is repeated only if an integration failure affects it. No Production or merge action is authorized.
- The compact integrated Preview check exposed one omitted dynamic surface: an RC-only completed result still showed hard-coded DI, QA, and VA tabs. Commit `8ad5756` now derives result tabs, diagnostics, question filtering, labels, and links from the attempt's included `category_key` values.
- Integrated acceptance passed on Preview `dpl_G91Rg5sd1VzZMuWSfKgG4FyTEhLL`: the RC-only result showed only Overall and RC / Reading Comprehension, its diagnostic row used Reading Comprehension, and the legacy full mock retained all six order choices. All 43 Pilot V3 tests, Next.js 16.3.6 build, TypeScript, touched-file lint, documentation checks, `git diff --check`, and the Production dependency audit passed; browser and Vercel error logs were empty.
- Per the Product Owner's no-repeat direction, the accepted mixed journey was not rerun. Direct-start and reset recovery remain covered by their accepted feature evidence and the integrated automated suite; no Staging attempt was deleted or reset for this integration check.
- The supplied RC mock is intended to go live only for the **RC CC batch**. Before importing, creating, publishing, assigning, or releasing that mock in Production, stop and obtain a fresh explicit Product Owner approval naming the RC mock and RC CC batch. Application or migration deployment approval does not include this mock-data action, and the already uploaded source package must not be imported a second time without separate confirmation.
- The Product Owner authorized the two Production migrations and integrated application deployment as separate gates. Both migrations are ledgered once, Production deployment `dpl_Hk1X2tMnSUU8rzDGgs9u3ewt96Ds` is `READY`, and the authenticated Student/Admin smoke, browser/Vercel logs, Supabase health, Security Advisor, and final isolation checks passed. Full evidence is in [the Production rollout record](releases/2026-09-25-flexible-sectional-mocks-production.md).
- Production still has zero imports for RC package `1f14b21e-df4f-4f5d-9eff-b972497a9da2`; no RC mock was created, published, assigned, or released.

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

> Ask the Product Owner for fresh explicit approval before importing the supplied RC package into Production, publishing its questions, creating the 11-question RC mock, or assigning/releasing it to the RC CC batch. This handoff does not authorize those actions, any other Production test data, merging PR #21, or merging to `main`.

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
- [Flexible sectional mocks Staging record](releases/2026-09-25-flexible-sectional-mocks-staging.md)
- [Flexible sectional mocks Production readiness plan](releases/2026-09-25-flexible-sectional-mocks-production-readiness.md)
- [Flexible sectional mocks Production rollout](releases/2026-09-25-flexible-sectional-mocks-production.md)

## 11. Pending decisions and confirmations

- Exact Production identities for Tanya, Unnati, and Shan.
- Approved list of Super Admin recipients.
- Product Owner review of Release 1 Production acceptance evidence.
- Product Owner review of Release 1.1 Production acceptance evidence.
- Explicit approval for importing, publishing, and assigning the supplied 11-question RC mock to the RC CC batch.
- Release 2 capability matrix and approved Super Admin recipients.
