# Phase 5 staging Session-resource lifecycle evidence — 2026-08-13

## Scope

- Branch: `codex/pilot-v1`
- Tested application commit: `538fa86`
- Environment: immutable Vercel Preview backed by the staging Supabase project
- Production: untouched
- Fixture: a one-page, sanitized PDF stating that it contained no Student or Production data
- Accounts: approved staging Admin and enrolled staging Student

This record contains no account identifiers, private object paths, signed URLs, authentication artifacts, or Student data.

## Preconditions

- The Vercel GitHub deployment for application commit `538fa86` completed successfully.
- The ordered Session-material migration remained applied to staging only.
- The selected Student was enrolled in the selected staging batch.
- One completed published session and one future published session in that batch were used so released and locked states could both be observed without changing session timing.

## Results

| Check | Result |
|---|---|
| Admin creates a titled private PDF beside recordings | Pass |
| Admin renames the saved material | Pass |
| Admin selects and saves a replacement PDF | Pass |
| Future-session Student card is visible with the correct after-class date and no open action | Pass |
| Direct access to the future material stays on an Upcoming material state and exposes no PDF link | Pass |
| Released material appears under Recommended reading independently from Recommended practice | Pass |
| Released material appears in This week, Timeline, Browse by section and the curriculum-item journey where applicable | Pass |
| Curriculum-item order is Recording, Session reading, Worksheet | Pass |
| Enrolled Student opens the released PDF through the protected viewer | Pass |
| Protected viewer renders the sanitized PDF successfully | Pass |
| Admin removal requires explicit confirmation | Pass |
| Removed materials disappear from Admin and Student surfaces | Pass |
| Recommended reading returns to its empty state after cleanup | Pass |
| Browser console errors during the lifecycle | None |

## Cleanup and residue check

- Both temporary Session-material rows were removed through the Admin confirmation flow.
- A read-only staging query returned zero matching fixture rows.
- A read-only staging storage query returned zero objects under the two temporary session prefixes, including the replaced object.
- The Student dashboard was reloaded after removal and contained neither temporary title.
- The local temporary PDF and rendered inspection image were removed after evidence was recorded.

## Conclusion

The fixture-dependent Phase 5 Admin and Student lifecycle passes on the immutable staging-backed Preview. Together with the committed recommendation/path fixtures, responsive and accessibility review, targeted lint, TypeScript and Production build results, all Phase 5 exit criteria are satisfied. Phase 5 can transfer to Phase 6 integrated verification; this evidence does not authorize Production promotion.
