# Ace Club LMS V2 — Acceptance Criteria

> Current correction — 25 October 2026: [approved course model](../decisions/course-model-correction-2026-10-25.md) controls terminology and structure. Quant, Verbal and DI are complete individual courses; Full Course contains all three. Every course retains sessions, materials, recordings, pre-session reads and post-session reads. Only actual live classes require scheduling. Phase 2 review is paused; PR #24 stays Draft.

> Authority update — 20 October 2026: [preserved approvals](../decisions/README.md) supersede conflicting older requirements. The later [expiry confirmation](../decisions/phase-1-expiry-confirmation-2026-10-20.md) confirms denial after six months. This candidate implements Phase 1 only; later-phase implementation remains separate.

Status: Draft for Product Owner review
Owner: Product owner and Engineering
Last updated: 18 October 2026

This document converts the approved V2 product direction into testable outcomes for implementation and intern handoff. It does not authorize code changes, Supabase changes, merging, or Production deployment.

## 1. Product model

### AC-V2-PRODUCT-01 — Online-first delivery

The website is the primary delivery surface. Every purchased product provides access to the relevant recordings, pre-reads, worksheets, schedule information, and other included material through the website.

### AC-V2-PRODUCT-02 — Full Course is complete

Full Course contains Quant, Verbal, and DI together. A student cannot purchase or receive Full Course entitlement for only one or two sections. Full Course cannot be assembled by buying individual courses in parts; however, a student who previously purchased one or two individual courses may later purchase and receive Full Course access.

### AC-V2-PRODUCT-03 — Individual course products

The system supports separate Quant, Verbal, and DI individual course products. Each individual course gives access only to its selected section unless another product is separately purchased.

### AC-V2-PRODUCT-04 — Different delivery schedules

Full Course and individual course schedules are independent. Full Course may run over approximately eight weeks; individual course durations are configurable and do not imply reduced content. A schedule must not be inferred solely from the product name.

### AC-V2-PRODUCT-05 — Confirmed launch pricing

The launch catalogue uses:

| Product | Price |
|---|---:|
| One individual course | ₹10,000 |
| Two individual courses | ₹18,000 |
| All three individual courses | ₹25,000 |
| Full Course — all three sections | ₹25,000 |

Pricing is stored as commercial configuration and is not hard-coded into presentation components.

The all-three individual course bundle is included as already approved in V2-DEC-03.
It grants the three separate individual course products, not Full Course entitlement.

### AC-V2-PRODUCT-06 — Six-month access

Access begins when payment is successfully confirmed and remains available for six months. The same entitlement expiry rule applies to website materials, recordings, and any live-session access associated with the product.

## 2. Registration and payment

### AC-V2-REG-01 — Self-registration

A student can select a published product, provide full name, Google email, and WhatsApp number, complete payment, and receive access without manual Admin enrollment.

### AC-V2-REG-02 — Payment verification

Access is created only after payment is verified. Failed, cancelled, duplicate, or delayed payment events produce recoverable states and do not create duplicate entitlements.

### AC-V2-REG-03 — Confirmation

After successful payment, the student receives the approved access/login instructions, purchased product, six-month expiry date, schedule guidance where applicable, and support contact.

### AC-V2-REG-04 — Product entitlement

The entitlement granted after payment matches the purchased product exactly:

- individual course: one selected section.
- Full Course: Quant, Verbal, and DI.
- Purchasing individual courses does not silently grant Full Course access.

## 3. Live delivery

### AC-V2-LIVE-01 — Optional live sessions

Live sessions are optional delivery components. Recordings and website materials remain available whether or not a student attends live.

### AC-V2-LIVE-02 — Publish live batches

An Admin can create and publish Full Course and individual course live-batch details, including product type, section(s), dates, times, Google Meet information, duration, and relevant material links.

### AC-V2-LIVE-03 — Individual course live availability

An individual course may have a published live batch or may be recording/materials-only when no live batch is available. Quant individual course always has recordings; live Quant classes may be added later by an Admin.

