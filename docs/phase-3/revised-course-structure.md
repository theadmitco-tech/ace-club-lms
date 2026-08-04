# Ace Club Revised Course Structure

Status: Active
Owner: Product owner
Last updated: 4 August 2026

## Approved source

The Product Owner revised the fixed course structure on 4 August 2026. Approved detailed academic titles remain unchanged; Orientation is retired and the academic class days are Friday VA, Saturday QA, and Sunday DI.

| Week | Friday | Saturday | Sunday |
| --- | --- | --- | --- |
| 0 | Mock 1 (Diagnostic) | Individual calls to analyse | Individual calls to analyse |
| 1 | Verbal 1 | Quant 1 | DI 1 |
| 2 | Verbal 2 | Quant 2 | DI 2 |
| 3 | Verbal 3 | Quant 3 | — |
| 4 | Break | Mock 2 | Group call: How to analyse mocks + individual calls over the week |
| 5 | Verbal 4 | Quant 4 | DI 3 |
| 6 | Verbal 5 | Quant 5 | DI 4 |
| 7 | Verbal 6 | Quant 6 | DI 5 |
| 8 | Break | Mock 3 | Individual calls over the week |
| 10, 12, 14, 16 |  | Mock sessions |  |

## Normalization rules

- `Verbal` uses class type `VA` and instructor Tanya.
- `Quant` uses class type `QA` and instructor Unnati.
- `DI` uses class type `DI` and instructor Ishan.
- Mocks, support calls, and breaks use distinct event types with no inferred instructor.
- Each non-empty week/day cell gets a stable key in the form `wNN-weekday-slug`.
- Repeated mock sessions expand to separate Week 10, 12, 14, and 16 rows.
- The Product Owner approved detailed QA/VA/DI academic labels on 1 August 2026. Stable curriculum keys, sequence, week, day, type and instructor remain unchanged.

## Normalized sequence

| Order | Stable key | Week | Day | Title | Type | Instructor |
| ---: | --- | ---: | --- | --- | --- | --- |
| 1 | `w00-fri-mock-1-diagnostic` | 0 | Friday | Mock 1 (Diagnostic) | MOCK | — |
| 2 | `w00-sat-individual-calls` | 0 | Saturday | Individual calls to analyse | SUPPORT | — |
| 3 | `w00-sun-individual-calls` | 0 | Sunday | Individual calls to analyse | SUPPORT | — |
| 4 | `w01-fri-verbal-1` | 1 | Friday | VA 1: RC Intro + CR Inferences | VA | Tanya |
| 5 | `w01-sat-quant-1` | 1 | Saturday | QA 1: Fractions + Percentages + Ratios & Mixtures + SI/CI | QA | Unnati |
| 6 | `w01-sun-di-1` | 1 | Sunday | DI 1: DS + GI | DI | Ishan |
| 7 | `w02-fri-verbal-2` | 2 | Friday | VA 2: RC Mind-Mapping + CR Finding the Assumptions | VA | Tanya |
| 8 | `w02-sat-quant-2` | 2 | Saturday | QA 2: Pipes & Cisterns + Work & Time + Speed, Time, Distance | QA | Unnati |
| 9 | `w02-sun-di-2` | 2 | Sunday | DI 2: DS + TA | DI | Ishan |
| 10 | `w03-fri-verbal-3` | 3 | Friday | VA 3: RC Primary Purpose + CR Strengthen/Weaken the Conclusion | VA | Tanya |
| 11 | `w03-sat-quant-3` | 3 | Saturday | QA 3: Probability + Permutation & Combination | QA | Unnati |
| 12 | `w04-fri-break` | 4 | Friday | Break | BREAK | — |
| 13 | `w04-sat-mock-2` | 4 | Saturday | Mock 2 | MOCK | — |
| 14 | `w04-sun-analysis-call` | 4 | Sunday | Group call: How to analyse mocks + individual calls over the week | SUPPORT | — |
| 15 | `w05-fri-verbal-4` | 5 | Friday | VA 4: RC Point of View + CR Evaluate the Conclusion | VA | Tanya |
| 16 | `w05-sat-quant-4` | 5 | Saturday | QA 4: Polynomials + Functions + Equations + Inequalities | QA | Unnati |
| 17 | `w05-sun-di-3` | 5 | Sunday | DI 3: MSR + TPA | DI | Ishan |
| 18 | `w06-fri-verbal-5` | 6 | Friday | VA 5: RC Inference Qs + CR Complete the Argument | VA | Tanya |
| 19 | `w06-sat-quant-5` | 6 | Saturday | QA 5: Number Properties + Multiples & Factors + Powers & Roots + Exponents | QA | Unnati |
| 20 | `w06-sun-di-4` | 6 | Sunday | DI 4: MSR + TPA (Non-Math) | DI | Ishan |
| 21 | `w07-fri-verbal-6` | 7 | Friday | VA 6: RC Function & Role Qs + CR Paradoxes + Boldface | VA | Tanya |
| 22 | `w07-sat-quant-6` | 7 | Saturday | QA 6: Averages + Descriptive Stats + Set Theory + Progressions | QA | Unnati |
| 23 | `w07-sun-di-5` | 7 | Sunday | DI 5: Mix bag | DI | Ishan |
| 24 | `w08-fri-break` | 8 | Friday | Break | BREAK | — |
| 25 | `w08-sat-mock-3` | 8 | Saturday | Mock 3 | MOCK | — |
| 26 | `w08-sun-individual-calls` | 8 | Sunday | Individual calls over the week | SUPPORT | — |
| 27 | `w10-sat-mock` | 10 | Saturday | Mock session | MOCK | — |
| 28 | `w12-sat-mock` | 12 | Saturday | Mock session | MOCK | — |
| 29 | `w14-sat-mock` | 14 | Saturday | Mock session | MOCK | — |
| 30 | `w16-sat-mock` | 16 | Saturday | Mock session | MOCK | — |

## Content still required

For each timeline item that has course content, Phase 3 still needs:

- the Notion pre-read page association;
- one or more worksheet PDFs uploaded by an Admin;
- the approved positive question count entered for each worksheet;
- confirmation that the item has no such content when intentionally empty.

Phase 5 adds optional titled YouTube recording links to each batch session without changing this master curriculum sequence. Pre-reads and worksheets remain reusable master content; recordings are batch-specific. The current review state is recorded in the [running handoff](../handoffs/ace-club-lms-running-handoff.md).
