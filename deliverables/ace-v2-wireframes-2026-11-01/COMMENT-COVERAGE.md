# Review coverage and decision log

Date: 1 November 2026. Status: revised design for review; not application activation.

Sources: the user-supplied annotated `ace-v2-wireframes-2026-10-28.pdf`, all 24 pages
visually inspected; the user's Wireframe Discussion / Action Items message; and
the supplied Phase Exit Gates review draft. These documents inform design scope;
they do not authorize Production, migrations or changing real data.

The PDF contains **22 structured annotation objects, all hyperlinks with empty
comment text**. The visible green handwriting is flattened into page graphics.
There is therefore no reliable machine-readable “comment count”. The following
**26 review items are manually grouped observations**, not a claim of 26 native
PDF comments. Source page numbers are 1-based PDF page numbers, including cover.
Short quoted phrases are visual transcriptions; the surrounding meaning is
paraphrased. Original images remain in the source PDF, not duplicated into this pack.

| ID | Source page(s) / observation | Revision and review screen | Status |
|---|---|---|---|
| C01 | p2: “highlight this more?” around route choices | Large, separately described Recordings and Live courses choices, screens 01–03 | Incorporated |
| C02 | p2: “Just 3 offering”; one / two / all-three subject prices | Three individual package tiers with subject selection; distinct Full Course below, screens 01–03 | Incorporated; user confirmed D01 on 1 November |
| C03 | p3: “add detailed outline” | Subject-specific outline topics with expandable groups, screen 04 | Incorporated |
| C04 | p3: “full sample of 1 session here” | Four-resource sample summary and Open sample session, screen 04 → 09 | Incorporated as fictional sample |
| C05 | p4: student should see published schedule | Public schedule next to Live pricing, screen 03, and detail | Incorporated |
| C06 | p4: Full batch all three sections bought together; individual 10K /18K /25K | Full Course includes all three; individual combinations preserve their package identity | Incorporated; operational live seat allocation remains separate |
| C07 | p5: same detail feedback; schedule highlighted on previous page | Detail carries outline/sample; catalogue exposes schedule before detail, screens 03–04 | Incorporated |
| C08 | p6: simple “where you left off” indication / color change | Green resume band and matching session row, explicit Last opened label, screen 05 | Incorporated, visual only |
| C09 | p6: questioned outline sidebar and unused space | Removed persistent learning outline rail; compact View outline highlights link, screen 05 | Incorporated |
| C10 | p7: “No need for this” step navigation | Removed Prepare/Watch/Practise/Recap strip, screens 09–10 | Incorporated |
| C11 | p7: pre-class read, recording, post-class read, worksheet | Exactly that four-item order in student session and Admin configuration, screens 09–10/14 | Incorporated |
| C12 | p7: “Need real estate for reads before & after” | Full-width readable lesson column; expandable pre/post readings, screen 10 | Incorporated |
| C13 | p8: “Don’t need this right section” | Removed recording-only sidebar, screen 09 | Incorporated |
| C14 | p9: bigger lock, gray page, clear CTA | Prominent feedback panel; other affected Quant rows muted; current session and other subjects accessible, screen 06 | Incorporated within section boundary |
| C15 | p10: section for live-class schedules | Student Live classes destination; enrolled-only worked example, screen 08 | Incorporated |
| C16 | p11: crossed-out live/session right rail | Live details moved to Live classes; session resource page keeps the four resources, screens 08–09 | Incorporated |
| C17 | p12: form shared on Tally | Feedback design labels final form/integration as future supplied work, screen 11 | Design placeholder; no Tally connection claimed |
| C18 | p13: how Quant 5 accessed when feedback due? | Quant 5 is disabled while Quant 4 is pending; current Quant 4 resources remain open, screen 06 | Incorporated and interaction checked |
| C19 | p16: “simple page with no CTA” | Expiry notice and retained history, no main-content button/link, screen 13 | Incorporated |
| C20 | p17: unpurchased subjects locked on learning page, option to purchase | Locked subject buttons open an upsell modal; existing subject access stays intact, screen 07 | Incorporated as design simulation |
| C21 | p18–19: “too complex” Admin editor | Two publishing destinations, four resource accordions, minimal primary actions, screen 14 | Incorporated |
| C22 | p20: publication easier for Admin | One review step with explicit target list and confirmation, screen 17 | Incorporated; scope safeguards retained |
| C23 | p21: calendar view / calendar popup | Actual-live-class calendar modal, screen 16; dates in Batch publishing, screen 15 | Incorporated; fixed illustrative month |
| C24 | p22: feedback support “will come to this later” | Removed support controls from primary publishing surface; completion/support remains secondary explanatory detail | Deferred in revised UI; no existing backend behavior removed |
| C25 | p24: handwritten “80%” watched threshold | Recorded on decisions screen 18 and D02 below | Pending owner confirmation; not implemented |
| C26 | p24: “There can’t be simultaneous” if subject locked | Recording navigation blocked; no assumption that asynchronous live obligations cannot overlap, screen 18 | Pending explicit policy; D03 |

