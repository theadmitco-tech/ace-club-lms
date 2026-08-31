# Ace Club LMS — Documentation Consolidation Project

Status: Active
Owner: Product owner and Engineering
Last updated: 31 August 2026

## 1. Objective

Create one reliable front door for Ace Club LMS documentation while preserving accepted decisions, signed release evidence, and historical context.

The intended result is not one enormous file that copies every detail. It is one **Project Manual** that explains the whole system at the right level and routes readers to authoritative detail only when required.

The normal continuation path will be:

1. `docs/PROJECT_MANUAL.md` — stable system, product, architecture, operational, and documentation map.
2. `docs/CURRENT_STATE.md` — exact live release, database state, open risks, and next action.

No ordinary handoff should require reading a chain of phase plans, old handoffs, acceptance records, and release evidence before work can resume.

## 2. Why this project is needed

Inventory on 31 August 2026 found:

| Measure | Current value |
|---|---:|
| Files under `docs/` | 129 |
| Markdown files under `docs/` | 103 |
| Markdown lines under `docs/` | 11,238 |
| Main running handoff | 669 lines |
| Pilot-iterations running handoff | 294 lines |
| Pilot V2 bootstrap/running handoff | 509 lines |
| Documentation index | 166 lines |
| Markdown files without a `Status:` header | 92 |

Many files are legitimate immutable evidence. The problem is that navigation does not clearly separate:

- what a new contributor must read now;
- what is the current source of truth;
- what is a stable reference;
- what is an accepted decision;
- what is historical evidence;
- what is superseded planning.

The current running handoffs also accumulate prerequisite reading and historical narrative. This makes a handoff progressively harder to use and increases the chance that a stale branch, rule, or release instruction is treated as current.

## 3. Project principles

1. **One front door, multiple authoritative records.** The Project Manual summarizes and routes; it does not duplicate every test result.
2. **Two-document resume path.** A contributor starts with the Project Manual and Current State.
3. **History is preserved.** Signed evidence and accepted decisions are not deleted or rewritten.
4. **Current and historical are visibly separated.** Historical material must not appear to be an active instruction.
5. **One fact has one durable owner.** Other documents link to it instead of copying it.
6. **Git is the archive.** A living current-state file is updated in place; Git preserves earlier versions.
7. **Evidence remains immutable.** Dated evidence files stay where they are unless a reviewed move preserves links.
8. **Consolidation is non-functional.** Documentation cleanup must not change application code, databases, environments, access, or deployed behavior.
9. **Moves are staged.** Do not perform a mass rename or deletion before a link map and review exist.
10. **Automation prevents relapse.** Link, header, duplication, and current-state checks become CI gates where practical.

## 4. Target documentation model

```text
README.md
instruction/
  README.md
  ...binding product requirements...

docs/
  PROJECT_MANUAL.md
  CURRENT_STATE.md
  README.md

  governance/
    engineering-handbook.md
    document-conventions.md
    documentation-consolidation-project.md

  decisions/
    adr-NNNN-*.md

  features/
    <feature-name>/
      README.md

  runbooks/
    release.md
    rollback.md
    access-management.md
    incident-response.md

  releases/
    YYYY-MM-DD-<release-name>.md

  evidence/
    <release-or-feature>/

  archive/
    phases/
    pilots/
    handoffs/
```

This tree is a target. Existing stable paths should be redirected or marked before they are moved. Phase and pilot evidence may remain in place initially if moving it creates more link risk than value.

## 5. Canonical document responsibilities

### 5.1 Project Manual

The Project Manual answers:

- What is Ace Club LMS?
- What are the Student, Admin, and Super Admin experiences?
- How are courses, templates, batches, sessions, materials, worksheets, mocks, and progress related?
- Which environment is used for what?
- What are the non-negotiable product and security rules?
- Where are the feature references, ADRs, runbooks, and historical evidence?
- How does a new contributor safely start?

It should contain stable summaries and diagrams/tables where helpful. It should not contain per-release console output, disposable fixture IDs, or a chronological diary.

### 5.2 Current State

`docs/CURRENT_STATE.md` replaces the growing operational part of running handoffs.

It contains only:

- timestamp and owner;
- current Production Git commit/tag and Vercel deployment;
- current Staging candidate, if any;
- Production and Staging migration ledger boundary;
- current user-visible behavior;
- known incidents or regressions;
- active release and gate;
- exact next action;
- rollback target;
- pending approvals or account confirmations;
- links to the relevant release record and evidence.

It is updated in place after every accepted release, rollback, or material incident. Git preserves its history.

### 5.3 Engineering Handbook

The [Engineering Handbook](engineering-handbook.md) owns the development, migration, authorization, testing, release, rollback, documentation, and handoff rules.

Feature and release documents must link to the handbook rather than copying its full procedures.

### 5.4 Architecture decision records

ADRs contain decisions that are expensive to reverse or materially affect architecture, security, data, roles, or product contracts.

Accepted ADRs are append-only. A later decision creates a new ADR that explicitly supersedes the earlier one.

### 5.5 Feature references

A feature reference owns stable behavior for one feature, such as:

- course templates and batch population;
- Student course selection;
- worksheets and practice log;
- mocks;
- Notion resources;
- Admin/Super Admin access.

It does not own the current deployment state or repeat generic release procedures.

### 5.6 Release records

One release record owns the plan and actual result for one Production release. It includes source commit, migrations, acceptance evidence, authorization, deployment, smoke checks, rollback, and closeout.

Release records are preserved after closeout.

