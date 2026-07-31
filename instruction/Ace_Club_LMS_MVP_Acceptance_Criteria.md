# MVP Acceptance Criteria

Status: Active
Owner: Product owner
Last updated: 31 July 2026
Source artifact: [MVP Acceptance Criteria DOCX](Ace_Club_LMS_MVP_Acceptance_Criteria.docx)

**PRODUCT REQUIREMENTS**

*Student and admin journeys for the first Ace Club LMS launch*

| **Product** | Ace Club Learning Management System |
| --- | --- |
| **Version** | MVP — current agreed scope |
| **Date** | 30 July 2026 |

> **Scope decision:** The MVP uses Google Sign-In with controlled, pre-provisioned accounts, a fixed curriculum, embedded Notion pre-reads, automatically released PDF worksheets, and a manual spreadsheet-style question tracker.

## 1. Product roles and boundaries
| **Role** | **Purpose** | **MVP access** |
| --- | --- | --- |
| Admin | Runs the programme | Students, cohorts, schedules, materials and tracker visibility |
| Student | Participates in the programme | Assigned course, pre-reads, worksheets and own tracker |
| Test Admin | Staging-only test identity | Same permissions as Admin; not a separate product role |
| Test Student | Staging-only test identity | Same permissions as Student |

- Production roles are Admin and Student only.
- A Super Admin role and public Quick Access controls are outside the MVP.
- This is a first-time launch; there are no legacy or existing-student migration requirements.
- The revised curriculum is the source of truth for class titles and course sequence.
## 2. Authentication and account access
### **AC-AUTH-01 — Add a new student**
**Given:** An admin is authenticated.
**When:** The admin enters a new student’s name, email and cohort and submits the form.
**Then:** The student profile and course access are created with Student permissions for that email address; the portal does not create a shared password.
### **AC-AUTH-02 — Sign in with Google**
**Given:** An Admin or Student has a controlled, active account whose email matches their Google account.
**When:** They complete Google Sign-In.
**Then:** A portal session is established and they are redirected to the dashboard allowed by their role.
### **AC-AUTH-03 — Reject unprovisioned Google accounts**
**Given:** A Google account has not been provisioned for portal access.
**When:** It completes Google authentication.
**Then:** The portal does not grant or auto-provision course access and shows a generic access-support message.
### **AC-AUTH-04 — Role-based redirection**
**Given:** An Admin or Student completes authentication.
**When:** The session is established.
**Then:** The user reaches the dashboard allowed by their role and cannot open the other role’s protected pages.
### **AC-AUTH-05 — Manage access**
**Given:** A student exists.
**When:** The admin deactivates or reactivates the account.
**Then:** A deactivated student is blocked from portal access and a reactivated student can sign in with the approved Google account.
### **AC-AUTH-06 — Staging test accounts**
**Given:** The application is running in staging.
**When:** The team uses Google Sign-In as Test Admin or Test Student.
**Then:** Each controlled account reaches the correct journey quickly; test-only configuration, controls and credentials are absent from production.
## 3. Course structure and cohort schedule
> **Fixed-course rule:** Admins create cohorts and assign students, but do not create, rename or rearrange curriculum classes in the MVP.

### **AC-COURSE-01 — Create a cohort schedule**
**Given:** The fixed curriculum and agreed weekly schedule exist.
**When:** The admin enters a cohort start date.
**Then:** The system generates the cohort’s class weeks, dates and release dates.
### **AC-COURSE-02 — Use curriculum class titles**
**Given:** A class is generated.
**When:** It appears in an admin or student view.
**Then:** Its title and class type match the revised curriculum.
### **AC-COURSE-03 — Assign instructors automatically**
**Given:** A curriculum class has a class type.
**When:** The schedule is generated.
**Then:** DI displays Ishan, VA displays Tanya and QA displays Unnati.
### **AC-COURSE-04 — Reuse master content**
**Given:** Notion pre-reads and PDF worksheets are configured on the master course.
**When:** A new cohort is created.
**Then:** The cohort inherits those materials without duplicate uploads.
## 4. Student dashboard and course timeline
| **Placement** | **What appears there** |
| --- | --- |
| Dashboard | Continue your course, next class and a concise progress summary |
| Week 0 card | Immediately available preparation content at the top of the timeline |
| Class card | Pre-read → class information → worksheet → tracker |
| Worksheet page | PDF and spreadsheet-style tracker; side by side on desktop or tabs on mobile |

