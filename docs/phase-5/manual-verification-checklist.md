# Phase 5 — Preparation and Delivery Verification Checklist

Status: Preparation gate complete; Phase 5–6 delivery checks remain open  
Owner: Product owner, Engineering, and QA  
Last updated: 1 August 2026

## A. Preparation gate before engineering

- [x] Student journey and hierarchy are documented.
- [x] Current Student surfaces are classified as retain, adapt, remove, or defer.
- [x] Timeline is confirmed as the default navigation.
- [x] Browse by section is limited to QA, VA, and DI.
- [x] Topic tags and topic taxonomy are excluded.
- [x] This week replaces “Today’s task.”
- [x] Thursday DI, Friday VA, and Saturday QA recommendation rules are documented.
- [x] Rotating per-section worksheet recommendations and direct log-access rules are documented without daily quotas.
- [x] YouTube recording scope and propagation requirements are documented.
- [x] Phase 5 delivery exit criteria are written before implementation.
- [x] Mobile optimisation is formally deferred in the authoritative MVP acceptance criteria; desktop, keyboard, and text-zoom support remain required.
- [x] Desktop prototype direction is reviewed and approved by the Product Owner.
- [x] The approved 17-title curriculum migration is applied successfully in staging.
- [x] UI state and content matrix is approved.
- [x] Product Owner and Engineering approval is recorded.

## B. Prototype review

- [x] This week is visually clear without becoming an oversized hero.
- [x] Recommended practice appears above This week.
- [x] Timeline is selected by default.
- [x] Only the current programme week starts open and can be collapsed; Week 0 starts collapsed after the programme advances.
- [x] Other weeks can be expanded.
- [x] Browse by section exposes exactly QA, VA, and DI.
- [x] Section results remain in course order and show week and availability.
- [x] Non-academic events appear only in Timeline.
- [x] Thursday state recommends DI pre-read.
- [x] Friday state recommends VA pre-read.
- [x] Saturday state recommends QA pre-read.
- [x] Recommended practice shows at most one active released worksheet each for DI, VA, and QA.
- [x] A worksheet leaves Recommended practice when the next class in its section begins but remains accessible in Timeline and Browse by section.
- [x] Thursday, Friday, and Saturday show pre-read and practice recommendations together.
- [x] Each practice row exposes Open worksheet; Update log appears only after Phase 6 tracking exists.
- [x] Timeline and Browse by section expose compact Pre-read, Video and Worksheet actions; Log appears only when its tracker destination exists.
- [x] Available resources are buttons; unavailable resources show release text; unconfigured resources do not create broken controls.
- [ ] Quick log supports Select all, Mark selected Done, and Mark selected for review.
- [ ] Quick log never changes unselected questions.
- [x] Week 0 and exceptional-week states do not invent recommendations.
- [ ] Available, Upcoming, Available after class, Not configured, and failed states are understandable.
- [x] QA, VA, DI, orientation, mock, break, and support variants are understandable.
- [x] Keyboard order, focus, text zoom, and non-colour status communication pass.

## C. Phase 5 staging acceptance

### Student navigation

- [x] The signed-in Student reaches This week and Timeline.
- [x] All 31 curriculum items appear in chronological week order.
- [x] QA browsing returns only QA items in course order.
- [x] VA browsing returns only VA items in course order.
- [x] DI browsing returns only DI items in course order.
- [x] Timeline and section results open the same underlying curriculum item.

### Weekly recommendations

- [x] Thursday in `Asia/Kolkata` recommends the Friday DI pre-read.
- [x] Friday recommends the Saturday VA pre-read.
- [x] Saturday recommends the Sunday QA pre-read.
- [x] Other days show weekly actions without a forced recommendation.
- [x] Each section worksheet enters Recommended practice after its class ends and remains until the next same-section class begins.
- [x] The final released worksheet in each section remains recommended when no later same-section class exists.
- [x] Open worksheet reaches the matching released PDF.
- [ ] After Phase 6 activation, Update log reaches the matching worksheet tracker.
- [ ] Update log from This week and Timeline reaches the same worksheet records and does not create duplicates.
- [ ] The worksheet workspace keeps the selected PDF and log context together.
- [ ] Bulk and individual log changes persist after refresh.
- [ ] Partial bulk-save failure identifies failed questions and retries only those questions.
- [x] Recommended practice does not expose rank, accuracy, correctness, streak, or class comparison.
- [x] Recommendation changes do not modify release timestamps or material visibility.

### Materials and failures

- [ ] Week 0 configured content is immediately available.
- [ ] A later pre-read remains unavailable until seven days before class.
- [ ] A worksheet remains unavailable until class end.
- [x] A recording remains unavailable until class end.
- [ ] Direct URLs remain denied before release.
- [ ] Notion failure shows retry and leaves the rest of the journey usable.
- [ ] PDF failure shows an actionable error.
- [x] Missing material shows Not configured without a broken action.
- [x] Empty enrollment and empty curriculum states explain what to do next.

### Admin recordings

- [x] Admin adds and titles a valid YouTube recording on a master curriculum item.
- [x] Invalid and non-YouTube links are rejected.
- [ ] New cohort generation copies the recording with the correct release timestamp.
- [x] Explicit sync adds a new recording to an existing cohort once.
- [x] Editing the master link updates linked cohort material without duplication.
- [x] Link propagation does not change `available_from`.

### Simplification and non-regression

- [x] Rank, percentile, accuracy, correctness, daily targets, and auto-graded practice are absent from the Student UI.
- [x] The UI does not claim manual tracker progress before Phase 6 data exists.
- [x] Google authentication, role routing, logout, enrollment, and deactivation remain passing.
- [ ] Cross-student privacy and RLS remain passing.
- [x] Notion containment and private PDF delivery remain passing.
- [x] Targeted lint and TypeScript pass.
- [x] Guarded Production build passes.
- [x] Staging evidence is recorded before Production rollout.
