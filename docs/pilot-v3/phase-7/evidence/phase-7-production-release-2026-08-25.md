# Phase 7 Production release evidence — 25 August 2026

## Authorized boundary

The Product Owner authorized the additive Mock schema in Production, import and publication of the three supplied question packages, creation of the DOCX-ordered 64-question mock, assignment-scoped access for three named testers, Production deployment and verification. Existing Student behavior and data outside the Mock feature had to remain unchanged.

## Question reconciliation

- Quant: 21 questions.
- Verbal: 23 questions.
- Data Insights: 20 questions.
- The DOCX was the ordering authority. Text reconciliation resolved every textual item. A full DOCX render resolved the image-only Data Insights positions: lettuce at 3, tires at 6, energy at 10, SST at 11, then Halloween, Lake Molono, streaming-app poll, double cropping, share price and rainfall at 14–19.
- Persisted order verification matched the expected section digests:
  - Quant: `b44a8cb4fde5e13c0a58e2641bb40915`
  - Verbal: `4b9e40860a705e3b8892e31cfcdb3fc2`
  - Data Insights: `f0e6771f3699612deaa2d126ff426176`

## Production data result

- All 64 imported question revisions are Published.
- `The Ace Club Mock 1` is Published as immutable version 1 with a 64-item snapshot.
- The assignment targets `Aug 7th Batch` and has `release_at = 2099-01-01T00:00:00Z`; ordinary batch visibility is therefore closed.
- Exactly three active tester grants exist.
- Eligibility evaluation returned exactly those three accounts and zero unexpected accounts.
- No attempt exists at release completion; no attempt was started on a tester's behalf.

## Isolation proof

The post-release Production aggregates matched the captured pre-change baseline exactly:

| Protected legacy relation | Before | After |
| --- | ---: | ---: |
| Profiles | 19 | 19 |
| Active Students | 15 | 15 |
| Enrollments | 16 | 16 |
| Courses | 2 | 2 |
| Sessions | 36 | 36 |
| Materials | 70 | 70 |
| Student question logs | 4,928 | 4,928 |

The change added only Mock feature schema/data and assignment-scoped tester grants. Other students are not eligible before the database-owned release timestamp.

## Engineering and deployment verification

- Pilot V3 tests: 36/36 passed.
- TypeScript: passed.
- Focused ESLint: passed.
- `git diff --check`: passed.
- Vercel environment separation validation: passed.
- Production build: compiled, typechecked and generated all 52 routes.
- Deployment `dpl_Epbia368p7Ff4eQkiETuo2TUFXQL`: `READY`, aliased to `https://aceclub.theadmitco.com`.
- Anonymous HTTP: `/` and `/login` returned 200; `/admin/mock-builder` and `/mocks` returned 307 to `/login`.

## Release hold

The mock must remain at the 2099 release timestamp until the Product Owner supplies the intended batch release time. Tester grants can be revoked independently without changing the batch assignment.

## GI rendering correction — 27 August 2026

Tester feedback identified slow protected graphic loading and visibly truncated duplicate captions on Data Insights Questions 6 and 10. A read-only Production inspection established that:

- both question stems were complete;
- the optional imported stimulus captions themselves ended at `…over th` and `…applianc`;
- the protected PNGs were only 30–47 KB and stored with their correct wide dimensions; and
- historical attempt snapshots omitted width/height metadata, causing a tall fallback placeholder before load.

Application-only correction `6e8b882` now hydrates authorized active-section media with exact dimensions and one-hour, object-scoped signed URLs from the existing private bucket. The protected attempt-media route remains the fallback. GI views suppress the redundant broken caption and continue to display the complete question stem immediately below the graphic. Images are requested eagerly at high priority. No question, answer, attempt, response, timer, assignment, tester grant or legacy Student record was updated.

Verification passed all 36 V3 tests, TypeScript, focused ESLint, `git diff --check`, and the full 52-route Production build. Deployment `dpl_6VmjxeRAvK5YQ2QmwkfEiCiGPBvA` is `READY` and aliased to `https://aceclub.theadmitco.com`. Post-deploy isolation still showed exactly three eligible testers, zero unexpected eligible profiles, the same 21/23/20 order digests, and unchanged legacy counts of 19 profiles, 15 active Students, 16 enrollments, 2 courses, 36 sessions, 70 materials and 4,928 Student question logs. The two observed attempts belong to the authorized tester cohort.
