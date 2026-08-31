# Ace Club LMS — Current State

Status: Active
Owner: Product owner and Engineering
As of: 31 August 2026, 15:54 IST

This is the single active operational handoff. Git history preserves earlier versions; do not append a growing chronological diary here.

Stable context: [Project Manual](PROJECT_MANUAL.md). Engineering and handoff rules: [Engineering Handbook](governance/engineering-handbook.md).

## 1. Production identity

| Item | Verified state |
|---|---|
| Application | [aceclub.theadmitco.com](https://aceclub.theadmitco.com) |
| Vercel project | `ace-club-lms` / `prj_2lW0zANcAnI81eURRZrJTMSCxuLr` |
| Current Production deployment | `dpl_2xvAbGiqwTfXrn83LM3kQwYF6eEG` — `READY` |
| Deployment source | `codex/pilot-v3-notion-fix` |
| Production Git commit | `b5ad0e2023da29b537c9e77058bf93a03e61b31f` |
| Commit purpose | Public Notion pre-read embedding fix |
| Production Supabase | `owmlxsnzogfapotmjrqk` |
| Latest Production migration | `20260830133001_fix_template_worksheet_question_count_trigger_order` |
| Production migration count | 45 |

Verified from the Vercel connected project and Supabase migration ledger on 31 August 2026.

### Application rollback candidate

Vercel lists `dpl_9zmW6EnnAgUZ1otbvB4a2WSKUB3a` as the previous Production rollback candidate, sourced from commit `0cac27e2c41097758c30bc8c083b43ba190363d5`.

Important: that deployment contains the course-selection UI but predates the final Notion embedding fix. It is a technical rollback candidate, not a pre-approved rollback decision. Using it could reintroduce the Notion pre-read problem.

## 2. Staging state

| Item | Verified state |
|---|---|
| Staging Supabase | `eyphkkginlgoaxflauog` |
| Latest Staging migration | `20260830133001_fix_template_worksheet_question_count_trigger_order` |
| Staging migration count | 42 |
| Accepted current application candidate | `codex/release-0-reconciled-baseline` at `1b5a01e` before the Release 0 evidence commit |
| Active disposable fixtures | None recorded by this documentation project |

### Ledger differences requiring deliberate handling

Production contains versions not present in the Staging ledger:

- `20260821113000_fix_mock_answer_key_slot_count`
- `20260821123000_add_mock_builder_release`
- `20260821150000_add_mock_taxonomy_management`
- `20260827143000_add_portal_identity_projection`

Staging instead contains:

- `20260821105003_fix_mock_answer_key_slot_count`

The similarly named answer-key migrations reflect a known ledger/version reconciliation history. Do not claim Staging/Production ledger parity and do not run a blind `db push`. Release 0 must compare committed migration files, both ledgers, and effective schema/function definitions before normal CI/CD is enabled.

No database mutation is authorized by this record.

## 3. Source-control state

### GitHub application repository

- GitHub repository: `theadmitco-tech/ace-club-lms`.
- GitHub `main`: `be1a6ccba4e1ba896b059051fbf712708c70fafb`.
- Current Production commit is available on GitHub branch `codex/pilot-v3-notion-fix`.
- GitHub `main` is not the authoritative Production source baseline; it predates the Pilot V3 Production lineage.

### Reconciled Release 0 candidate

- Working branch: `codex/release-0-reconciled-baseline`.
- Candidate lineage includes accepted worksheet-question-count and course-selection work through `838b782`, documentation consolidation through `85ae2ba`, and the Production Notion fix cherry-picked as `1b5a01e`.
- Shared ancestry was proved at `65aa63f`; no history was discarded or force-pushed.
- The candidate contains `/courses`, the “Switch course” Student-header entry, Notion-link normalization, reusable worksheet question counts, the three August 30 migrations, rollback SQL, and the consolidated documentation set.
- The candidate is not merged into `main`, deployed, connected to Vercel, or applied to either database.
- Release evidence: [Release 0 source-lineage reconciliation](releases/2026-08-31-release-0-source-lineage-reconciliation.md).

Release 0 must reconcile this branch with the real Production source lineage without discarding the later Production/course-selection history.

## 4. Confirmed user-visible state

### Working

- Production Home loads for the active test Student.
- The active selected course can load its dashboard, schedule, resources, mocks, and practice surfaces subject to their own content state.
- The public Notion pre-read normalization/embed fix is deployed.
- Template worksheet question-count and course-selection database migrations remain applied.
- Historical enrollment is preserved in the database.

### Known regression — multi-course selection UI

For `ishan.shreyash@gmail.com`, Production data contains two enrollments:

- historical/inactive `Aug 7th Batch`;
- active `Reading Comprehension - CC`.

The current Production application:

- does not contain the `/courses` page;
- returns 404 for `/courses`;
- does not show “Switch course” in the Student header;
- opens the stored/default selected course directly.

The Production database still contains:

- `student_course_preferences`;
- `get_student_course_options()`;
- `select_student_course(uuid)`;
- selected-course-aware timeline resolution.

Cause: the Notion hotfix was released from commit lineage `65aa63f` plus the focused Notion change, while the accepted course-selection UI existed on later local commits beginning with `b10a7c1`. The application release therefore replaced the course-selection frontend while leaving its database support in place.

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
- Automated documentation checks pass for 111 Markdown files and 138 inventoried artifacts.
- Documentation release record and changelog created.

### Pending

- Review Project Manual and Current State for Product Owner corrections.
- Preserve all signed evidence and product-authority content during later Git reconciliation.
- Product Owner review of the simplified two-document path and handbook rules.
- Product Owner acceptance of the Release 0 candidate before any Staging-backed preview work.

### Explicit exclusions

- no application-code change;
- no Supabase mutation or migration;
- no Vercel deployment or configuration change;
- no role or access grant;
- no Production data change;
- no deletion of historical evidence.

## 7. Exact next action

> Review and accept the GitHub-backed Release 0 candidate. After acceptance, prepare Release 1 as a separate Staging-backed course-selection restoration release. Do not merge into stale `main`, deploy, or mutate a database merely because Release 0 source reconciliation passed.

No application, database, access, Staging, or Production change is authorized.

## 8. Planned release sequence after documentation consolidation

1. **Release 0 — Source and governance reconciliation.** Candidate assembled and locally verified; GitHub publication is the remaining source-only step.
2. **Release 1 — Course-selection restoration.** Restore the chooser and switch link, include historical enrollments, and prompt once after fresh multi-course login.
3. **Release 2 — Admin/Super Admin foundation.** Add backward-compatible role/capability and RLS support without grants.
4. **Release 3 — Role activation.** Confirm exact accounts and grant Admin to Tanya, Unnati, and Shan; assign approved Super Admins; verify denial boundaries.
5. **Release 4 — Authorization contraction.** Restrict content management to Super Admin after rollback safety expires.

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
- [Course-selection Production release evidence](pilot-v3/phase-7/evidence/worksheet-count-course-selection-production-release-2026-08-30.md)
- [Course-selection rollback rehearsal](pilot-v3/phase-7/evidence/worksheet-count-course-selection-rollback-rehearsal-2026-08-30.md)
- [Pilot V3 mock release evidence](pilot-v3/phase-7/evidence/phase-7-production-release-2026-08-25.md)

## 11. Pending decisions and confirmations

- Product Owner review/activation of the Draft Engineering Handbook.
- Product Owner acceptance of the Project Manual as the master front door.
- Exact Production identities for Tanya, Unnati, and Shan.
- Approved list of Super Admin recipients.
- Product Owner acceptance of the Release 0 GitHub candidate and protected-branch approach.
- Course-selection fresh-login acceptance detail: chooser once per authentication, with persistent switching during the session.
