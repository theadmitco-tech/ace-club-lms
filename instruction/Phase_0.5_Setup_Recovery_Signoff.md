# Phase 0.5 Sign-off — Setup, Recovery, and Working Agreement

Date: 31 July 2026
Project: Ace Club LMS
Repository: `/Users/tanishagarg/Developer/ace-club-lms`
Status: **Signed off**

## 1. Purpose

Phase 0.5 established a safe, recoverable working environment before product implementation. It recovered and documented the source, separated staging from production, validated local execution, and defined how the product owner and coding agent will continue without redoing completed work.

This document is the continuity checkpoint for future sessions. Read it before making changes, together with `AGENTS.md`, the product roadmap, the MVP acceptance criteria, and `docs/development/coding-rules.md`.

## 2. Required reading before work

Read in this order:

1. `AGENTS.md` for repository and Next.js operating constraints.
2. `instruction/README.md` for the authority register and reading path.
3. This Phase 0.5 sign-off for the current checkpoint and non-regression rules.
4. `instruction/Ace_Club_LMS_MVP_Acceptance_Criteria.md` for binding product behaviour.
5. `instruction/Ace_Club_LMS_Product_Roadmap.md` for phase boundaries, order, and exit gates.
6. `docs/README.md` for the repository documentation map.
7. `docs/development/coding-rules.md` for implementation and verification rules.
8. `docs/phase-1/README.md` and `docs/phase-1/manual-verification-checklist.md` for current audit status.
9. Only then inspect the code and database files relevant to the immediate task.

Do not begin by rereading the entire repository. Load the documents above, inspect Git status and recent commits, then inspect only the files needed for the current acceptance criterion.

## 3. Working-memory bootstrap

Before planning or editing, the coding agent must be able to state:

- **Product:** Ace Club LMS for the first live GMAT cohort.
- **Production roles:** Admin and Student only.
- **Access:** email magic links; production passwords, Quick Access, and Super Admin behaviour are excluded.
- **Course model:** fixed revised curriculum; Admin creates cohorts and assigns students but does not redesign the curriculum.
- **Instructor mapping:** DI–Ishan, VA–Tanya, QA–Unnati.
- **Content journey:** Week 0 available immediately; later Notion pre-reads seven days before class; PDF worksheets after class.
- **Tracker:** per-student, per-worksheet, per-question manual status with `Done`, `Come back for review`, optional time/comment, and system-owned `Not updated`.
- **Admin progress:** manual completion and authorised question-level visibility, without advanced MVP-excluded analytics.
- **Security:** RLS, server-side privileged-route authorization, direct-URL release protection, private student data, and no browser-visible elevated keys.
- **Environment:** local and Preview use staging; production remains isolated.
- **Current state:** staging exists but has no LMS schema; production inventory and schema reconciliation are still pending.
- **Quality state:** production build passes; lint baseline is 47 errors and 10 warnings.
- **Git state:** preserve the checkpoint commits and continue incrementally on the current branch.

If any item cannot be confirmed from the required reading or current evidence, pause and inspect the relevant source rather than guessing.

## 4. Phase map and naming

- **Phase 0.5 — Setup and recovery:** complete and signed off by this document.
- **Phase 1 — Recover and audit:** active; static audit/local recovery are complete, but live production inventory, schema reconciliation, lint disposition, authentication validation, and privacy/release checks remain.
- **Phase 2 — Repair and simplify accounts:** begins only after the Phase 1 exit gate is signed off.
- **Phases 3–8:** retain the names, order, scope, and exit gates in the product roadmap.

There is currently **no approved Phase 1.5**. Do not invent one automatically. Work needed to close the audit—production inventory, schema reconciliation, migration baseline, and lint classification—remains **Phase 1 closeout**. If later evidence reveals a substantial stabilisation project that does not fit Phase 1 or Phase 2, propose Phase 1.5 with a written objective, scope, duration, dependencies, and exit gate for product-owner approval before using that label.

## 5. Signed-off outcomes

- Editable source and Git history are available.
- The local repository is connected to `theadmitco-tech/ace-club-lms`.
- Product roadmap and MVP acceptance criteria are committed under `instruction/`.
- A Phase 1 audit, checklist, and read-only Supabase inventory query exist under `docs/phase-1/`.
- Node.js and npm are installed on the Mac.
- Project dependencies install successfully with `npm ci`.
- The local Next.js development server starts successfully.
- The optimized production build passes, including TypeScript and all application routes.
- Lint has a recorded baseline of 47 errors and 10 warnings; it is not silently treated as passing.
- Production and staging Supabase projects are identified and separated.
- Local `.env.local` uses public staging values and is ignored by Git.
- No service-role key has been added to local development.
- Staging Supabase inventory is captured and committed.
- Mac setup and living coding rules are committed.

## 6. Environment boundaries

### Production

