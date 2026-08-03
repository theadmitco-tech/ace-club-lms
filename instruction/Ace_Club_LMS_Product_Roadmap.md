# Product Roadmap

Status: Active
Owner: Product owner
Last updated: 3 August 2026

**DELIVERY ROADMAP**

*A retain–repair–adapt–complete plan for the partially built Ace Club LMS*

Current delivery state: Phases 1–5 are signed off and deployed to Production. [PR #5](https://github.com/theadmitco-tech/ace-club-lms/pull/5) is the merged Phase 5 implementation. Phase 6 is next.

| **Product** | Ace Club Learning Management System |
| --- | --- |
| **Version** | MVP — current agreed scope |
| **Date** | 1 August 2026 |

> **Delivery approach:** Treat the current portal as an existing product. Audit first, retain working components, repair authentication, adapt the course experience and tracker, then pilot the complete journey.

## 1. Current-state assumptions
### Present or partially built
- Next.js portal and role-oriented interfaces
- Supabase authentication integration
- Google, magic-link and password-login paths requiring consolidation
- Admin and student dashboard components
- Notion-page rendering
- Some form of question or progress tracking
### Known repair or adaptation areas
- Supabase connection and non-working test logins
- Removal of unnecessary Super Admin and production Quick Access behaviour
- Revised curriculum import and fixed instructor mapping
- Cohort schedule and content-release automation
- Simplified spreadsheet-style tracker
- Admin visibility into student-entered tracker data
- Weekly worksheet recommendations, QA/VA/DI browsing and compact material access
- Batch-specific YouTube recording management and isolation
> **Planning range:** Allow approximately 5–7 engineering weeks plus 1–2 weeks for pilot and stabilisation. Re-estimate after the source code and database audit.

## 2. Delivery phases
### Phase 1 — Recover and audit
**Duration:** 2–3 working days
- Recover the editable application source, environment configuration and database migrations.
- Map routes, dashboards, authentication, Notion rendering, PDF handling and tracker components.
- Document Supabase tables, roles, policies, triggers and scheduled logic.
- Classify each feature as Keep, Repair, Adapt, Replace or Remove.
**Exit gate:** Feature inventory, database map, authentication diagnosis and validated estimate.
### Phase 2 — Repair and simplify accounts
**Duration:** 2–4 working days
- Correct Supabase URL, keys, redirect URLs and deployment configuration.
- Retain only Admin and Student as production roles.
- Configure Google Sign-In as the only launch login method.
- Create controlled staging Test Admin and Test Student Google identities.
- Verify OAuth callbacks, controlled provisioning, role redirects, logout and deactivation.
- Remove Super Admin and public production Quick Access controls.
**Exit gate:** A controlled Admin and Student can use Google Sign-In and reach only their permitted journeys; unprovisioned and deactivated accounts are denied; logout invalidates protected access; staging test identities pass the full login checklist; password, magic-link, Super Admin and public Quick Access paths are absent.
### Phase 3 — Align the master course
**Duration:** 3–5 working days
- Import the revised fixed curriculum.
- Use curriculum titles and class types.
- Apply DI–Ishan, VA–Tanya and QA–Unnati automatically.
- Associate master Notion pre-reads, PDF worksheets and worksheet question rows.
- Remove placeholder and duplicate course content.
**Exit gate:** One complete master course contains approved titles, instructors and materials.
### Phase 4 — Cohorts and release automation
**Duration:** 4–6 working days
- Create cohorts from a start date and agreed schedule.
- Generate class dates and material-release timestamps.
- Make Week 0 available when access is granted.
- Release later pre-reads seven days before class.
- Release PDF worksheets automatically after class.
- Protect locked content from direct URLs.
**Exit gate:** Two cohorts with different start dates receive correct schedules and releases.
### Pre–Phase 5 foundation checkpoint
**Duration:** 1–2 working days
- Make the approved detailed QA/VA/DI class labels authoritative using stable curriculum keys.
- Approve the Student experience foundation, state/content matrix and desktop prototype.
- Lock Recommended practice, This week, Timeline, Browse by section and compact resource behavior.
- Define weekly worksheet recommendations without daily quotas or daily question ranges.
- Lock Phase 5 and Phase 6 exit criteria before implementation.
**Exit gate:** Product authority, curriculum labels, interaction rules, verification checklist and continuation links are aligned before Phase 5 code changes begin.
### Phase 5 — Adapt the student experience
**Duration:** 6–8 working days
- Place Recommended practice above This week and show prior-week released worksheets as whole weekly tasks.
- Recommend DI pre-read on Thursday, VA pre-read on Friday and QA pre-read on Saturday without changing release rules.
- Build a chronological Timeline with Week 0 and curriculum-derived class cards.
- Add Browse by section for QA, VA and DI only; keep non-academic events in Timeline.
- Place pre-read, class, recording, worksheet and tracker in journey order.
- Add compact Pre-read, Recording and Worksheet access to Timeline and section items; prepare the shared action placement for Phase 6 Log access without exposing a dead control.
- Allow Admins to add, title, edit and remove validated YouTube links on each batch session.
- Keep recordings batch-specific: cohort generation and reusable-material sync copy pre-reads and worksheets but never recordings.
- Show Available now, Upcoming, Available after class and error states.
- Reuse existing Notion and PDF components where viable.
- Remove rank, correctness, accuracy, daily-target analytics and auto-graded practice from the reachable Student experience while preserving historical data.
**Exit gate:** A Student understands this week's preparation and recommended practice, browses the same course by Timeline or QA/VA/DI, reaches configured materials directly, and remains blocked from unreleased content; Admin-managed YouTube recordings validate, remain isolated to their batch and release correctly.
### Phase 6 — Simplify the tracker
**Duration:** 5–8 working days
- Reuse or migrate the existing progress tables where safe.
- Create student–worksheet–question records.
- Support Done and Come back for review only.
- Add a persistent Practice log overview grouped by course week, with saved Done totals, review counts and last-update information.
- Provide direct Update log access from Recommended practice, Timeline and Browse by section.
- Allow Students to select question numbers and bulk Mark selected Done or Mark selected for review.
- Add optional time and comment fields.
- Add autosave, saved state, partial-failure identification and failed-record retry behaviour.
- Ensure student-level data isolation.
**Exit gate:** The spreadsheet-style tracker persists individual and bulk-selected manual input without duplicate records or data leakage, and every log entry point opens the same worksheet records.
### Phase 7 — Adapt admin progress
**Duration:** 3–5 working days
- Reuse existing admin and student-detail components.
- Show Done, Come back for review, Not updated and last-update totals.
- Allow authorised admins to inspect question-level time and comments.
- Calculate completion only from manual Done entries.
- Remove advanced V2 analytics from the MVP interface.
**Exit gate:** Admin totals match the student tracker and privacy tests pass.
### Phase 8 — Pilot, launch and stabilise
**Duration:** 1–2 weeks
- Pilot with one Test Admin, one Test Student and five to ten first-time students.
- Exercise Week 0, a scheduled pre-read, a class and a released worksheet.
- Run authentication, permissions, time-zone, supported desktop-browser and regression testing.
- Fix critical and high-severity defects.
- Launch the first live cohort and monitor key failures.
**Exit gate:** End-to-end acceptance passes with no critical defects or cross-student data exposure.
## 3. Recommended implementation sequence
1. Repair login, roles and environments before building additional screens.
1. Make one complete master course work before importing every curriculum item.
1. Make one cohort schedule and release sequence work end to end.
1. Complete Week 0, one later pre-read and one worksheet journey.
1. Complete Recommended practice, This week and QA/VA/DI browsing for one current week.
1. Add a different YouTube recording to the same curriculum session in two batches and verify isolation.
1. Adapt the tracker for one worksheet and expose it to an Admin.
1. Generalise the proven vertical slice across the curriculum.
1. Pilot with real first-time users before launch.
## 4. Team ownership
| **Role** | **Primary responsibilities** |
| --- | --- |
| Product owner | Curriculum, scope, acceptance decisions, pilot approval and launch decision |
| Designer | Recommended practice, weekly guidance, Timeline, section browsing, material states and desktop tracker behaviour |
| Front-end engineer | Portal components, Notion rendering, PDF experience, tracker interface and auth screens |
| Back-end engineer | Supabase, roles, policies, scheduling, release automation and tracker persistence |
| QA engineer | Acceptance tests, permissions, time-boundary tests, regression and pilot validation |

> **Small-team option:** One full-stack engineer can combine front-end and back-end ownership, but QA and product acceptance should remain explicit.

## 5. Sprint plan
| **Sprint** | **Goal** | **Demonstrable outcome** |
| --- | --- | --- |
| Sprint 1 | Audit and authentication | Test Admin and Test Student Google Sign-In journeys work |
| Sprint 2 | Master course and cohorts | A start date generates one correct cohort schedule |
| Sprint 3 | Content journey | Weekly guidance, Timeline, section browsing, pre-read, PDF and YouTube release work |
| Sprint 4 | Tracker and admin view | Individual and bulk-selected Student input persists and Admin sees matching progress |
| Sprint 5 | Pilot and launch | Acceptance, privacy and regression tests pass |

## 6. Account setup runbook
### Production account model
- Production users are Admins and Students.
- Both use controlled Google Sign-In; production passwords and magic links are not supported.
- The first Admin is provisioned by the technical team, after which the Admin provisions students by their Google-account email.
- Test Admin and Test Student are staging identities, not additional product roles.
### Information required
- One controlled email address for the first real Admin
- One controlled staging email address for Test Admin
- One controlled staging email address for Test Student
- Supabase project access
- Staging and production portal URLs
- Deployment environment access
### Technical setup steps
1. Confirm the application’s Supabase project URL and public key in staging and production.
1. Set Supabase Site URL and allowed callback URLs for localhost, staging and production.
1. Configure separate Google OAuth web clients for staging and production.
1. Configure the Supabase Google provider, callback URL and application redirect allowlist in each environment.
1. Create the first Admin application profile for the approved Google-account email.
1. Assign the Admin role and verify row-level security permits only authorised admin actions.
1. Add controlled Test Admin and Test Student Google accounts to the staging OAuth testing audience and assign their matching application roles.
1. Provision a first-time Student through the portal and verify the complete Google OAuth callback.
1. Test an unprovisioned Google account, logout, deactivation and direct access to protected routes.
1. Remove or disable Quick Access and all staging identities from the production interface.
### Security rules
- Never place the Supabase service-role key in browser code or public environment variables.
- Never hard-code test passwords into a production bundle.
- Keep test identities and test data in staging.
- Require row-level security for student, cohort and tracker tables.
- Verify a Student cannot retrieve another Student’s tracker data.
## 7. Key dependencies and risks
| **Dependency or risk** | **Mitigation** |
| --- | --- |
| Editable source is unavailable | Recover source, migrations and deployment configuration before estimating implementation |
| Supabase fetch failure | Repair environment and network configuration before recreating users |
| Curriculum changes late | Freeze the revised master curriculum before bulk import |
| Weekly practice becomes a daily quota system | Recommend whole released worksheets for the week; do not generate daily question ranges |
| A recording leaks or propagates across batches | Store recordings on cohort sessions only; exclude videos from master generation and material sync |
| Notion access changes | Validate page permissions and add observable rendering errors |
| Release-time errors | Store one programme time zone and test exact boundary conditions |
| Tracker data leakage | Use row-level security plus cross-student automated tests |
| Existing tracker does not fit | Migrate only reusable data and replace the interface incrementally |

## 8. Definition of done
- The agreed acceptance criteria pass in staging.
- Automated tests cover authentication, roles, releases and tracker privacy.
- QA verifies supported desktop-browser, keyboard and text-zoom behaviour.
- No critical or high-severity defects remain.
- The feature is demonstrated to the product owner.
- Operational errors are logged and support instructions exist.
- Production configuration contains no staging accounts or Quick Access controls.
