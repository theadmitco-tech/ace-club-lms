# Ace Club LMS V2 — Product and Business Decisions

> Authority update — 20 October 2026: [preserved approvals](../decisions/README.md) supersede conflicting older requirements. The later [expiry confirmation](../decisions/phase-1-expiry-confirmation-2026-10-20.md) confirms denial after six months. This candidate implements Phase 1 only; later-phase implementation remains separate.

Status: Draft for Product Owner review
Owner: Product owner and Engineering
Last updated: 2 October 2026

## How to review this document

Please add comments directly beneath the relevant decision, or replace the blank **Decision** field. Use:

- `Approved` when the recommendation is correct.
- `Approved with changes` when the intent is right but wording or rules need adjustment.
- `Needs discussion` when the options require a conversation.
- `Deferred` when the decision is intentionally postponed.

This document is not implementation authorization. It defines product and business decisions for the later roadmap and acceptance criteria.

---

## A. Product model

### V2-DEC-01 — Primary mode of delivery

**Proposed decision:** V2 is online-first. Every offer provides website access to recordings, pre-reads, worksheets, and other included material. Live participation is an optional layer where live classes are configured.

**Why this matters:** Students should be able to learn through the website even when they do not attend a live class.

**Decision:** Approved

**Owner notes:** 

### V2-DEC-02 — Product types and offers

**Proposed decision:** V2 has two product types:

1. **Full Batch:** Quant + Verbal + DI together.
2. **Crash Course:** Quant, Verbal, or DI selected individually.

Crash Courses are delivered in approximately one week and may include live classes. Recordings are always available. A Crash Course must be publishable as a live batch when live delivery is offered; if there is no upcoming live Crash Course batch, an entitled student can use the recordings and website materials.

Quant, Verbal, and DI Crash Courses follow the same product model: topic access is sold separately, live delivery is published when available, and recordings remain available regardless of live attendance.

**Decision:** Approved

**Owner notes:** Full Batch is spread across approximately eight weeks. Exact schedules will be provided separately.

### V2-DEC-03 — Product pricing

**Proposed decision:** Replace the previous seven-combination pricing model with separate prices for Full Batch and each Crash Course.

Prices should be stored as versioned commercial configuration, not hard-coded into UI components.

**Decision:** Approved — launch pricing is confirmed below.

| Product | Price |
|---|---:|
| Full Batch — Quant + Verbal + DI | ₹25,000 |
| Any one Crash Course | ₹10,000  |
| Any two Crash Courses | ₹18,000 |
| All three Crash Courses | ₹25,000 |

**Owner notes:** Full Batch is ₹25,000; one Crash Course is ₹10,000; two Crash Courses are ₹18,000; all three sections are ₹25,000.

### V2-DEC-04 — Access duration

**Proposed decision:** Access lasts six months from successful payment or entitlement activation, with one clearly defined start timestamp used everywhere.

**Decision needed:** Choose the access start rule:

- [x] Payment confirmation time.
- [ ] First login time.
- [ ] Course start date.
- [ ] Other: ____________________

**Decision:** Approved — access begins when payment is successfully confirmed.

**Owner notes:**

### V2-DEC-05 — Upgrades

**Proposed decision:** Crash Courses are sold independently by section. Full Batch is a complete product containing Quant, Verbal, and DI together; it cannot be assembled or purchased in parts. Buying one or more Crash Courses does not automatically create Full Batch entitlement or Full Batch live-schedule access.

**Decision:** Approved — Full Batch must be purchased as a complete product. No part-by-part Full Batch upgrade is included at launch.

**Owner notes:** Sections describe the content structure. They do not mean that the Full Batch product can be bought in parts. Full Batch and Crash Course live-delivery schedules may differ.

### V2-DEC-06 — Downgrades, refunds, and cancellations

**Recommended default:** No downgrade after purchase; refunds and cancellations follow a manually approved policy until a formal policy is supplied.

