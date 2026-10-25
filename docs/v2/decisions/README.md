# V2 approved decisions and reporting register

Status: Active
Owner: Product owner and Engineering
Last updated: 20 October 2026

First apply the [25 October course-model correction](course-model-correction-2026-10-25.md). Phase 2 review is paused; complete individual courses replace compressed-course assumptions.

The [Phase 1 stored-contract audit and separate proposal](../phase-1/proposals/README.md)
and [journey-aligned content transfer plan](../phase-2/content-transfer-plan.md)
record the subsequent 25 October clarification. Neither authorizes shared writes.

Then read the [supplied decision record](owner-decisions-2026-10-20.md).
The approved rows supersede conflicting older V2 planning requirements. Pending
and Deferred rows do not authorize dependent implementation. The source's Draft
heading, qualified approval wording and blank dates are preserved.
The later [Phase 1 expiry confirmation](phase-1-expiry-confirmation-2026-10-20.md)
resolves six-month access removal and requires separate Phase 1 delivery.

## Provenance and preservation

- Received source: `V2-decisions-for-approval.md`, dated 20 October 2026.
- Original SHA-256: `74eb7249ae61d5c44c5f579857e9af0ade6a68678df27e882f2988f0e93c4703`.
- Repository copy SHA-256: `89715a7c204eba9a972cf6ea46747ae26c28da7502dc525435a311d4dfc421f9`.
- Transcription replaces the personal owner name with `Product owner` and
  normalizes trailing whitespace. No decision, status, date or comment was changed.
- The original remains outside the repository. The repository copy contains
  product requirements only, without credentials, account addresses or student
  records. Git history preserves this checkpoint; later decisions require a new
  dated record rather than rewriting this source.
- Local version control is not an off-device backup or encryption. Publishing
  these records remains part of the reviewed branch/PR workflow.

## Accompanying delivery requirements

The accompanying message, adopted for this work, requires:

1. Implement only Approved items; obtain confirmation for Pending or Deferred
   items. Follow the roadmap phase by phase.
2. Work on task branches and prepare draft PRs. No merge to `main`, shared
   Supabase migration, Production change, or student/course-data modification
   is authorized.
3. Preserve and migrate existing session material before enabling customization
   of headings, materials, recordings, pre-reads and post-reads.
4. Support universal content publication with an explicit scope preview.
5. For every phase, maintain documentation, changed-file lists, reproducible
   test steps and actual results, risks, and the next required product decision.

Product approval of a migration feature does not authorize running it on existing
data. The migration tooling and synthetic tests can be prepared locally.

## Reconciliation

| Source | Current interpretation | Superseded or still unresolved |
|---|---|---|
| A1/A2 | Publish broad outlines; schedule live sessions precisely; published edits require review | Non-live placeholders need no invented dates. Required recordings/Meet links must not be inferred as universal publication blockers |
| B1 | Quant, Verbal and DI; CR/RC belong to Verbal; Full Course contains all three | Keep stable product IDs; no automatic conversion of legacy content |
| B3/B5 | Standalone upgrades charge package-price difference; other courses remain purchase options | Upgrade credit eligibility, expired/refunded purchases and upgrade expiry are unspecified. No automatic grants from a price calculation |
| B4/F | Subsequent instruction confirms denial after six months; source preserved unchanged | Calendar-month UTC convention retained and tested. Notifications remain Pending. Existing MVP access remains unchanged; hosted migration is not authorized |
| C1/C2 | Eight registrations per live course; optional attendance; no per-session reservations/cancellations or waitlist | Replace older LIVE-04 reservation plans. Full Course capacity across constituent courses and concurrent payment allocation need a contract |
| D1/D2 | Preserve current content first; independent item management; scope preview; five reading placements | Universal publication never bypasses product authorization. Existing-data operations remain separately gated |
| D3/E | Source says “Notion for now”; Google Meet live delivery; one recording set per session | No native-editor replacement or hosting-account setup follows from this record |
| G | No WhatsApp groups, generation or sending in current V2 scope | Supersedes older schedule-change messaging requirements |
| B2/H1/H2 | Registration catalogue and release/migration path are Pending | No public batch catalogue or shared release operation authorized |

## Open decisions before full acceptance

1. Six-month access denial is now confirmed for Phase 1. Notifications and
   upgrade access periods remain later-phase decisions, not blockers to reviewing
   the initial-purchase entitlement foundation.
2. Resolved on 25 October: Students see only their enrolled batch, subject to
   active product entitlement. See [enrolled-batch access](enrolled-batch-access-2026-10-25.md).
   Public registration B2 remains Pending.
3. Define the registration unit for Full Course's three components and payment
   concurrency at the eight-student limit.
4. Confirm the accepted code baseline and exact staging setup/release sequence.
   The source reports a ledger ending at `20260925100000`; that is supplied
   evidence, not an independently inspected database.

## Reporting entry point

Use the [Phase 1 completion report](../phase-1/completion-report.md)
for this isolated branch, implementation evidence, remaining gates and next action.
Phase 2 remains on `intern/v2-approved-phase-1-2` at `208ceaa`; no Phase 2 code
or migration is included in the Phase 1 candidate.
Historical evidence remains unchanged. New local checks never retroactively
approve a previous PR or establish staging results.
