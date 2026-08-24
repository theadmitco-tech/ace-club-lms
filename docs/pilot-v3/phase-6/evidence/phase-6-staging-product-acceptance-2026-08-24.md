# Pilot V3 Phase 6 — Staging product acceptance evidence

Status: **Accepted by Product Owner; Phase 6 closed**
Environment: Local and exact Staging-backed Vercel Preview only  
Date: 24 August 2026

## Authorization and boundary

The Product Owner requested Phase 6 on 24 August 2026. Phase 6 is a product-acceptance gate, not a new feature or release phase. This work created documentation only, reran local release gates and performed read-only checks on the already accepted Preview state. No database migration, fixture creation/reset, package import, assignment change, note mutation, Production query, Production deployment or merge was performed.

## Fixed candidate

| Item | Exact value |
|---|---|
| Application revision | `500d1af` |
| Vercel deployment | `dpl_AMysKwGhYz3hmARNFhwB8r6CNzvJ` |
| Immutable Preview | `https://ace-club-7wew1lz2z-theadmitco-techs-projects.vercel.app` |
| Data environment | Staging `eyphkkginlgoaxflauog` |
| Function region | `sin1` |

Phase 5's later documentation commit `2adc148` and the Phase 6 acceptance records do not alter the application deployed from `500d1af`.

## Fresh local verification

| Gate | Result |
|---|---|
| `npm run test:pilot-v3` | Pass — 32/32 |
| `npm run test:pilot-v2` | Pass — 46/46 |
| `npx tsc --noEmit --incremental false` | Pass |
| `npm run build` | Pass — Next.js 16.2.4, 52 routes |

The inherited Node module-type warnings in the Pilot V2 suite remain unchanged and did not fail any test.

## Exact Preview authenticated read-only check

The exact Preview loaded with no browser console warning/error. The existing Staging Student session reached `/dashboard` and `/mocks` successfully. A separately authenticated active Admin session reached the exact deployment using the approved `theaceclub.tac@gmail.com` account. An initial attempt with `theadmitco@gmail.com` correctly failed closed at the inactive-access boundary.

The Mock library displayed all required assignment states through existing records:

- completed: **Midway Mock Version 1.2** with **View results**;
- not started: **Phase 3 Student Rendering Acceptance — 2026-08-23** with **Choose section order**; and
- in progress: **Week 4** with **Resume mock**.

The completed result rendered:

- `8/64` correct and `13%` accuracy;
- `3m 39s` total time and `0m 3s` average time per question;
- `46` incorrect and `10` unanswered;
- semantic Overall, DI, QA and VA tabs; and
- reconciled section rows for 20 DI, 23 Verbal and 21 Quant questions.

At a 1280 px viewport, the result document reported `1274` px for both client width and scroll width, so there was no document-level horizontal overflow. No record was created or changed during this check.

### Student detail

- DI, QA and VA rendered semantic pacing charts plus exactly 20, 21 and 23 question rows/links.
- DI Question 1 rendered the immutable prompt and disabled response controls, the selected answer, the correct answer, time spent and the existing editable Student note.
- The onscreen Back control returned to the DI table at the previous scroll position and restored focus to the originating Question 1 link.
- DI Question 11 rendered the protected historical GI image at its natural 1429 × 339 size with descriptive alternative text, plus disabled slot-labelled dropdowns, `Unanswered` and the protected correct answer.
- The existing in-progress **Week 4** attempt reached the pre-section gate without starting the timer. It showed 45-minute instructions, Next → Yes confirmation, mandatory answering, Question Review & Edit and the three-distinct-answer edit cap. The attempt was left unchanged.

### Admin Question Bank and Builder

- Question Bank rendered 153 latest revisions, all five accepted filters, question previews, protected answer reveal, lifecycle controls and the XLSX/ZIP package input/validation surface.
- Revealing the first published DS answer returned the protected correct answer only after the Admin action; no answer was present in the inventory response.
- The existing **Midway Mock Version 1.2** builder composition contained 64 checked questions. Review reconciled `21 / 21` Quant, `23 / 23` Verbal and `20 / 20` Data Insights and rendered the exact selected question text in section order.
- Save/publish controls and active-batch, release-at and optional due-at assignment fields rendered. No control that would create, edit, publish, retire, import, assign or release retained Staging data was submitted.

### Admin reporting and attempt detail

- Reporting showed one Completed, one Not Started and one In Progress assignment state for the existing Staging Student.
- The completed Admin detail reconciled exactly with the Student at `8/64`, `13%`, `3m 39s`, `46` incorrect and `10` unanswered.
- Admin DI rendered its pacing chart and 20 question links. Question 1 showed the selected answer, correct answer and existing Student note with zero textareas and zero note-save controls.
- Admin DI Question 11 rendered the same protected 1429 × 339 GI image and descriptive alternative text.

### Fresh responsive and accessibility sample

At an explicit 720 × 900 viewport:

| Surface | Document width | Result |
|---|---:|---|
| Student result and DI chart/table | `714 / 714` client/scroll | No document overflow; 20 DI links retained |
| Student protected GI question | `714 / 714` | Image scaled to 598 px; labelled disabled dropdowns retained |
| Admin protected GI question | `714 / 714` | Image scaled to 598 px; no missing image alternative |
| Admin Question Bank | `714 / 714` | No document overflow |

These sampled surfaces had zero unnamed buttons, zero missing `alt` attributes and no browser console warning/error. Temporary viewport overrides were reset after verification.

## Inherited complete-journey evidence

The current candidate is a descendant of every accepted implementation below:

1. Phase 1 verified Question Bank creation/lifecycle, valid and invalid bulk packages, idempotent imports, protected answers/media and cleanup.
2. Phase 2 verified a 64-question 21/23/20 mock build, Review, publish, batch assignment and release gating.
3. Phase 3 verified all supported question formats, the complete server-timed Student player, answer confirmation, review/edit cap, break, timeout and completion boundaries.
4. Phase 4 verified Student results, per-question review, timing, notes and matching Admin reporting/detail.
5. Phase 5 reran the integrated journey's authorization, history, accessibility, responsive, rollback and existing-LMS boundaries, including the bounded 15/15 live Staging probe with exact cleanup.

The detailed evidence is linked from the [Phase 6 status](../README.md). Phase 6 does not repeat destructive fixture work after Phase 5 proved exact cleanup; the Product Owner may request a designated-attempt reset and fresh visual walkthrough from the checklist if desired.

## Product Owner decision

Engineering found no release blocker in the fixed candidate. On 24 August 2026, Product Owner Tanisha Garg explicitly instructed: **“Accept phase 6.”** Phase 6 is therefore closed for exact source `500d1af` and exact deployment `dpl_AMysKwGhYz3hmARNFhwB8r6CNzvJ`.

This acceptance does not authorize Phase 7 or any Production inventory, query, merge, migration, deployment, environment change, smoke check or other Production operation.