**Decision:** Approved — retain the proposed manual refund/cancellation policy for launch.

**Owner notes:**

---

## B. Live classes and schedule

### V2-DEC-07 — Live-class role and capacity

**Proposed decision:** Live classes are optional and Admin-configurable. The LMS publishes the schedule and Google Meet details, but website access does not depend on attendance.

**Decision:** Approved — live attendance is optional, but students reserve a live seat separately from their ongoing website access.

**Owner notes:** The live session has eight seats. Once eight students reserve seats, additional students join a waitlist of up to four people. A student who reserves a seat but does not attend keeps full website access; the reservation only governs live-session capacity and Google Meet link sharing. Admins can change the live capacity and waitlist limit later.

**Decision:** Waitlist implementation is deferred. Keep the eight-seat live-session rule as a product constraint, but do not include waitlist development in the first launch unless separately approved.

### V2-DEC-08 — Schedule changes

**Proposed decision:** Admins can publish schedule updates once, and all entitled students see the current schedule. The system does not need attendance rescheduling workflows.

**Decision needed:** Should students receive schedule-change notifications?

- [ ] Yes, by email.
- [ x] Yes, by WhatsApp or another channel.
- [ ] No; the website is the source of truth.
- [ ] Other: ____________________

**Decision:** Approved — schedule changes are communicated through WhatsApp or another Admin-selected channel.

**Owner notes:**

### V2-DEC-09 — Full Batch and Crash Course templates

**Proposed decision:** Admins can publish Full Batch and Crash Course batch details from separate templates. Weekly and two-month templates remain available, while Admins may configure other durations where needed.

The template must make the product type, included topics, delivery mode, live sessions, schedule, recordings, and website materials explicit.

**Decision:** Approved — provide an approximately eight-week Full Batch template and an approximately one-week Crash Course template; allow Admins to configure other durations where needed.

**Owner notes:** Full Batch is approximately eight weeks. Crash Courses are approximately one week. The detailed schedule will be supplied separately.

---

## C. Registration and payment

### V2-DEC-10 — Registration experience

**Proposed decision:** A student selects a package on the website, submits required details, pays online, and receives access automatically without Admin enrollment.

**Decision needed:** Required registration fields:

- Full name
- Email
- Phone/WhatsApp
- Consent
- Target exam date, if still required: Yes / No
- Other: ____________________

**Decision:** Approved — collect only full name, Google email, and WhatsApp number at launch.

**Owner notes:**

### V2-DEC-11 — Payment provider

**Recommended approach:** Compare Razorpay with lower-cost alternatives using total fees, credit-card support, Indian payment methods, refunds, webhooks, reconciliation, and implementation effort. Keep the provider replaceable behind a payment interface.

**Decision:** Approved — payment-provider comparison and recommendation are delegated to the intern.

**Owner notes:**

### V2-DEC-12 — Access after payment failure or delay

**Proposed decision:** Access is granted only after verified payment. A delayed webhook or interrupted checkout creates a recoverable pending state rather than requiring a new registration.

**Decision:** Approved

**Owner notes:**

### V2-DEC-13 — Registration communications

**Decision needed:** What must be sent automatically after successful payment?

- [ ] Payment receipt.
- [ ] LMS login/access instructions.
- [ ] Package and six-month expiry date.
- [ ] Live schedule and Google Meet guidance.
- [ ] Support contact.
- [ ] Other: ____________________

**Decision:** Approved

**Owner notes:**

---

## D. Recordings and materials

### V2-DEC-14 — Recordings by product type

**Proposed decision:** Recordings are mandatory for every product. A Full Batch has one shared recording set covering Quant, Verbal, and DI. Each Crash Course has its own topic recording set. Students can attend live, watch recordings, or mix both.

Recordings are not duplicated per student or attendance mode.

**Decision:** Approved, subject to the product/pricing decisions above.

