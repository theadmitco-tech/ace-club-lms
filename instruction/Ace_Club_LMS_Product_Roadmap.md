# Product Roadmap

Status: Active
Owner: Product owner
Last updated: 31 July 2026
Source artifact: [Product Roadmap DOCX](Ace_Club_LMS_Product_Roadmap.docx)

**DELIVERY ROADMAP**

*A retain–repair–adapt–complete plan for the partially built Ace Club LMS*

| **Product** | Ace Club Learning Management System |
| --- | --- |
| **Version** | MVP — current agreed scope |
| **Date** | 30 July 2026 |

> **Delivery approach:** Treat the current portal as an existing product. Audit first, retain working components, repair authentication, adapt the course experience and tracker, then pilot the complete journey.

## 1. Current-state assumptions
### Present or partially built
- Next.js portal and role-oriented interfaces
- Supabase authentication integration
- Magic-link and password-login paths
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
- Create staging Test Admin and Test Student identities.
- Verify magic-link invitations, callbacks, role redirects, logout and deactivation.
- Remove Super Admin and public production Quick Access controls.
**Exit gate:** New Admin and Student access works; staging test identities pass the full login checklist.
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
### Phase 5 — Adapt the student experience
**Duration:** 4–6 working days
- Adapt the dashboard to show the next relevant action.
- Build a chronological timeline with Week 0 and curriculum-derived class cards.
- Place pre-read, class, worksheet and tracker in journey order.
- Show Available now, Upcoming, Available after class and error states.
- Reuse existing Notion and PDF components where viable.
**Exit gate:** A student can understand what is available now, what is next and what remains locked.
### Phase 6 — Simplify the tracker
**Duration:** 5–8 working days
- Reuse or migrate the existing progress tables where safe.
- Create student–worksheet–question records.
- Support Done and Come back for review only.
- Add optional time and comment fields.
- Add autosave, saved state and retry behaviour.
- Ensure student-level data isolation.
**Exit gate:** The spreadsheet-style tracker persists manual student input without data leakage.
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
- Run authentication, permissions, time-zone, mobile and regression testing.
- Fix critical and high-severity defects.
- Launch the first live cohort and monitor key failures.
**Exit gate:** End-to-end acceptance passes with no critical defects or cross-student data exposure.
## 3. Recommended implementation sequence
1. Repair login, roles and environments before building additional screens.
1. Make one complete master course work before importing every curriculum item.
1. Make one cohort schedule and release sequence work end to end.
1. Complete Week 0, one later pre-read and one worksheet journey.
1. Adapt the tracker for one worksheet and expose it to an Admin.
1. Generalise the proven vertical slice across the curriculum.
1. Pilot with real first-time users before launch.
## 4. Team ownership
| **Role** | **Primary responsibilities** |
| --- | --- |
| Product owner | Curriculum, scope, acceptance decisions, pilot approval and launch decision |
| Designer | Dashboard, timeline, material states, tracker and responsive behaviour |
| Front-end engineer | Portal components, Notion rendering, PDF experience, tracker interface and auth screens |
| Back-end engineer | Supabase, roles, policies, scheduling, release automation and tracker persistence |
| QA engineer | Acceptance tests, permissions, time-boundary tests, regression and pilot validation |

> **Small-team option:** One full-stack engineer can combine front-end and back-end ownership, but QA and product acceptance should remain explicit.

## 5. Sprint plan
| **Sprint** | **Goal** | **Demonstrable outcome** |
| --- | --- | --- |
| Sprint 1 | Audit and authentication | Test Admin, Test Student and magic-link journeys work |
| Sprint 2 | Master course and cohorts | A start date generates one correct cohort schedule |
| Sprint 3 | Content journey | Week 0, scheduled pre-read and post-class PDF release work |
| Sprint 4 | Tracker and admin view | Student input persists and Admin sees matching progress |
| Sprint 5 | Pilot and launch | Acceptance, privacy and regression tests pass |

## 6. Account setup runbook
### Production account model
- Production users are Admins and Students.
- Both use email magic links; production passwords are not required.
- The first Admin is created by the technical team, after which the Admin invites students.
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
1. Configure authenticated email delivery and the magic-link email template.
1. Create the first Admin authentication user and corresponding application profile.
1. Assign the Admin role and verify row-level security permits only authorised admin actions.
1. Create Test Admin and Test Student in staging and assign their matching roles.
1. Invite a first-time Student through the portal and verify the complete magic-link callback.
1. Test expiry, reuse, logout, deactivation and direct access to protected routes.
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
| Notion access changes | Validate page permissions and add observable rendering errors |
| Release-time errors | Store one programme time zone and test exact boundary conditions |
| Tracker data leakage | Use row-level security plus cross-student automated tests |
| Existing tracker does not fit | Migrate only reusable data and replace the interface incrementally |

## 8. Definition of done
- The agreed acceptance criteria pass in staging.
- Automated tests cover authentication, roles, releases and tracker privacy.
- QA verifies mobile and desktop behaviour.
- No critical or high-severity defects remain.
- The feature is demonstrated to the product owner.
- Operational errors are logged and support instructions exist.
- Production configuration contains no staging accounts or Quick Access controls.
