# Ace Club LMS — Running Handoff

Status: Active
Owner: Product owner and Engineering
Last updated: 31 July 2026

This is the current cross-phase continuity document. Append a signed section when a phase closes; preserve earlier sections as historical snapshots instead of rewriting them to match later state.

## How to use this handoff

Read:

1. [`AGENTS.md`](../../AGENTS.md).
2. The [`instruction/` register](../../instruction/README.md).
3. This running handoff, starting with the latest signed section.
4. The [MVP acceptance criteria](../../instruction/Ace_Club_LMS_MVP_Acceptance_Criteria.md).
5. The relevant phase in the [product roadmap](../../instruction/Ace_Club_LMS_Product_Roadmap.md).
6. The [documentation index](../README.md) and [coding rules](../development/coding-rules.md).
7. The [current code landscape and cleanup plan](../development/current-code-landscape-and-cleanup-plan.md), especially before Phase 3 or cleanup work.
8. Only the implementation files relevant to the immediate task.

Do not repeat completed recovery or audit work unless newer evidence invalidates it.

---

## Phase 0.5 handoff — Setup and recovery

Date: 31 July 2026  
Status: **Signed off**

The full immutable checkpoint remains in [Phase 0.5 Setup and Recovery Sign-off](../../instruction/Phase_0.5_Setup_Recovery_Signoff.md). The sections below preserve its continuation context.

### Purpose

Phase 0.5 established a safe, recoverable working environment before product implementation. It recovered the editable source and Git history, separated staging from production, validated local execution, and established the working agreement.

### Required reading at the checkpoint

The required order was `AGENTS.md`, the instruction register, the Phase 0.5 sign-off, acceptance criteria, roadmap, documentation index, coding rules, and Phase 1 status.

### Working-memory bootstrap at the checkpoint

- Product: Ace Club LMS for the first live GMAT cohort.
- Production roles: Admin and Student only.
- Course model: fixed revised curriculum.
- Instructor mapping: DI–Ishan, VA–Tanya, QA–Unnati.
- Journey: Week 0 immediately; later Notion pre-reads seven days before class; PDF worksheets after class.
- Tracker: per-student, per-worksheet, per-question manual status and optional time/comment.
- Security: RLS, server-side privileged authorization, direct-URL release protection, private student data, and no browser-visible elevated keys.
- Environment: local and Preview use staging; Production remains isolated.

### Phase map at the checkpoint

- Phase 0.5: complete.
- Phase 1: active recovery and audit.
- Phase 2: repair and simplify accounts after Phase 1 sign-off.
- Phases 3–8: retain the roadmap names, order, scope, and gates.
- No Phase 1.5 was approved.

### Signed-off outcomes

- Editable source, Git history, local toolchain, dependencies, development startup, and production build were recovered.
- Product requirements, roadmap, Phase 1 audit structure, setup guidance, and coding rules were committed.
- Production and staging Supabase projects were identified and separated.
- Local `.env.local` used public staging values and remained ignored.
- The staging inventory and initial lint baseline were recorded.

### Environment boundaries

- Production Supabase: `owmlxsnzogfapotmjrqk`; treat all data and credentials as live.
- Staging Supabase: `eyphkkginlgoaxflauog`; use for schema, identity, release, privacy, and end-to-end testing.
- Local repository: `/Users/tanishagarg/Developer/ace-club-lms`; keep `.env.local` on staging.

### Git checkpoint

The branch was `agent/phase-2-recovery`, built incrementally on the original `origin/main` baseline. Recovery commits were to be preserved without reset, squash, amend, or rebase unless explicitly approved.

### Work intentionally incomplete at Phase 0.5

Production inventory, schema reconciliation, ordered migrations, lint disposition, staging authentication, privacy/release probes, and the validated estimate remained Phase 1 work.

### Non-regression rules

