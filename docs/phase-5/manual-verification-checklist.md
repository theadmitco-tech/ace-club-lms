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
- [x] Whole prior-week worksheet practice and direct log-access rules are documented without daily quotas.
- [x] YouTube recording scope and propagation requirements are documented.
- [x] Phase 5 delivery exit criteria are written before implementation.
- [x] Mobile optimisation is formally deferred in the authoritative MVP acceptance criteria; desktop, keyboard, and text-zoom support remain required.
- [x] Desktop prototype direction is reviewed and approved by the Product Owner.
- [x] The approved 17-title curriculum migration is applied successfully in staging.
- [x] UI state and content matrix is approved.
- [x] Product Owner and Engineering approval is recorded.

## B. Prototype review

- [ ] This week is visually clear without becoming an oversized hero.
- [ ] Recommended practice appears above This week.
- [ ] Timeline is selected by default.
- [ ] Week 0 and current week start open and can be collapsed.
- [ ] Other weeks can be expanded.
- [ ] Browse by section exposes exactly QA, VA, and DI.
- [ ] Section results remain in course order and show week and availability.
- [ ] Non-academic events appear only in Timeline.
- [ ] Thursday state recommends DI pre-read.
- [ ] Friday state recommends VA pre-read.
- [ ] Saturday state recommends QA pre-read.
- [ ] Recommended practice shows whole prior-week released worksheets throughout the current week.
- [ ] Thursday, Friday, and Saturday show pre-read and practice recommendations together.
- [ ] Each practice row exposes Open worksheet; Update log appears only after Phase 6 tracking exists.
- [ ] Timeline and Browse by section expose compact Pre-read, Video and Worksheet actions; Log appears only when its tracker destination exists.
- [ ] Available resources are buttons; unavailable resources show release text; unconfigured resources do not create broken controls.
- [ ] Quick log supports Select all, Mark selected Done, and Mark selected for review.
- [ ] Quick log never changes unselected questions.
- [ ] Week 0 and exceptional-week states do not invent recommendations.
- [ ] Available, Upcoming, Available after class, Not configured, and failed states are understandable.
- [ ] QA, VA, DI, orientation, mock, break, and support variants are understandable.
- [ ] Keyboard order, focus, text zoom, and non-colour status communication pass.

## C. Phase 5 staging acceptance

### Student navigation

- [x] The signed-in Student reaches This week and Timeline.
- [ ] All 31 curriculum items appear in chronological week order.
- [ ] QA browsing returns only QA items in course order.
- [ ] VA browsing returns only VA items in course order.
- [ ] DI browsing returns only DI items in course order.
- [ ] Timeline and section results open the same underlying curriculum item.

### Weekly recommendations

- [ ] Thursday in `Asia/Kolkata` recommends the Friday DI pre-read.
- [ ] Friday recommends the Saturday VA pre-read.
- [ ] Saturday recommends the Sunday QA pre-read.
- [ ] Other days show weekly actions without a forced recommendation.
- [ ] The current week loads each applicable released prior-week worksheet as one whole weekly task.
- [ ] Multiple worksheets remain distinguishable inside one Recommended practice group.
- [ ] Open worksheet reaches the matching released PDF.
- [ ] After Phase 6 activation, Update log reaches the matching worksheet tracker.
- [ ] Update log from This week and Timeline reaches the same worksheet records and does not create duplicates.
- [ ] The worksheet workspace keeps the selected PDF and log context together.
- [ ] Bulk and individual log changes persist after refresh.
- [ ] Partial bulk-save failure identifies failed questions and retries only those questions.
- [ ] Recommended practice does not expose rank, accuracy, correctness, streak, or class comparison.
- [ ] Recommendation changes do not modify release timestamps or material visibility.

### Materials and failures

- [ ] Week 0 configured content is immediately available.
- [ ] A later pre-read remains unavailable until seven days before class.
- [ ] A worksheet remains unavailable until class end.
- [ ] A recording remains unavailable until class end.
- [ ] Direct URLs remain denied before release.
- [ ] Notion failure shows retry and leaves the rest of the journey usable.
- [ ] PDF failure shows an actionable error.
- [ ] Missing material shows Not configured without a broken action.
- [ ] Empty enrollment and empty curriculum states explain what to do next.

### Admin recordings

- [ ] Admin adds and titles a valid YouTube recording on a master curriculum item.
- [ ] Invalid and non-YouTube links are rejected.
- [ ] New cohort generation copies the recording with the correct release timestamp.
- [ ] Explicit sync adds a new recording to an existing cohort once.
- [ ] Editing the master link updates linked cohort material without duplication.
- [ ] Link propagation does not change `available_from`.

### Simplification and non-regression

- [ ] Rank, percentile, accuracy, correctness, daily targets, and auto-graded practice are absent from the Student UI.
- [ ] The UI does not claim manual tracker progress before Phase 6 data exists.
- [ ] Google authentication, role routing, logout, enrollment, and deactivation remain passing.
- [ ] Cross-student privacy and RLS remain passing.
- [ ] Notion containment and private PDF delivery remain passing.
- [x] Targeted lint and TypeScript pass.
- [x] Guarded Production build passes.
- [ ] Staging evidence is recorded before Production rollout.