### 5.7 Historical handoffs and phase documents

Existing signed handoffs, phases, pilots, and evidence remain historical sources. After consolidation:

- they are not normal prerequisite reading;
- their top section clearly says `Historical` or `Superseded` where appropriate;
- the Project Manual links to them through a history map;
- active instructions are removed from indexes or superseded by Current State;
- signed contents are not rewritten to match later outcomes.

## 6. Single-source ownership matrix

| Fact | Canonical owner |
|---|---|
| Binding product requirement | `instruction/` |
| Overall system explanation | `docs/PROJECT_MANUAL.md` |
| Current deployed state and next action | `docs/CURRENT_STATE.md` |
| Engineering/release rules | Engineering Handbook |
| Significant accepted decision | ADR |
| Stable feature behavior | Feature reference |
| One release's execution and outcome | Release record |
| Raw/sanitized verification result | Evidence file |
| Historical phase narrative | Archived phase/pilot/handoff |

When a fact appears elsewhere, use a short summary and link to the canonical owner.

## 7. Future handoff model

Future handoffs are Current State updates, not appended essays.

Mandatory handoff characteristics:

- maximum two normal prerequisite documents: Project Manual and Current State;
- exact identifiers instead of “latest,” “current branch,” or “the preview”;
- one active release and one exact next action;
- explicit completed, pending, blocked, and excluded work;
- exact Production and Staging boundaries;
- migration and fixture-cleanup state;
- rollback target;
- pending Product Owner approvals;
- no secrets or private Student data;
- links to detail instead of copied histories;
- update committed with the change it describes.

The complete handoff rules and template live in the [Engineering Handbook](engineering-handbook.md#146-future-handoff-standard).

## 8. Consolidation phases

### Phase D0 — Inventory and freeze map

Objective: know what exists before moving anything.

Outputs:

- file inventory by path, type, status, authority, and owner;
- inbound/outbound link inventory;
- duplicate-current-state findings;
- candidate Active, Historical, Superseded, and Archive dispositions;
- list of broken or ambiguous links;
- list of documents containing secrets or private-data risk, if any.

Exit gate:

- every document has a proposed disposition;
- no files have been deleted or moved.

### Phase D1 — Master front door

Objective: make the system understandable through two documents.

Outputs:

- `docs/PROJECT_MANUAL.md`;
- `docs/CURRENT_STATE.md` populated only from verified facts;
- simplified `docs/README.md` pointing to the two-document path;
- history map for phases, pilots, handoffs, decisions, and evidence.

Exit gate:

- a new contributor can identify Production, current work, rules, and relevant feature detail without reading a historical handoff.

### Phase D2 — Authority and duplication cleanup

Objective: remove competing “current” instructions.

Outputs:

- status banners on historical/superseded documents;
- old continuation instructions replaced by links to Current State;
- duplicated generic rules removed in favor of handbook links;
- feature behavior consolidated into feature references;
- existing signed evidence preserved unchanged.

Exit gate:

- each current fact has one canonical owner;
- no historical document presents itself as the active resume instruction.

### Phase D3 — Safe archive and navigation cleanup

Objective: reduce visible clutter without losing history.

Outputs:

- reviewed archive map;
- redirects or link updates for moved documents;
- short indexes for active, reference, release, and historical material;
- no orphaned evidence.

Exit gate:

- link validation passes;
- Git history preserves every move;
- Product Owner accepts the simplified navigation.

### Phase D4 — Maintenance automation

Objective: prevent documentation sprawl from returning.

Outputs:

- Markdown link check;
- required-header check for living documents;
- duplicate active-current-state check;
- pull-request documentation checklist;
- stale Current State reminder/check;
- release-record and ADR templates;
- optional documentation ownership rules.

Exit gate:

- invalid documentation changes fail CI or produce a clear review warning;
- the handoff template is used for one real release.

## 9. Safety and rollback

This project must not change application behavior or remote systems.

Before moving or archiving documents:

1. commit the complete inventory;
2. record every existing path;
3. find incoming relative links;
4. perform moves with Git history preservation;
5. update links in the same commit;
6. run the link checker;
7. review the rendered Project Manual and Current State;
8. preserve a pre-consolidation tag or commit.

Rollback is a Git revert of the focused documentation commit. Do not mix documentation moves with application, migration, role, access, or deployment changes.

## 10. Acceptance criteria

The project is complete when:

- [ ] `docs/PROJECT_MANUAL.md` is the clear master front door.
- [ ] `docs/CURRENT_STATE.md` contains the verified live state and next action.
- [ ] A normal resume requires no more than those two documents.
- [ ] The Engineering Handbook owns all reusable engineering and handoff rules.
- [ ] Every current fact has one canonical owner.
- [ ] Historical handoffs and phases are clearly historical and no longer prerequisite reading.
- [ ] Signed decisions and evidence are preserved.
- [ ] Active indexes are short and task-oriented.
- [ ] Internal links pass automated validation.
- [ ] New living documents follow header/status rules.
- [ ] A release record, ADR, Current State update, and future handoff can be created from maintained templates.
- [ ] The Product Owner accepts the simplified reading path.

## 11. Current status

Phase D0 is in progress.

Completed:

- initial file and line-count inventory;
- identification of multiple competing continuation documents;
- target two-document resume model;
- target documentation tree;
- initial disposition and safety rules;
- future-handoff requirements.

Next action:

> Produce the document-by-document disposition inventory and link map. Do not move or delete files until that inventory is reviewed.

This documentation project does not authorize any application, database, access, Staging, or Production change.
