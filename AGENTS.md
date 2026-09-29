<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Ace Club LMS continuation rules

These rules apply to every future engineering chat or agent working in this repository.

## Required bootstrap

Before planning, editing code, changing data, or deploying:

1. Read `docs/PROJECT_MANUAL.md` for stable product, architecture, role, environment, and operating context.
2. Read `docs/CURRENT_STATE.md` for the exact live deployment, migration ledgers, known issues, approvals, rollback target, and next action.
3. Read only the relevant release record, ADR, or feature guide linked from Current State. Historical handoffs are evidence, not the active starting point.
4. For implementation, migration, access-control, release, rollback, or documentation work, follow `docs/governance/engineering-handbook.md`.

If these documents disagree with chat history, verify the repository, Vercel, Supabase, and Git state before acting. Correct the durable documentation in a focused commit; do not silently choose the most convenient account.

## Documentation continuity

- `docs/CURRENT_STATE.md` is the single active engineering handoff. Do not create a new growing handoff for each phase, pilot, feature, or chat.
- Update Current State whenever a release, rollback, material incident, role grant/revocation, migration, deployment identity, known issue, approval state, or next action changes.
- Keep stable explanations in `docs/PROJECT_MANUAL.md`, reusable rules in the Engineering Handbook, significant accepted decisions in `docs/decisions/`, and immutable dated evidence in `docs/releases/` or the relevant evidence directory.
- Add every new durable documentation artifact to `docs/governance/document-inventory.csv`.
- Never put passwords, tokens, private keys, raw authentication data, or unnecessary personal identifiers in documentation, commits, logs, or handoffs.
- Ship documentation with the change whenever possible. A change is not complete until another engineer can identify what changed, how it was verified, and how to roll it back.

## Release and handoff gates

- Do not treat a plan, handoff, or earlier approval as authorization for a new Production change.
- Test database and application changes on Staging first with disposable fixtures and documented cleanup.
- Before Production, record the exact source commit, migrations, acceptance evidence, current rollback deployment, and database rollback or disable path.
- After Production, run scoped smoke checks, inspect runtime/security signals, update Current State and the release record, and preserve the rollback target.
- Do not overlap Production releases that share application, schema, or authorization surfaces.

## Required documentation checks

Before committing documentation or closing a handoff, run:

```bash
npm run test:docs
git diff --check
```

At the end of a task, report the branch and commit, tests run, environment changes, remaining risks, rollback path, and exact next action.