- Never connect local development to Production Supabase.
- Never place service-role or secret keys in `.env.local` or browser-visible variables.
- Never treat client redirects as authorization.
- Never run destructive Production probes without an approved plan.
- Preserve evidence and unrelated user changes.
- Do not redo completed audits without invalidating evidence.

### Token-efficient working agreement

Use one small handoff at a time: state the outcome, give one manual account-dependent task, receive the result, record evidence, and continue. Never paste secrets, credentials, magic links, or private student data into chat or documentation.

### Phase 0.5 sign-off

Phase 0.5 was accepted because source recovery, toolchain setup, environment separation, build baseline, evidence structure, rules, and continuation method were established. It did not approve Production changes or declare Phase 1 complete.

---

## Phase 1 handoff — Recovery and audit

Date: 31 July 2026  
Status: **Signed off with an explicit Phase 2 authentication exception**

### Outcome

Phase 1 is complete. Source, database, deployment, authorization, release, and privacy evidence are reconciled. The validated delivery range is **6–8 engineering weeks plus 1–2 weeks of pilot/stabilisation** for one full-stack engineer with explicit QA and product acceptance.

Authoritative Phase 1 records:

- [Phase 1 sign-off and audit](../phase-1/README.md)
- [Manual verification checklist](../phase-1/manual-verification-checklist.md)
- [Immutable evidence](../phase-1/evidence/)

### Current product decision

The product owner resolved the deferred login-method decision on 31 July 2026: Phase 2 will use Google Sign-In only for controlled, pre-provisioned accounts. Magic-link and password login are paused and excluded from the Phase 2 exit gate. Phase 2 will inventory surviving Google Cloud and Supabase OAuth configuration before rebuilding it.

Legacy password and Quick Access UI still exists and must not be mistaken for approved launch behaviour.

### Environment and deployment state

