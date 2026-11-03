# Phase 6 — integrated staging acceptance

Status: **in progress; full acceptance blocked by Phase 3 payment integration and Product Owner sign-off**. Provider selection and test access remain pending as confirmed on 2026-11-03. Fixture-granted access does not establish successful payment fulfillment or the atomic eight-place limit.

The branch is `intern/v2-phase-6-review`, based on Phase 5 candidate `879be1fcf2b32f6a4ef42ae431ca3ac6521fa06d`. PR #26 remains Draft and unmerged against `intern/v2-phase-4-review`. The reviewed baseline Preview is https://ace-club-k3rulap2r-theadmitco-techs-projects.vercel.app and uses staging project `eyphkkginlgoaxflauog`. The repair candidate requires separate deployed verification. Production remains excluded.

## Completed independent work

- The acceptance matrix maps all 12 integrated journeys and every Phase 6 exit gate. Inherited reports retain their original commit, date and limitations.
- A disposable PostgreSQL journey covers Full Course, Quant, Verbal and DI, recording-only access, shared independent readings, cross-offering denial, subject feedback gates, foreign-response denial, restored access and revocation.
- Review identified 18 older V2 functions raising deterministic conflicts as SQLSTATE `40001`. The additive migration changes only these explicit conflict codes to `PT409`. Genuine engine serialization failures remain unchanged. Six server adapters retain specific reload/review guidance for both codes.
- The complete SQL Editor packet passed source-drift rejection, repeat rejection, exact function-body verification, row preservation, original-ledger preservation and security metadata checks. The operator-supplied staging receipt confirms the repair across 88 application tables. No Phase 3 migration was activated.
- Local integration records contain 56 passing assertions; repair rehearsal records contain nine checks; nine adapter tests cover both conflict codes, single-call behavior, sanitized messages and Student denial. Prior-phase suites, lint, TypeScript and webpack build passed locally.

Supabase documents why custom `40001` errors can trigger transaction retries: [official troubleshooting discussion](https://github.com/orgs/supabase/discussions/50151). The earlier Phase 5 hosted timeout and repair supplied the project-specific precedent. Older paths were inspected locally before repair; no pre-repair infinite retry was deliberately triggered on staging.

## Remaining acceptance

1. Hosted verification of the applied conflict repair and the exact Phase 6 Preview.
2. Provider selection, authorized test credentials and completion of Phase 3 on an integrated candidate.
3. Provider-backed Full Course/Quant/Verbal/DI purchase, retry/webhook, upgrade and eight-place concurrency checks, followed by affected integrated regressions.
4. Explicit Product Owner acceptance or rejection of that exact candidate. No acceptance is inferred from a successful walkthrough, PR creation or CI.

The temporary LMS feedback form remains the approved Phase 4 substitute. Tally replacement, provider-controlled external sharing, Production launch and PR readiness remain separately controlled.

## Reproduction and evidence

`npm run test:v2:phase6` uses disposable Unix-socket PostgreSQL and synthetic Auth/Storage catalogues. It accepts no hosted database connection. `node scripts/phase6/index-evidence.mjs` refreshes the inherited report index.

- [Acceptance matrix](ACCEPTANCE-MATRIX.md)
- [Inherited report index](evidence-index.json)
- [Local integrated results](local-integrated-results.json)
- [Repair rehearsal](local-conflict-repair-results.json)
- [Applied repair receipt](repair-receipt.json)
- [Exact routine inventory](conflict-routines.json)
- [Baseline remote verification](baseline-remote-verification.json)

The applied repair packet must not be rerun. Existing source migrations remain unchanged. Future deployment or database changes invalidate affected evidence and require a new exact-candidate check.