## Discussion action items

| User-supplied action item | Coverage | Implementation phase |
|---|---|---|
| Simplify Admin dashboard, session configuration and batch publishing on left | Screens 14–17; C21–C24 | Phase 2 design |
| Add Admin calendar popup for batches | Screens 15–16; only actual live events require dates | Phase 2 design |
| Reorder student session content and tiered pricing | Screens 01–04,09–10; C02,C11 | Pricing foundation Phase 1; registration Phase 3; delivery Phase 4 |
| Pick where you left off visual indicator | Screen 05; C08 | Phase 4 design; no analytics claim |
| Gray feedback-gated content with CTA | Screens 06,11–12; C14,C18 | Phase 4 design; section-only lock |
| Membership expiration notice | Screen 13; C19 | Phase 1 entitlement presentation / Phase 4 protected-delivery boundary |
| Upselling popup on locked individual section | Screen 07; C20 | Phase 1 quote requirement / Phase 3 payment integration; design only |

## Decisions requiring review

**D01 — Three package tiers versus four offerings.** Source PDF p2 says “Just 3
offering”; the Phase 1 gate explicitly lists Full Course, Individual Quant,
Individual Verbal and Individual DI, and forbids silently converting individual
purchases to Full Course. Working design: three *package-size choices* with
subject selection, plus a separate Full Course option. This preserves the current
entitlement model. **Confirmed by the user on 1 November 2026:** “Yes—three tiers,
Full Course separate.” This closes the presentation ambiguity only; it does not
approve internal legacy-code compatibility, upgrade credit/expiry policy, a
database migration, or full phase sign-off.

**D02 — 80% watched.** Source PDF p24 proposes 80%, replacing the earlier open
80%/90% choice. This iteration records 80% as the suggested value but does not
implement a watched trigger, player tracking, feedback API or progress policy.
Owner confirmation and trusted-player event semantics are still needed for the
relevant delivery phase.

**D03 — Concurrent feedback obligations.** Source PDF p24 says section locking
prevents simultaneous obligations. It does prevent navigating to another locked
recording. It does not by itself settle delayed verified notifications, multiple
completed live events or existing obligations. Do not deduplicate or discard those
records on this assumption. The prototype demonstrates one Quant 4 obligation.

**D04 — Completion reversal.** The existing unresolved question remains: how does
reversing a completed live class affect previously created feedback restrictions?
Retain submissions and audit history. This revision neither erases feedback nor
automatically unlocks a section on class correction.

**D05 — Live registration allocation.** Full Course remains an all-three-subject
offering, and the public schedule can be reviewed before buying. How live seats
across the three subject groups are allocated atomically, and how unavailable
subjects affect the transaction, remains operational/payment design work. The
prototype never grants a Full Course purchase access to an unrelated Meet link.

## Scope limits

This artifact does not replace the Phase 1 exit-gate audit and does not close an
unimplemented upgrade quote gate. Its ₹8,000 upgrade illustration is arithmetic
within a fictional UX; the real server must verify eligible existing purchases,
payment, price version and expiry. No expiry reset or renewal policy is invented.

The HTML is deliberately a review prototype, not the production student renderer.
Real imported materials, Notion rendering, security, payments, live capacity and
feedback verification require implementation and staged evidence in their phase.
The previous October prototype remains available for deeper support/placement
review; this revision focuses on the requested simpler primary journeys.
