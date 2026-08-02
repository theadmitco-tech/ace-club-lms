# Ace Club LMS — Document Conventions

Status: Active
Owner: Product owner and Engineering
Last updated: 1 August 2026

## 1. Objectives

Documentation must:

- identify the authoritative source quickly;
- preserve accepted work and evidence;
- separate product intent from implementation detail;
- support incremental continuation without rebuilding context;
- remain safe to commit;
- minimize duplicated explanation and token use.

## 2. Information architecture

```text
instruction/
  README.md                         Authority register and reading paths
  *.md                              Binding product requirements/roadmaps

docs/
  README.md                         Documentation router
  handoffs/                         Running cross-phase continuity
  governance/                       Documentation and delivery conventions
  development/                      Living engineering rules
  setup/                            Local and environment setup
  decisions/                        Approved decision records
  features/<feature-name>/          Multi-file feature references
  phase-N/
    README.md                       Current phase status and exit gate
    manual-verification-checklist.md
    evidence/                       Dated, immutable outputs
```

Do not move grandfathered feature guides merely for visual consistency. Move files only when the benefit outweighs broken links and Git churn.

## 3. Document types

| Type | Location | Behaviour |
|---|---|---|
| Product requirement | `instruction/*.md` | Binding; product-owner approval required |
| Roadmap | `instruction/*.md` | Binding phase definitions and gates |
| Running handoff | `docs/handoffs/` | Append signed phase sections; latest section is current |
| Signed checkpoint | `instruction/` or `docs/phase-N/` | Preserve accepted facts; amend transparently |
| Living rule/guide | `docs/development/`, `docs/setup/`, or `docs/governance/` | Update in place as the current method changes |
| Phase status | `docs/phase-N/README.md` | Update in place until sign-off |
| Checklist | `docs/phase-N/` | Track pass/fail/pending with evidence |
| Evidence | `docs/phase-N/evidence/` | Dated and immutable; add, do not overwrite |
| Decision record | `docs/decisions/` | Immutable after acceptance; supersede with a new record |
| Feature reference | `docs/features/` or grandfathered `docs/*.md` | Explain stable feature operation |

## 4. Naming

For new files:

- Use lowercase kebab-case: `release-boundary-tests.md`.
- Use `README.md` only as the index/status entry point for a folder.
- Use `phase-N` for approved roadmap phases.
- Use dated evidence: `production-supabase-inventory-2026-07-31.json`.
- Use decision records: `adr-0001-private-worksheet-storage.md`.
- Keep extensions accurate: `.md`, `.sql`, `.json`, `.csv`.

The MVP acceptance criteria and product roadmap use Markdown only. Do not maintain binary duplicates of these product authorities.

Do not introduce Phase 1.5 or another phase label without a documented, approved scope and exit gate.

## 5. Required document header

New Markdown governance, setup, development, and index documents begin with:

```text
# Title

Status: Draft | Active | Signed off | Superseded | Archived
Owner: Product owner | Engineering | QA | named role
Last updated: DD Month YYYY
```

Add `Supersedes:` or `Superseded by:` when applicable.

Evidence files do not need this header; their filename and containing phase provide context.

## 6. Status lifecycle

- **Draft:** being prepared; not authoritative.
- **Active:** current guidance or requirement.
- **Signed off:** accepted checkpoint; preserve history.
- **Superseded:** retained for history but no longer current.
- **Archived:** no longer operationally relevant.

Never silently turn a signed-off document back into a draft. Record why accepted facts changed.

## 7. Authority and conflicts

Use the authority order in `instruction/README.md`.

When a conflict is found:

1. Do not pick whichever document is easiest.
2. Identify the conflicting statements and their authority.
3. Ask the product owner when the higher-authority intent is ambiguous.
4. Update or supersede the lower-authority document.
5. Commit the reconciliation with a focused message.

## 8. Phase documentation

Every active phase should contain:

- `README.md` with objective, scope, baseline, findings, risks, estimate, and exit-gate status;
- a checklist for manual/account-dependent verification;
- `evidence/` for inventories, test summaries, or reports;
- a sign-off decision when its exit gate is met.

Phase completion requires evidence. A successful build alone does not prove authentication, privacy, releases, or product acceptance.

## 9. Evidence rules

- Use evidence from staging for destructive, identity, and privacy testing.
- Production evidence must be read-only unless a production change is explicitly approved.
- Remove secrets and private student data before committing.
- Store large raw outputs as files instead of pasting them into running documents.
- Summarize the conclusion and link to the evidence.
- Do not alter historical evidence to match a later conclusion; add new dated evidence.

## 10. Links and duplication

- Use relative repository links in Markdown.
- Link to the authoritative explanation instead of copying it.
- Keep indexes short; they route readers rather than duplicate full documents.
- Update incoming links when a file must move.
- Run a link and Git diff review before committing documentation reorganizations.

## 11. Security and privacy

Never commit:

- `.env` values;
- Supabase secret/service-role keys;
- payment or OAuth secrets;
- passwords or magic-link URLs;
- private student records;
- unrestricted database connection strings.

Public project references and variable names may be documented when operationally useful. Treat all unknown values as secret until classified.

## 12. Change and commit convention

- Batch one coherent documentation change per commit.
- Use imperative commit messages, such as `Add documentation register`.
- State whether a change is local, committed, pushed, or deployed.
- Preserve unrelated user changes.
- Review `git diff --check` before committing.
- Update the relevant index when adding a new durable document category.

## 13. Token-efficient maintenance

- Start from `instruction/README.md` and `docs/README.md`.
- Read only the current phase and relevant feature documents.
- Reuse summaries and evidence; do not repeat full audits.
- Give one manual task at a time.
- Attach large outputs as files.
- Batch status-document updates after a coherent verification result.
- Record durable context once, then link to it.