- Local Supabase link: staging `eyphkkginlgoaxflauog`.
- Vercel Preview: protected and connected to staging.
- Production Supabase: `owmlxsnzogfapotmjrqk`.
- Production application: [aceclub.theadmitco.com](https://aceclub.theadmitco.com).
- Vercel Preview and Production use separate Supabase URLs, anon keys, and service-role keys.
- Production `NEXT_PUBLIC_SITE_URL` is `https://aceclub.theadmitco.com`.
- No secret values are stored in the repository evidence.

### Database and migration state

- Production-derived baseline: `20260731051000_production_baseline.sql`.
- Release-boundary migration: `20260731062700_enforce_material_release.sql`.
- The baseline is applied to staging and recorded as applied in Production’s migration ledger.
- The release policy is applied to staging and Production.
- `materials` access now requires both course access and `available_from <= now()`.
- The local repository is relinked to staging after Production work.

### Security and privacy state

- `/api/admin/bulk-enroll` and `/api/admin/delete-user` require an active Admin session before service-role use.
- `/api/notion` requires an active session and an RLS-visible material whose Notion page matches the request.
- Signed-out Production probes return application `401` responses for all three routes.
- Disposable staging and Production RLS suites pass **12/12**.
- Anonymous, cross-student, enrollment, Admin visibility, deactivation, and future-material boundaries pass.
- There are no storage buckets to validate.

### Quality state

- Production build passes on Next.js 16.2.4.
- Targeted lint for Phase 1 containment changes passes.
- Full lint remains at 40 errors and 10 warnings under the approved scoped legacy deferral.
- Lint remains enabled; no new findings are allowed; touched legacy files must be improved; launch requires clean lint.

### Git and publication state

- Branch: `agent/phase-2-recovery`.
- Phase 1 sign-off commit: `5f5a862`.
- The branch is pushed to `origin`.
- The branch is not merged into `main`.
- Latest deployed Phase 1 application code: `df3581f`.

### Phase 2 starting scope

1. Inventory surviving Google OAuth, Supabase provider, consent-screen, and redirect configuration before rebuilding anything.
2. Implement the approved Google-only authentication decision and record its configuration without secrets.
3. Remove production Quick Access, hard-coded demo credentials, password behaviour not included in the decision, and “Super Admin” presentation.
4. Establish server-side route/page authorization and session refresh consistently.
5. Create controlled staging Admin and Student identities for the selected login method.
6. Verify role redirects, logout, deactivation/reactivation, unknown-email disclosure behaviour, and positive Admin operations.
7. Resolve the affected legacy lint findings as authentication files are changed.

### Phase 2 non-regression rules

- Keep local and Preview on staging.
- Do not expose or store service-role, OAuth, email, or payment secrets.
- Do not weaken the deployed Admin, Notion, RLS, or release-boundary containment.
- Do not revive Phase 1 audit work without contradictory new evidence.
- Keep Admin and Student as the only product roles unless the acceptance criteria are deliberately amended.

### Resume instruction

> Continue Ace Club LMS from `docs/handoffs/ace-club-lms-running-handoff.md`. Read `AGENTS.md`, `instruction/README.md`, the latest handoff section, the Markdown acceptance criteria, the Phase 2 roadmap section, and `docs/development/coding-rules.md`. Inspect Git status and recent commits. Preserve completed Phase 1 evidence, continue incrementally on `agent/phase-2-recovery`, optimize for tokens, and give one account-dependent task at a time.

### Phase 1 sign-off decision

Phase 1 is accepted as complete because the recovery outputs, database map, validated estimate, migration baseline, environment separation, build verification, Production deployment, privileged-route containment, and staging/Production privacy and release evidence are complete.

The approved authentication exception is Phase 2 scope and is recorded as deferred rather than passed.

---

## Phase 2 handoff — Google-only accounts

Date: 31 July 2026

Status: **Signed off**

### Completed implementation and verification

- Google Sign-In is the only portal login method; password, magic-link, Quick Access, demo credentials and Super Admin presentation are removed.
- Unknown Google identities receive an inactive Student profile and no portal access.
- Server-side Admin and Student route boundaries, session refresh, logout and reversible activation are implemented.
- Staging Preview passed Admin, Student, denial, logout, provisioning, enrolment, deactivation and reactivation journeys.
- Staging and Production use separate Supabase projects, OAuth clients, callbacks and Vercel scopes.
- Production access-control migration `20260731110000_require_provisioned_portal_access.sql` was applied successfully.
- Pull request #1 merged Phase 0.5 through Phase 2 into `main` at `edd3766`.
- Pull request #2 added permanent deployment safeguards and merged at `eaef0f3`.
- The guarded Production deployment passed, both `/` and `/login` returned HTTP 200, and the approved Production Admin Google journey, refresh and logout passed.

### Production deployment incident

The first Phase 2 Production build completed in Vercel but `/login` returned HTTP 500. A rollback redeployment then showed the safe Supabase configuration screen. The root cause was incomplete Vercel Production variables: Production had `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, but `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SITE_URL` were not present in the Production scope. Vercel's `Ready` state proved only that the build completed; it did not prove runtime health.

The two missing Production variables were added, malformed URL values were corrected, and the new build guard rejected the invalid attempt before deployment. The subsequent guarded deployment passed and restored healthy Production service. The Production SQL migration remained compatible throughout and required no rollback.

### Permanent deployment safeguards

- `npm run build` now runs `scripts/validate-deployment-env.mjs` first.
- Vercel Preview builds fail unless all four required variables are present and the Supabase URL targets staging.
- Vercel Production builds fail unless all four required variables are present, the Supabase URL targets Production, and the site URL is `https://aceclub.theadmitco.com`.
- The request proxy no longer converts missing public Supabase variables into an opaque site-wide HTTP 500; the login page can show its explicit configuration error.
- The build check never prints secret values.

### Mandatory release preflight

Before every Production merge or promotion:

1. In Vercel Environment Variables, filter to **Production** and verify exactly one Production-scoped entry exists for each required name:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL`
2. Confirm the Production Supabase URL uses project `owmlxsnzogfapotmjrqk` and the site URL is `https://aceclub.theadmitco.com`.
3. Filter to **Preview** and confirm the same four names exist only with staging values, using project `eyphkkginlgoaxflauog`.
4. Never delete a shared variable until both replacement scopes have been verified independently.
5. Save all environment changes before triggering one fresh deployment. Do not redeploy after each variable.
6. Require a successful Vercel check plus live HTTP probes of `/` and `/login`; never accept `Ready` alone.
7. Manually verify Google Sign-In uses the expected Supabase project, role routing works, logout blocks protected pages, and deprecated login controls are absent.
8. Record only names, scopes, project references and pass/fail results. Never store or paste key values.

Environment variables are persistent deployment configuration. Once the four correct Production and Preview entries exist, routine releases must reuse them and must not ask the Product Owner to re-enter keys.

### Phase 2 sign-off decision

Phase 2 is accepted as complete because controlled Google-only authentication, provisioning, role enforcement, inactive access, logout, environment separation, staging validation, Production migration, Production deployment and Production Admin smoke testing all pass. Password, magic-link, Super Admin and public Quick Access paths are absent.

### Phase 3 continuation point

Phase 3 is **Align the master course**. Start from updated `origin/main` on a new feature branch. Read the Phase 3 roadmap and acceptance criteria, inventory the current course and material rows in staging, and obtain the approved revised fixed curriculum before changing data. The Phase 3 exit gate is one complete master course with approved titles, class types, DI–Ishan, VA–Tanya and QA–Unnati mappings, Notion pre-reads, PDF worksheets and worksheet question rows, with placeholders and duplicates removed.

Do not reopen Phase 2 authentication or environment work unless a new failing probe contradicts this signed evidence. Continue to use the mandatory release preflight above for every deployment.

---

## Phase 3 handoff — Align the master course

Date: 31 July 2026
Status: **Staging implementation verified; content population and Production release pending**

### Completed implementation and verification

- The approved revised curriculum is represented as 31 stable master timeline items.
- DI maps to Ishan, VA to Tanya, and QA to Unnati; orientation, mocks, calls, breaks, and support events have no inherited teaching instructor.
- Admins can attach multiple Notion pre-reads and multiple private PDF worksheets to a master item, with a manual positive question count per worksheet.
- Worksheet question rows are generated from the entered count, and private files are delivered through an authenticated route using 60-second signed URLs.
- The three Phase 3 migrations applied successfully to staging.
- Admin Preview, the DI 1 master-content vertical slice, new-cohort inheritance, Student pre-read visibility, Student worksheet delivery, release locking, and signed-URL expiry passed.
- DI 1 evidence recorded one pre-read, one worksheet, question count 20, one private PDF, and 20 generated question rows.
- Targeted lint, TypeScript, and the production build pass.

### Confirmed Phase 4 boundary

Existing cohorts do not automatically receive master materials added after cohort creation. The staging `Aug test` batch continued showing its original pre-read after another was added to the master item. New cohort generation copies available master materials, but retroactive propagation is not implemented.

The current batch generator also remains the legacy 16-session implementation and produces incorrect inferred metadata for some items. Phase 4 must generate cohorts from the full 31-item master timeline and decide whether existing cohorts receive later master-content additions automatically or through an explicit Admin action.

### Release state and continuation

- Branch: `codex/phase-3-master-course`.
- Implementation commits: `4951494`, `e4d6268`, and `599804e`.
- The branch is pushed and its Vercel Preview is connected to staging.
- No Phase 3 migration has been applied to Production and the branch has not been merged into `main`.
- Remaining master materials may be populated later through the verified Admin workflow, but final content approval is still required by the documented Phase 3 exit gate.

Do not merge Phase 3 into `main` or apply Production migrations until the Production release order is reviewed. Continue with one account-dependent task at a time and never paste credentials, OAuth codes, signed file URLs, or private student data into chat or documentation.