**Owner notes:** the structure of full classes and topic-wise classes is the same. At its core every class is the same. If I have Quant 1, Quant 2, Quant 3, Quant 4, Quant 5, and Quant 6, the same will be delivered across the full batch and the crash course. The difference is that we can give access separately.  the recording for full batch QA1 will be the same for crash course QA1 Verbal. Similarly for Verbal for DI. A class is a unit. You can think of it in those terms. It's the basic unit and pre-read, etc., will be around that 

### V2-DEC-15 — Recording hosting

**Proposed decision:** Leave the hosting implementation to the intern within an approved evaluation brief.

**Minimum requirements:**

- Authenticated student access.
- Topic/package entitlement enforcement.
- Six-month access enforcement.
- Reliable playback on current desktop and mobile browsers.
- Reasonable storage and bandwidth cost.
- Admin upload or publishing workflow.
- No repeated manual private-link management.
- Clear replacement and takedown process.

**Decision:** Approved — the Admin must also be able to upload additional videos/class recordings and delete or replace recordings.

**Owner notes:** There should also be an option to upload additional video/class. Delete video from admin side. 

### V2-DEC-16 — Material availability

**Proposed decision:** Recordings and pre-reads are available continuously to entitled students. The website may still show the published schedule and identify upcoming live sessions, but students do not need to wait for a class-specific release window to access online material.

**Decision needed:** Should pre-reads be available:

- [ ] A fixed number of days before each live class.
- [x] Immediately when the student purchases access.
- [ ] According to a separate self-paced release plan.
- [ ] Other: ____________________

**Decision:** Approved — pre-reads are available continuously whenever the student has access; they do not need to wait for a class-specific release window.

**Owner notes:**

### V2-DEC-17 — Pre-read authoring and rendering

**Recommended direction:** Keep Notion as the authoring source, but render student-facing pre-reads through a controlled frontend. Preserve explicit structure, headings, equations, callouts, toggles, activities, accessibility, loading states, and unsupported-content diagnostics. Do not expose raw Notion pages as the primary experience.

**Decision:** Approved — migrate gradually from Notion to the controlled ACE renderer. The intern will propose a small launch process that supports both the current Notion path and the new renderer during migration.

**Owner notes:**

### V2-DEC-18 — Pre-read completion

**Decision needed:** Does V2 need to record that a student has opened or completed a pre-read?

- [ ] No; access only.
- [x] Show a visual opened/read/completed state only; do not store hard completion analytics for launch.
- [ ] Record activity progress and answers.
- [ ] Other: ____________________

**Decision:** Approved — track pre-read progress visually through a color/state change only; no hard completion tracking is required for launch.

**Owner notes:**

### V2-DEC-19 — Video-adjacent reading material

**Proposed decision:** V2 supports reading material in three publication placements for each topic course:

1. Topic-level material at the top of the Quant, Verbal, or DI course.
2. Material published before a video.
3. Material published after a video.

The material may be published independently of live attendance. A student with access to the relevant topic sees the current published version in the appropriate location.

**Decision:** Approved

**Owner notes:** one more reading material place before the start of the course at the top of qa, va, di. 

### V2-DEC-20 — Admin publishing workflow

**Proposed decision:** An Admin can create, edit, preview, publish, unpublish, and replace reading material from the Admin dashboard without code changes or direct database work.

The workflow should make the following explicit:

- Topic/course placement.
- Before-video or after-video placement, where applicable.
- Display title and optional description.
- Notion source page.
- Publication state.
- Publish date/time, if scheduled publication is supported.
- Current version and last updated time.

**Decision needed:** Should the first release support scheduled publication, or only an immediate Publish action?

- [x] Immediate publish/unpublish only.
- [ ] Immediate and scheduled publication.
- [ ] Other: ____________________

**Decision:** Approved — immediate publish/unpublish only; scheduled publishing is out of scope for launch.

**Owner notes:**