### **AC-UI-01 — Show the next action**
**Given:** A student has course access.
**When:** The dashboard loads.
**Then:** The most relevant action is displayed: start Week 0, open a pre-read, view an upcoming class, open a worksheet or continue tracking.
### **AC-UI-02 — Display material states**
**Given:** A class has associated content.
**When:** The student views the timeline.
**Then:** Each item clearly shows Available now, Upcoming, Available after class or an actionable error state.
### **AC-UI-03 — Protect unreleased content**
**Given:** A material has not reached its release time.
**When:** The student attempts to open it from the interface or a direct URL.
**Then:** Access is denied and the scheduled availability information is shown.
## 5. Notion pre-reads
### **AC-READ-01 — Render Week 0 immediately**
**Given:** A student receives course access.
**When:** The student opens the course timeline.
**Then:** Week 0 is available immediately and its Notion page renders inside the portal.
### **AC-READ-02 — Release later pre-reads**
**Given:** A later class is scheduled.
**When:** The time reaches seven days before the class.
**Then:** Its Notion pre-read becomes available automatically.
### **AC-READ-03 — Use Notion-only pre-reads**
**Given:** A pre-read is configured.
**When:** It is displayed to an admin or student.
**Then:** It is an embedded Notion page; PDF, free-text and miscellaneous external-link pre-reads are not offered.
### **AC-READ-04 — Handle rendering failure**
**Given:** A Notion page cannot be loaded.
**When:** The student opens the pre-read.
**Then:** A clear retryable error appears and the failure is visible to an admin.
## 6. Classes and worksheets
### **AC-CLASS-01 — Display class information**
**Given:** A class is scheduled.
**When:** The student views its class card.
**Then:** The card shows curriculum title, date, time, type and assigned instructor.
### **AC-WS-01 — Release a PDF after class**
**Given:** A class has an associated master PDF worksheet.
**When:** The scheduled class end time is reached.
**Then:** The worksheet becomes available automatically without admin action.
### **AC-WS-02 — View or download a worksheet**
**Given:** A worksheet has been released.
**When:** The student opens it.
**Then:** The student can view or download the unedited PDF.
### **AC-WS-03 — Keep worksheet questions fixed**
**Given:** The worksheet and question rows exist in master-course data.
**When:** A cohort inherits the worksheet.
**Then:** The PDF and its question structure cannot be edited from the cohort or student portal.
## 7. Student question tracker
| **Field** | **Rule** |
| --- | --- |
| Question | Pre-seeded from master-course worksheet data |
| Status | Student chooses Done or Come back for review |
| Time taken | Optional; consistent format such as mm:ss |
| Comment | Optional free-text reflection |
| Last updated | Automatically recorded |

### **AC-TRACK-01 — Create independent tracker records**
**Given:** A student receives course access.
**When:** The course data is provisioned.
**Then:** Separate records are created for the student, cohort, worksheet and question.
### **AC-TRACK-02 — Mark a question Done**
**Given:** A worksheet question is visible.
**When:** The student selects Done.
**Then:** The status saves and persists after refresh.
### **AC-TRACK-03 — Mark a question for review**
**Given:** A worksheet question is visible.
**When:** The student selects Come back for review.
**Then:** The status saves and is visually distinct from Done.
### **AC-TRACK-04 — Use one status at a time**
**Given:** A question already has a status.
**When:** The student chooses the other status.
**Then:** The new value replaces the old value.
### **AC-TRACK-05 — Add an optional comment**
**Given:** A student wants to record an observation or mistake.
**When:** They enter a comment.
**Then:** The comment is saved and is visible only to that student and authorised admins.
### **AC-TRACK-06 — Add optional time**
**Given:** A student wants to record solving time.
**When:** They enter a valid duration.
**Then:** The time is saved; leaving it blank does not block progress.
### **AC-TRACK-07 — Show untouched questions**
**Given:** A student has not updated a question.
**When:** The tracker loads.
**Then:** The row remains Not updated; this is a system state, not a third selectable status.
### **AC-TRACK-08 — Autosave manual input**
**Given:** A student changes status, time or comment.
**When:** The input loses focus or the save trigger runs.
**Then:** The interface confirms the save and the data remains after reopening the portal.
## 8. Admin progress visibility
### **AC-ADMIN-01 — View cohort progress**
**Given:** An admin opens a cohort.
**When:** The progress view loads.
**Then:** The admin sees each student’s Done, Come back for review, Not updated and last-update totals by worksheet.
### **AC-ADMIN-02 — View a student tracker**
**Given:** The admin opens a student and worksheet.
**When:** The tracker loads.
**Then:** The admin sees question number, status, optional time, comment and last update.
### **AC-ADMIN-03 — Calculate manual completion**
**Given:** Student-entered statuses exist.
**When:** Completion is displayed.
**Then:** Completion equals Done questions divided by total questions; Come back for review is not counted as complete.
### **AC-ADMIN-04 — Preserve privacy**
**Given:** Multiple students belong to a cohort.
**When:** A student or admin opens tracker data.
**Then:** Students can access only their own records; authorised admins can access students in their permitted scope.
## 9. Quality, security and operational requirements
- All authentication and portal traffic uses HTTPS.
- Supabase row-level security enforces Student and Admin permissions.
- Service-role credentials never appear in browser code.
- Test accounts and Quick Access controls never appear in production.
- Release rules use the programme’s agreed time zone.
- Tracker changes produce clear saving, saved and retry states.
- The portal supports current desktop and mobile browsers and keyboard navigation.
- Notion, PDF, email and tracker failures produce actionable messages rather than indefinite loading.
## 10. MVP exclusions
- Super Admin product role and dashboard
- Course-structure editor
- Notion class-dashboard links
- PDF or free-text pre-reads
- Question editing inside the portal
- Incorrect-answer classifications and automated grading
- Daily practice totals outside worksheets
- Advanced trends, alerts, filters and CSV exports
- Instructor replies to student comments
- Legacy student migration
## 11. MVP launch acceptance
1. A pre-provisioned Admin signs in with the approved Google account.
1. The Admin creates a cohort and adds first-time students.
1. Pre-provisioned Students use Google Sign-In and reach their own dashboards.
1. Week 0 is immediately available and renders correctly.
1. A later pre-read opens exactly seven days before its class.
1. A worksheet opens automatically after its class.
1. A student updates status, time and comments in the tracker.
1. An Admin sees the same saved tracker information.
1. Role, privacy and direct-URL release protections pass testing.
