# Ace Club LMS — Living Coding Rules

Update this document when an architectural or workflow decision changes. It supplements `AGENTS.md`; it does not override the product roadmap or MVP acceptance criteria.

## Sources of truth

Use this priority:

1. `instruction/Ace_Club_LMS_MVP_Acceptance_Criteria.md`
2. `instruction/Ace_Club_LMS_Product_Roadmap.md`
3. `docs/handoffs/ace-club-lms-running-handoff.md`
4. `AGENTS.md`
5. This document
6. Existing implementation

When code conflicts with the acceptance criteria, the acceptance criteria win.

## Product boundaries

- Production roles are `Admin` and `Student` only.
- Test Admin and Test Student are staging identities, not product roles.
- Production uses Google Sign-In with controlled, pre-provisioned accounts.
- Password login, magic-link login, Quick Access, and Super Admin behaviour are excluded.
- The curriculum is fixed for the MVP.
- The worksheet tracker is manual: `Done`, `Come back for review`, optional time, optional comment, and system-owned `Not updated`.
- Do not reintroduce excluded advanced analytics, automated grading, curriculum editing, or legacy migration without a documented scope change.

## Environment and secrets

- Local and Preview use the staging Supabase project.
- Production uses the production Supabase project.
- Commit variable names only in `.env.example`.
- Never commit `.env.local`, credentials, passwords, magic links, payment secrets, or private student data.
- `NEXT_PUBLIC_*` values are browser-visible.
- Supabase secret/service-role credentials are server-only and bypass RLS.
- Never create shared fallback passwords.

## Authentication and authorization

- Client-side redirects are user experience, not authorization.
- Every privileged route must authenticate the caller and verify the Admin role before creating a service-role client or changing data.
- Enforce enrollment, role, tracker ownership, and material-release rules in server/database boundaries.
- Protect unreleased content from both interface navigation and direct URLs.
- Students may read and write only their own tracker data.
- Deactivation must block future access without deleting historical programme data.

## Database changes

- Treat the deployed database export as authoritative until repository SQL is reconciled.
- Replace manual, overlapping schema scripts with ordered, idempotent migrations.
- Every new student-level table requires RLS before application use.
- Include both `USING` and `WITH CHECK` conditions where writes require ownership.
- Document functions, triggers, storage policies, scheduled jobs, and time-zone assumptions.
- Do not apply unreviewed schema scripts to production.

## Next.js and TypeScript

- This repository uses Next.js 16. Read the relevant bundled guide under `node_modules/next/dist/docs/` before changing framework APIs or conventions.
- Prefer Server Components by default; use Client Components only for browser state, effects, or interaction.
- Keep service-role clients and privileged logic in server-only modules.
- Validate API input and return deliberate status codes and actionable errors.
- Use shared domain types instead of spreading new `any` values.
- Keep release-time calculations in one authoritative module and test exact boundaries.

## UI and accessibility

- Preserve the existing design system unless a feature explicitly requires redesign.
- Every loading state must resolve to success or an actionable error.
- Tracker saves must show saving, saved, and retry states.
- Support keyboard navigation and current mobile/desktop browsers.
- Locked, upcoming, released, empty, and failed states must be visually distinct.

## Testing requirements

At minimum, changes must pass:

```bash
npm run lint
npm run build
```

Add focused automated coverage for:

- Magic-link callbacks and role redirects
- Signed-out and cross-role API access
- Cross-student RLS isolation
- Exact pre-read and worksheet release boundaries
- Direct-URL protection
- Tracker autosave, replacement status, retry, and persistence
- Admin totals matching student records

Never use real production students or destructive production actions for tests.

## Change workflow

1. Link the change to an acceptance criterion or documented defect.
2. Work against staging.
3. Make the smallest coherent change.
4. Add or update tests and documentation.
5. Run lint and build.
6. Exercise the affected journey using staging identities.
7. Review the Git diff for secrets and unrelated files.
8. Commit with a focused message.

## Definition of done

A change is done only when:

- Its acceptance criteria pass in staging.
- Authorization and privacy boundaries are tested.
- Lint and production build pass.
- Mobile/desktop and failure states are checked when relevant.
- No secret or staging credential enters Git.
- Documentation reflects any changed setup, schema, or operational decision.
