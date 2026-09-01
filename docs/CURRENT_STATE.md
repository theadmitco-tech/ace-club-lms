# Ace Club LMS — Current State

Status: Active
Owner: Product owner and Engineering
As of: 1 September 2026, 10:58 IST

This is the single active operational handoff. Git history preserves earlier versions; do not append a growing chronological diary here.

Stable context: [Project Manual](PROJECT_MANUAL.md). Engineering and handoff rules: [Engineering Handbook](governance/engineering-handbook.md).

## 1. Production identity

| Item | Verified state |
|---|---|
| Application | [aceclub.theadmitco.com](https://aceclub.theadmitco.com) |
| Vercel project | `ace-club-lms` / `prj_2lW0zANcAnI81eURRZrJTMSCxuLr` |
| Current Production deployment | `dpl_53zX3axvpv7WrevwR1YoMt5ddfAC` — `READY` |
| Deployment source | `codex/release-1-course-selection-staging` |
| Production Git commit | `82b5a9109f372ae2357c46ad82cad997da42131f` |
| Commit purpose | Reconciled Notion fix, worksheet counts, and restored multi-course selection |
| Production Supabase | `owmlxsnzogfapotmjrqk` |
| Latest Production migration | `20260830133001_fix_template_worksheet_question_count_trigger_order` |
| Production migration count | 45 |

Verified from Vercel, the Supabase migration ledger, and authenticated Production smoke testing on 1 September 2026.

### Application rollback candidate

The immediate application rollback is `dpl_2xvAbGiqwTfXrn83LM3kQwYF6eEG`, the previously live and verified Notion-fix deployment.

Do not use older `dpl_9zmW6EnnAgUZ1otbvB4a2WSKUB3a` as the preferred rollback because it predates the final Notion embedding fix. No database rollback accompanies an application rollback.

## 2. Staging state

| Item | Verified state |
|---|---|
| Staging Supabase | `eyphkkginlgoaxflauog` |
| Latest Staging migration | `20260830133001_fix_template_worksheet_question_count_trigger_order` |
| Staging migration count | 42 |
| Accepted current application candidate | `codex/release-1-1-login-course-chooser` at `682b529` |
| Accepted Staging-backed Preview | `dpl_4NGxkx1JcX3QMLuWQeXaNrSBoka6` — `READY`, target Preview |
| Preview URL | `https://ace-club-d4zdlf555-theadmitco-techs-projects.vercel.app` |
| Active disposable fixtures | None; post-cleanup audit returned zero Auth users, profiles, courses, enrollments, and preferences |

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
- Production application source is `82b5a91`; later evidence-only commits do not change the deployed application.
- Release 1.1 branch: `codex/release-1-1-login-course-chooser`, published at application commit `682b529`.
- Release 1.1 routes fresh Student authentication through `/post-login`: multi-course Students reach `/courses` even with a saved preference, while single-course Students reach `/dashboard` and Admins reach `/admin`.
- Release 1.1 Staging evidence: [Login course chooser Staging acceptance](releases/2026-09-01-release-1-1-login-course-chooser-staging-acceptance.md).
- Release 1.1 is not deployed to Production.

## 4. Confirmed user-visible state

### Working

- Production Home loads for the active test Student.
- The active selected course can load its dashboard, schedule, resources, mocks, and practice surfaces subject to their own content state.
- The public Notion pre-read normalization/embed fix is deployed.
- Template worksheet question-count and course-selection database migrations remain applied.
- Historical enrollment is preserved in the database.

### Resolved — multi-course selection UI

For `ishan.shreyash@gmail.com`, Production data contains two enrollments:

- historical/inactive `Aug 7th Batch`;
- active `Reading Comprehension - CC`.

The current Production application now:

- contains `/courses`;
- shows “Switch course” in the Student header;
- lists both active and historical enrolled courses;
- opens the saved selection directly when one already exists;
- redirects a fresh multi-course Student with no preference to the chooser.

Current Production still opens a saved course directly after login. The Product Owner has requested the chooser after every fresh authentication for multi-course Students. Release 1.1 implements and accepts that behavior on Staging, but Production remains unchanged pending explicit promotion authorization.

The Production database still contains:

- `student_course_preferences`;
- `get_student_course_options()`;
- `select_student_course(uuid)`;
- selected-course-aware timeline resolution.

The prior cause was a split Git lineage: the Notion hotfix was released without the later course-selection frontend. Release 0 reconciled the lineages and Release 1 promoted the combined source.

### Production acceptance

Authenticated smoke testing as `ishan.shreyash@gmail.com` passed:

- the existing RC selection opened `Reading Comprehension - CC`;
- “Switch course” was visible;
- `/courses` displayed current RC and historical `Aug 7th Batch`;
- selecting the historical course loaded its real dashboard, worksheets, update-log links, pre-reads, and Session materials;
- switching back to RC succeeded and persisted after reload;
- the test account finished on its original RC selection;
- the existing Admin Mock reporting view remained healthy;
- no browser console errors were observed.

One error-level Vercel log was caused deliberately by the signed-out smoke browser presenting an expired refresh cookie. The request correctly redirected to `/login`; after Google sign-in, the authenticated journey produced no browser error and no fatal Production log was recorded.

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

- Engineering Handbook drafted.
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

### Pending

- Review Project Manual and Current State for Product Owner corrections.
- Preserve all signed evidence and product-authority content during later Git reconciliation.
- Product Owner review of the simplified two-document path and handbook rules.
- Product Owner review of the completed Release 1 Production evidence.

### Explicit exclusions

- no application-code change;
- no Supabase mutation or migration;
- no Vercel deployment or configuration change;
- no role or access grant;
- no Production data change;
- no deletion of historical evidence.

## 7. Exact next action

> Review Release 1.1 Staging evidence and explicitly authorize or decline its application-only Production promotion. Until authorized, keep Production on `dpl_53zX3axvpv7WrevwR1YoMt5ddfAC`. After Release 1.1 is resolved, continue Release 2 Admin/Super Admin capability and rollback design. Do not grant access merely as part of planning.

No database, access, or role change is authorized by this handoff alone.

## 8. Planned release sequence after documentation consolidation

1. **Release 0 — Source and governance reconciliation.** Complete: candidate assembled, locally verified, documented, and published to GitHub without merge or deployment.
2. **Release 1 — Course-selection restoration.** Complete in Production with authenticated Student and Admin smoke checks.
3. **Release 1.1 — Login course chooser.** Staging accepted; Production authorization pending.
4. **Release 2 — Admin/Super Admin foundation.** Add backward-compatible role/capability and RLS support without grants.
5. **Release 3 — Role activation.** Confirm exact accounts and grant Admin to Tanya, Unnati, and Shan; assign approved Super Admins; verify denial boundaries.
6. **Release 4 — Authorization contraction.** Restrict content management to Super Admin after rollback safety expires.

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
- [Course-selection Production release evidence](pilot-v3/phase-7/evidence/worksheet-count-course-selection-production-release-2026-08-30.md)
- [Course-selection rollback rehearsal](pilot-v3/phase-7/evidence/worksheet-count-course-selection-rollback-rehearsal-2026-08-30.md)
- [Pilot V3 mock release evidence](pilot-v3/phase-7/evidence/phase-7-production-release-2026-08-25.md)

## 11. Pending decisions and confirmations

- Product Owner review/activation of the Draft Engineering Handbook.
- Product Owner acceptance of the Project Manual as the master front door.
- Exact Production identities for Tanya, Unnati, and Shan.
- Approved list of Super Admin recipients.
- Product Owner review of Release 1 Production acceptance evidence.
- Release 2 capability matrix and approved Super Admin recipients.