- Supabase project reference: `owmlxsnzogfapotmjrqk`
- Treat all data and credentials as live.
- Do not run schema scripts, destructive probes, test-user creation, or service-role experiments without an explicit production change plan and approval.

### Staging

- Supabase project name: `ace-club-lms-staging`
- Supabase project reference: `eyphkkginlgoaxflauog`
- Region: Singapore
- Current state: healthy, with no public LMS schema, policies, functions, triggers, cron jobs, or storage buckets.
- Use staging for schema reconciliation, identities, authentication, release, privacy, and end-to-end tests.

### Local

- Project path: `/Users/tanishagarg/Developer/ace-club-lms`
- Local URL: `http://localhost:3000`
- Start with `npm run dev -- --hostname 127.0.0.1`.
- Stop with `Control+C`.
- `.env.local` points to staging and must never be committed.

## 7. Git checkpoint

The working branch is:

`agent/phase-2-recovery`

Checkpoint commits:

1. `5249316` — Add LMS roadmap and Phase 1 audit
2. `8b6f45a` — Document local setup and coding rules
3. `461304a` — Record Phase 1 staging inventory
4. `1655784` — Add Phase 0.5 recovery sign-off

These commits build on `1e7d77d`, the current `origin/main` baseline at the time of sign-off.

Do not reset, squash, amend, rebase, delete, or overwrite these checkpoints merely to restart work. Continue incrementally. If history cleanup is later desired, do it only as an explicit review decision before publishing.

## 8. Work that is intentionally not complete

Phase 0.5 is complete. Phase 1 is not fully signed off.

Remaining Phase 1 gates:

- Capture and reconcile the production Supabase inventory.
- Reconcile repository SQL with the live production structure.
- Establish ordered migrations before loading the staging schema.
- Resolve the lint baseline or explicitly approve scoped deferrals.
- Configure staging authentication URLs and email delivery.
- Create controlled Test Admin and Test Student identities.
- Run magic-link, role, logout, deactivation, direct-URL, release, storage, and cross-student privacy checks.
- Convert the provisional delivery estimate into a validated estimate.

Do not install the overlapping root `schema.sql` and `supabase_*.sql` scripts in staging until reconciliation determines the authoritative order and desired MVP schema.

## 9. Non-regression rules

- Do not connect local development to production Supabase.
- Do not place production service-role or secret keys in `.env.local`.
- Do not expose elevated keys through `NEXT_PUBLIC_*` variables.
- Do not run `npm audit fix --force`.
- Do not run destructive production tests.
- Do not treat client-side redirects as authorization.
- Do not restore password login, Quick Access, Super Admin behaviour, or excluded analytics as MVP requirements.
- Do not edit or discard unrelated user changes.
- Do not repeat a completed audit unless new evidence invalidates it.
- Preserve committed evidence; add new dated evidence rather than overwriting history.

## 10. Token-efficient working agreement

### Coding agent responsibilities

- Read this sign-off and current Git status before acting.
- Reuse existing audit evidence and documentation instead of rediscovering it.
- Lead with the outcome and keep explanations concise.
- Inspect only files relevant to the current decision.
- Batch related read-only checks and documentation updates.
- Make the smallest coherent change.
- Verify changes in proportion to risk.
- Use focused commits with clear messages.
- State what is committed, uncommitted, pushed, or not pushed.
- Give the product owner manual tasks when they require account access, visual judgment, secrets, or long terminal output.
- Ask for only the next necessary result, not an entire workflow at once.

### Product owner responsibilities

- Perform Supabase, Vercel, email, browser, and account steps that require signed-in access.
- Run long local commands when requested and return only the final status or attach the output file.
- Never paste secret keys, passwords, magic-link URLs, payment secrets, or private student data into chat.
- Attach large inventories and logs as files instead of pasting them when practical.
- Confirm product decisions that change scope or production behaviour.

### Efficient turn format

Use one small handoff at a time:

1. Agent states the current outcome.
2. Agent gives one manual task, if required.
3. Product owner returns the result.
4. Agent records the evidence and continues from the checkpoint.

Avoid repeating project history in every turn. Link to this sign-off or the relevant running document instead.

## 11. How to resume in a future session

Use this instruction:

> Continue the Ace Club LMS from `instruction/Phase_0.5_Setup_Recovery_Signoff.md`. Read `AGENTS.md`, the sign-off, `docs/development/coding-rules.md`, and the current Phase 1 status. Inspect Git status and recent commits. Preserve all completed work, continue incrementally, optimize for tokens, and give me one manual task at a time when account access or long-running terminal work is needed.

The next expected action after this sign-off is the read-only production Supabase inventory. No staging schema installation should occur before that inventory is reconciled with the repository SQL.

## 12. Sign-off decision

Phase 0.5 is accepted as complete because the source, local toolchain, environment separation, build baseline, audit framework, evidence trail, coding rules, and continuation method are established.

This sign-off does not approve production changes and does not declare Phase 1 complete.
