# Phase 4 staging verification — 31 July 2026

Environment: Vercel Preview connected to staging `eyphkkginlgoaxflauog`  
Branch: `codex/phase-4-cohort-releases`  
Verified application commit: `aa2f13c`

## Results

- Phase 4 migration applied successfully through the staging SQL Editor.
- Vercel Preview reached `Ready` for commits `cf52c14` and `aa2f13c`.
- Disposable cohorts with Week 0 Fridays `2026-07-31` and `2026-08-07` each generated 31 sessions.
- Both cohorts reported zero date, start-time, and duration errors.
- Both cohorts inherited five configured master materials with zero master-link, later-pre-read, worksheet-release, or question-count errors.
- A disposable Week 0 master pre-read synchronized into both cohorts and released immediately.
- Repeating material sync for the first cohort left one copied probe row, proving idempotency; syncing the second cohort added its missing row.
- The controlled staging Test Student loaded the latest enrolled 31-item cohort.
- The obsolete Student `Section` column was removed.
- A future Notion pre-read direct URL returned `Material or Session not found`.
- A future worksheet file URL returned `{"error":"Material not found"}`.
- Both disposable cohorts and the temporary master pre-read were removed after verification.
- TypeScript, touched-file lint, diff validation, and Production build passed locally.

No credentials, private student data, material paths, signed URLs, or secret values are recorded here.
