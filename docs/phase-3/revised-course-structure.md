# Ace Club Revised Course Structure

Status: Active
Owner: Product owner
Last updated: 1 August 2026

## Approved source

The Product Owner supplied this fixed course structure on 31 July 2026:

| Week | Friday | Saturday | Sunday |
| --- | --- | --- | --- |
| 0 | Mock 1 (Diagnostic) | Individual calls to analyse | Individual calls to analyse |
| 1 | Orientation - 1hr | Verbal 1 | Quant 1 |
| 2 | DI 1 | Verbal 2 | Quant 2 |
| 3 | DI 2 | Verbal 3 | Quant 3 |
| 4 | Break | Mock 2 | Group call: How to analyse mocks + individual calls over the week |
| 5 | DI 3 | Verbal 4 | Quant 4 |
| 6 | DI 4 | Verbal 5 | Quant 5 |
| 7 | DI 5 | Verbal 6 | Quant 6 |
| 8 | Break | Mock 3 | Individual calls over the week |
| 10, 12, 14, 16 |  | Mock sessions |  |

## Normalization rules

- `Verbal` uses class type `VA` and instructor Tanya.
- `Quant` uses class type `QA` and instructor Unnati.
- `DI` uses class type `DI` and instructor Ishan.
- Orientation, mocks, support calls, and breaks use distinct event types with no inferred instructor.
- Each non-empty week/day cell gets a stable key in the form `wNN-weekday-slug`.
- Repeated mock sessions expand to separate Week 10, 12, 14, and 16 rows.
- The Product Owner approved detailed QA/VA/DI academic labels on 1 August 2026. Stable curriculum keys, sequence, week, day, type and instructor remain unchanged.

## Normalized sequence

| Order | Stable key | Week | Day | Title | Type | Instructor |
| ---: | --- | ---: | --- | --- | --- | --- |
| 1 | `w00-fri-mock-1-diagnostic` | 0 | Friday | Mock 1 (Diagnostic) | MOCK | — |
| 2 | `w00-sat-individual-calls-to-analyse` | 0 | Saturday | Individual calls to analyse | SUPPORT | — |
| 3 | `w00-sun-individual-calls-to-analyse` | 0 | Sunday | Individual calls to analyse | SUPPORT | — |
| 4 | `w01-fri-orientation-1hr` | 1 | Friday | Orientation - 1hr | ORIENTATION | — |
| 5 | `w01-sat-verbal-1` | 1 | Saturday | VA 1: RC Intro + CR Inferences | VA | Tanya |
| 6 | `w01-sun-quant-1` | 1 | Sunday | QA 1: Fractions + Percentages + Ratios & Mixtures + SI/CI | QA | Unnati |
| 7 | `w02-fri-di-1` | 2 | Friday | DI 1: DS + GI | DI | Ishan |
| 8 | `w02-sat-verbal-2` | 2 | Saturday | VA 2: RC Mind-Mapping + CR Finding the Assumptions | VA | Tanya |
| 9 | `w02-sun-quant-2` | 2 | Sunday | QA 2: Pipes & Cisterns + Work & Time + Speed, Time, Distance | QA | Unnati |
| 10 | `w03-fri-di-2` | 3 | Friday | DI 2: DS + TA | DI | Ishan |
| 11 | `w03-sat-verbal-3` | 3 | Saturday | VA 3: RC Primary Purpose + CR Strengthen/Weaken the Conclusion | VA | Tanya |
| 12 | `w03-sun-quant-3` | 3 | Sunday | QA 3: Probability + Permutation & Combination | QA | Unnati |
| 13 | `w04-fri-break` | 4 | Friday | Break | BREAK | — |
| 14 | `w04-sat-mock-2` | 4 | Saturday | Mock 2 | MOCK | — |
| 15 | `w04-sun-group-call-how-to-analyse-mocks` | 4 | Sunday | Group call: How to analyse mocks + individual calls over the week | SUPPORT | — |
| 16 | `w05-fri-di-3` | 5 | Friday | DI 3: MSR + TPA | DI | Ishan |
| 17 | `w05-sat-verbal-4` | 5 | Saturday | VA 4: RC Point of View + CR Evaluate the Conclusion | VA | Tanya |
| 18 | `w05-sun-quant-4` | 5 | Sunday | QA 4: Polynomials + Functions + Equations + Inequalities | QA | Unnati |
| 19 | `w06-fri-di-4` | 6 | Friday | DI 4: MSR + TPA (Non-Math) | DI | Ishan |
| 20 | `w06-sat-verbal-5` | 6 | Saturday | VA 5: RC Inference Qs + CR Complete the Argument | VA | Tanya |
| 21 | `w06-sun-quant-5` | 6 | Sunday | QA 5: Number Properties + Multiples & Factors + Powers & Roots + Exponents | QA | Unnati |
| 22 | `w07-fri-di-5` | 7 | Friday | DI 5: Mix bag | DI | Ishan |
| 23 | `w07-sat-verbal-6` | 7 | Saturday | VA 6: RC Function & Role Qs + CR Paradoxes + Boldface | VA | Tanya |
| 24 | `w07-sun-quant-6` | 7 | Sunday | QA 6: Averages + Descriptive Stats + Set Theory + Progressions | QA | Unnati |
| 25 | `w08-fri-break` | 8 | Friday | Break | BREAK | — |
| 26 | `w08-sat-mock-3` | 8 | Saturday | Mock 3 | MOCK | — |
| 27 | `w08-sun-individual-calls-over-week` | 8 | Sunday | Individual calls over the week | SUPPORT | — |
| 28 | `w10-sat-mock-session` | 10 | Saturday | Mock session | MOCK | — |
| 29 | `w12-sat-mock-session` | 12 | Saturday | Mock session | MOCK | — |
| 30 | `w14-sat-mock-session` | 14 | Saturday | Mock session | MOCK | — |
| 31 | `w16-sat-mock-session` | 16 | Saturday | Mock session | MOCK | — |

## Content still required

For each timeline item that has course content, Phase 3 still needs:

- the Notion pre-read page association;
- one or more worksheet PDFs uploaded by an Admin;
- the approved positive question count entered for each worksheet;
- confirmation that the item has no such content when intentionally empty.

Phase 5 adds optional titled YouTube recording links to master items without changing this curriculum sequence.