### V2-DEC-21 — Notion publishing model

**Recommended direction:** Notion remains the authoring source, while the LMS fetches or syncs the authored content into a controlled student-facing renderer. Admins should not need to expose raw Notion pages to students.

The implementation should preserve the Maths Simplified principles:

- Explicit heading and section structure.
- Reliable equations, callouts, images, toggles, and links.
- Unsupported-content diagnostics rather than guessed interactions.
- Student-facing ACE styling rather than raw Notion styling.
- Loading, empty, error, retry, and preview states.

**Decision:** Approved

**Owner notes:**

### V2-DEC-22 — Admin preview

**Proposed decision:** Before publishing, an Admin can preview the reading material in the same layout used by students and confirm its placement relative to the topic or video.

The preview should show:

- Topic/course location.
- Before/after-video position.
- Title and content hierarchy.
- Links, equations, images, and interactive/reveal elements.
- Unsupported or failed blocks.
- Student access state where relevant.

**Decision needed:** Should Preview be:

- [ ] A side-by-side Admin preview.
- [x] A full student-view preview in a new tab.
- [ ] Both.
- [ ] Other: ____________________

**Decision:** Approved — use a full student-view preview in a new tab before publishing.

**Owner notes:**

### V2-DEC-23 — Layout and visual design

**Proposed decision:** The implementation/design owner may recommend the exact layout, navigation, spacing, and visual treatment, provided the three placements remain clear and students can distinguish topic-level, pre-video, and post-video reading.

The recommendation must include desktop/mobile layouts, empty states, unpublished states, content errors, and accessibility considerations for Product Owner review before implementation is finalized.

**Decision:** Approved — delivery is web-only for launch. Detailed layout and visual treatment are implementation decisions, subject to the existing placement, accessibility, and visual-progress requirements.

**Owner notes:**

---

## E. Admin and operational boundaries

### V2-DEC-24 — Minimal Admin intervention

**Proposed decision:** Admins configure products, schedules, content, and exceptions. They should not manually enroll ordinary paid students, send routine access instructions, or manage individual recording links.

**Decision:** Approved

**Owner notes:**

### V2-DEC-25 — Admin exception queue

**Recommended default:** Provide a small operational view for payment, registration, access, and content exceptions. The Admin sees the current state and a safe next action, rather than editing raw records.

**Decision:** Approved

**Owner notes:**

### V2-DEC-26 — Existing MVP students

**Decision needed:** How should existing MVP students be treated?

- [ ] Leave them on the MVP model; V2 applies to new purchases only.
- [ ] Migrate selected students manually.
- [ ] Migrate all students with an approved entitlement mapping.
- [ ] Other: ____________________

**Decision:** Approved — existing MVP students receive V2 access mapped to the topic/course they are already enrolled in.

**Owner notes:**

---

## F. Launch and approval boundary

### V2-DEC-27 — First launch scope

**Recommended default:** Launch the complete online-first purchase/access foundation for Full Batch plus the three Crash Courses. Defer advanced analytics, attendance tracking, automated grading, and complex content authoring until the core flow is stable.

**Decision:** Approved

**Owner notes:** approved 

### V2-DEC-28 — Product Owner approval gates

**Proposed decision:** The intern may implement on branches and verify in local/Preview/Staging. Product Owner approval is required before:

- changing product rules or prices;
- applying Supabase migrations;
- changing existing student/course data;
- merging to `main`;
- deploying to Production; or
- changing the approved scope.

**Decision:** Approved

**Owner notes:**

---

## Review summary

Please refer to the comments above

### Approved

- [ ] All decisions above reviewed.

### Decisions requiring follow-up

- [ ] Intern commits to a recording-hosting approach within the approved requirements.
- [ ] Intern commits to a gradual Notion-to-ACE migration launch process.

### Product Owner sign-off

Name: ____________________  
Date: ____________________  
Status: Draft / Approved with changes / Approved

Comments:
