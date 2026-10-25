# Phase 1 access expiry confirmation

Status: Active
Owner: Product owner and Engineering
Last updated: 20 October 2026

## Confirmed scope

The subsequent task instruction confirms that V2 purchased access is revoked
after six months and directs Phase 1 to be completed separately from Phase 2.
This resolves the access-removal ambiguity between B4 and F in the
[preserved decision source](owner-decisions-2026-10-20.md).
The original source remains unchanged.

Expiry denies use of the expired entitlement. It does not delete the account,
purchase, payment history or grant records. Another independently valid purchase
may still provide access to the same product. Existing MVP access is not given a
new expiry or migrated automatically.

## Implementation convention

The existing implementation uses six calendar months from verified payment,
calculated in UTC, with month-end clamping. Access is valid at the payment
timestamp and denied at the expiry timestamp. For example, 31 August 2026 at
10:00 UTC expires on 28 February 2027 at 10:00 UTC.

These timestamp details are the retained engineering convention, covered by
boundary/leap-year tests and subject to ordinary staging review. The latest
confirmation resolves the six-month denial rule; it is not a separate approval
of every timestamp example or an operational release authorization.

Authorization checks use database time on every call. No scheduled deletion or
cleanup job is required to deny an expired entitlement. Later V2 content and
schedule readers must invoke this guard at the point of protected access.

## Unchanged boundaries

- Reminder timing and expiry notification UI remain Pending and outside the
  Phase 1 entitlement foundation.
- Upgrade credits, expiry after upgrades and payment fulfillment remain later
  payment-phase work; no automatic extension or credit rule is inferred.
- Phase 2 publishing, Student batch selection and content associations remain
  on their separate branch.
- The instruction does not authorize a shared migration, Production change or
  modification of existing student/course data.
- Staging verification and product acceptance remain required.

Current evidence and remaining operator actions:
[Phase 1 completion report](../phase-1/completion-report.md).
