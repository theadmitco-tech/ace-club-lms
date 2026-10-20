# Ace Club LMS V2 — Decisions for Approval

**Status:** Draft for owner review
**Owner:** Product owner
**Implementation owner:** Intern, after approval
**Last updated:** 20 October 2026

## How to use this document

Please edit the **Owner decision** cells directly, or add comments below each decision. The intern should not implement a decision marked **Pending**. Once approved, update the status to **Approved** and add the approval date.

This document is the approval source for V2 business and product decisions. If it conflicts with an older planning document, this document takes precedence after approval.

---

## A. Batch publishing and schedule

### A1. What must an Admin provide before publishing a batch?

There are two types of offerings:

1. **Full Batch** — normally an 8-week programme. Registration requires all three courses: Quant, Verbal, and DI.
2. **Standalone Course** — a student may register for Quant, Verbal, or DI individually. Upgrades apply only to standalone-course purchases.

**Proposed rule:** An Admin can publish the broad course outline without entering dates for every item. Regular classes, mock review calls, and break days may remain as unscheduled outline items or blank placeholders. Only live sessions that require attendance need exact scheduling.

For each scheduled live session, the Admin should review:

- Exact date of every session
- Session day and time
- Session topic/content
- Google Meet or live-session details, when available

| Owner decision | Status |
|---|---|
| Approve proposed rule / edit it here: | **Approved with live-session scheduling only** |
| Approval date: | |
| Owner comments: | Full Batch requires Quant + Verbal + DI. Non-live outline items do not need dates; live sessions do. |

### A2. Schedule changes after publication

**Proposed rule:** Admins can edit a published live-session schedule. Students see the updated schedule. WhatsApp messaging is out of scope for now.

| Owner decision | Status |
|---|---|
| Approve proposed rule / edit it here: | **Approved** |
| Approval date: | |
| Owner comments: | WhatsApp feature removed from the current scope. |

---

## B. Registration and course access

### B1. Courses

The catalogue has four offering types built from three courses:

- Quant
- Verbal
- DI
- Full Course (Quant + Verbal + DI)

CR and RC are topics within Verbal, not separate courses or products.

| Owner decision | Status |
|---|---|
| Confirm this course structure: | **Approved** |
| Approval date: | |
| Owner comments: | The product has standalone Quant, Verbal, and DI offerings, plus Full Course. |


### B2. Registration catalogue

**Proposed rule:** Before registering, a student can see all published batches and the courses included in each batch. Only published batches are eligible for registration.

| Owner decision | Status |
|---|---|
| Approve proposed rule / edit it here: | **Pending** |
| Approval date: | |

### B3. Pricing and upgrades

Current pricing:

- One course: ₹10,000
- Two courses: ₹18,000
- Three courses: ₹25,000

**Proposed rule:** If a student upgrades between standalone-course packages, the amount due is the difference between the existing package and the new package. For example, one course to two courses costs ₹8,000 more. These prices apply to standalone-course packages; Full Course is a separate offering.

| Owner decision | Status |
|---|---|
| Approve difference-based upgrade pricing: | **Approved** |
| Approval date: | |

### B4. Access duration

**Proposed rule:** Access begins at successful payment and lasts six months. This applies to the purchased course entitlement or package.

| Owner decision | Status |
|---|---|
| Approve six months from payment: | **Approved / edit if required** |
| Approval date: | |

### B5. Meaning of “other courses become available”

**Approved decision:** After enrolling in one standalone course, other courses are visible as upgrade/purchase options. They do not become accessible without payment.

| Owner decision | Status |
|---|---|
| Decision: | **Approved** |
| Notes: | |
| Approval date:  | |

---

## C. Live-course registration capacity

### C1. Course registration limit

**Approved rule:** Live-course registration stops once 8 students have signed up for that live course. This is a course-level registration limit, not a per-session reservation system. There is no waitlist in the current scope.

| Owner decision | Status |
|---|---|
| Approve 8-student live-course registration limit and no waitlist: | **Approved** |
| Approval date: | |

### C2. Access after registration

Once registered, the student retains access to the course material and recordings according to the applicable six-month entitlement. Live attendance is optional; there is no separate session reservation or cancellation workflow in the current scope.

---

## D. Content publishing workflow

### D1. Fully customizable session material

Each course—Quant, Verbal, and DI—contains sessions. The initial session material should be migrated directly from the current course structure. After migration, every session must support Admin-customizable content for:

- Session heading/title
- Session material
- Session recording
- Pre-session reading
- Post-session reading

Admins must be able to create, edit, replace, reorder, preview, publish, and unpublish each of these items independently. The system must not assume a fixed session layout or require the same content type for every session. Migration should preserve the current material before any V2 customization is applied.

Admins must also be able to publish content universally where required—for example, across all applicable courses, all sessions in a course, or all relevant student views—without manually recreating the same item for each session. The Admin must see the publishing scope before confirming publication.

| Owner decision | Status |
|---|---|
| Approve fully customizable session headings, material, recordings, pre-reads, and post-reads: | **Approved** |
| Approve migration from the current course structure as the initial content source: | **Approved** |
| Approve Admin-controlled universal publishing: | **Approved** |
| Approval date: | |

### D2. Publishing locations

The Admin must be able to publish reading material in five locations:

1. Before the course area begins
2. At the top of the Quant, Verbal, or DI course area
3. Before a video
4. After a video
5. After the course area ends

**Proposed rule:** Admins can create, preview, edit, publish immediately, unpublish, and reorder reading material. There is no scheduled publishing requirement. Pre-read completion is shown visually through colour/state changes and is not hard-tracked as an assessment.

| Owner decision | Status |
|---|---|
| Approve the five publishing locations: | **Approved** |
| Approve immediate publish + preview: | **Approved / edit if required** |
| Approve visual-only completion state: | **Approved / edit if required** |
| Approval date: | |

### D3. Notion and rendering

**Decision required:** Should Notion remain the authoring source, or should the Admin dashboard use an LMS-native editor with optional Notion import?

| Owner decision | Status |
|---|---|
| Decision: | **Notion for now** |
| Notes on preferred authoring workflow:  | |
| Approval date: | |

---

## E. Recordings and live classes

There will be one recording set per session. Students may:

- Attend live
- Watch the recording
- Mix live attendance and recordings

The live schedule will be published in advance. Live classes will use Google Meet. The intern will recommend the recording storage and hosting approach.

| Owner decision | Status |
|---|---|
| Approve one recording set with live/recording choice: | **Approved / edit if required** |
| Approval date: | |

---

## F. Expiry and notifications

**Proposed rule:** Access expires six months after payment. The system sends reminders 30 days and 15 days before expiry, then shows an expiry notification and removes access to protected course material.

Payment and enrolment history remain preserved. Admin can extend access manually.

| Owner decision | Status |
|---|---|
| Choose reminder timing: 30 days + 15 days / 30 days only / 15 days only / other: | **Pending** |
| Approve expiry notification and access removal: | **Pending** |
| Approval date: | |

---

## G. WhatsApp workflow

**Current scope decision:** WhatsApp groups, WhatsApp message generation, and automated WhatsApp sending are out of scope for the current V2 implementation. Schedule changes will be visible in the LMS. WhatsApp can be reconsidered in a later phase.

| Owner decision | Status |
|---|---|
| Approve removing WhatsApp from current scope: | **Approved** |
| Future phase notes: | |
| Approval date: | |

---

## H. Technical release decisions

### H1. Branch and merge path

PR #23 is based on `codex/v2-integration`, not directly on the current `main`. The safe path is:

1. Inspect the difference between the integration branch and `main`.
2. Confirm the intended V2 baseline.
3. Reconcile PR #23 onto that baseline.
4. Test in Vercel Preview against staging Supabase.
5. Apply migrations to staging only after review.
6. Obtain separate approval before any Production merge or migration.

| Owner decision | Status |
|---|---|
| Approve this release path: | **Pending** |
| Approval date: | |

### H2. Database migration policy

The staging migration ledger currently ends at `20260925100000`. The proposed V2 migrations are not recorded there yet. No V2 migration should be applied to staging or Production until:

- The baseline is confirmed
- Migration order is reviewed
- A staging backup/rollback plan exists
- Preview testing is complete

| Owner decision | Status |
|---|---|
| Approve this migration gate: | **Pending** |
| Approval date: | |

---

## Final owner sign-off

Before the intern begins implementation, complete all rows marked **Pending** that affect Phase 1. Decisions that are intentionally deferred should be marked **Deferred**, with a target phase.

**Owner:**
**Decision date:**
**Approved implementation scope:**
**Deferred items:**
**Additional notes:**