### AC-V2-LIVE-04 — Live capacity

Live-course registration stops at eight students. Attendance is optional. There is no per-session reservation or waitlist. Course materials and recordings remain governed by the applicable entitlement.

### AC-V2-LIVE-05 — Schedule changes

An Admin can update a published schedule, and entitled students enrolled in that batch see the current schedule. Schedule changes do not require rebuilding the product or changing student entitlements.

## 4. Recordings and materials

### AC-V2-MATERIAL-01 — Shared class structure

The same underlying class/content structure can be used in Full Course and the corresponding individual course. Access is controlled by entitlement; duplicate student-specific copies are not required.

### AC-V2-MATERIAL-02 — Recording management

An Admin can add, replace, and delete recordings or additional class videos from the Admin dashboard. Students see only recordings allowed by their product entitlement and active access period.

### AC-V2-MATERIAL-03 — Continuous pre-read access

Pre-reads are available continuously to entitled students and are not locked behind a class-specific release window.

### AC-V2-MATERIAL-04 — Video-adjacent reading

Reading material can be published in three locations:

1. At the top of the Quant, Verbal, or DI course.
2. Before a video.
3. After a video.

### AC-V2-MATERIAL-05 — Visual progress only

The student UI may show opened/read/completed progress through a color or visual state. V2 does not require hard completion analytics for pre-reads at launch.

### AC-V2-MATERIAL-06 — Notion migration

The implementation supports a gradual migration from Notion-authored material to the controlled ACE renderer. The intern must document the migration path and preserve a safe working path for content not yet migrated.

## 5. Admin publishing workflow

### AC-V2-ADMIN-01 — Product templates

The Admin can publish Full Course and individual course details using clear product-specific templates. The template makes product type, included sections, delivery mode, duration, schedule, recordings, and materials explicit.

### AC-V2-ADMIN-02 — Immediate publishing

An Admin can create, edit, preview, publish, unpublish, and replace material immediately. Scheduled publishing is out of scope for launch.

### AC-V2-ADMIN-03 — Student preview

Before publishing reading material, an Admin can open a full student-facing preview in a new tab and verify its location, content hierarchy, links, equations, media, and unsupported-content errors.

### AC-V2-ADMIN-04 — Minimal routine intervention

Ordinary paid registration, access creation, routine login instructions, material availability, and recording access do not require manual Admin action. Admins handle configuration and exceptions.

### AC-V2-ADMIN-05 — Existing MVP students

Existing MVP students may receive V2 access mapped to the topic/course they are already enrolled in. Any migration must be explicit, reviewable, and must not remove existing access accidentally.

## 6. Security and quality

### AC-V2-SEC-01 — Access boundaries

Unauthenticated, inactive, or incorrectly entitled users cannot access protected recordings, pre-reads, worksheets, or live-session links.

### AC-V2-SEC-02 — Product isolation

An individual course student cannot access another section or Full Course-only material unless an approved entitlement grants it.

### AC-V2-SEC-03 — Environment safety

All development and verification occurs against local or staging environments first. No student/course data, Supabase schema, Production deployment, or Production access rule changes occur without explicit approval.

### AC-V2-SEC-04 — Evidence

Each completed phase includes the relevant tests, Preview evidence, screenshots or recordings where useful, authorization checks, and a handoff entry stating the exact branch and commit.

## 7. Launch gate

V2 is ready for Product Owner staging review only when:

- Full Course and all three individual courses can be configured and published.
- Pricing and entitlement boundaries pass.
- Payment-to-access flow passes with failure/retry coverage.
- Recordings and pre-reads work through the website.
- Full Course and individual course schedules remain independent.
- Admin preview and immediate publishing work.
- Access expiry and protected-resource checks pass.
- No critical security, privacy, or data-integrity issue remains open.

## Product Owner review

Comments:

Decision: Draft / Approved with changes / Approved

Name: ____________________  
Date: ____________________
