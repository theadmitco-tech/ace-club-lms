# ADR-0005: Template-native worksheet tracking

Status: Accepted for Staging validation
Date: 6 September 2026
Owner: Product owner and Engineering

## Context

The established worksheet and Practice Log experience reads questions from `master_worksheet_questions` through a worksheet's `master_material_id`. Reusable course templates instead snapshot a positive `question_count` into each generated worksheet and intentionally leave `master_material_id` empty. Consequently, a released template-native worksheet can display its PDF but cannot expose the existing manual question log.

This affects current RC Crash Course worksheets, will affect DI Crash Course worksheets after release, and would affect future Full Course batches once their material source moves to templates.

## Decision

Keep the existing Student experience and RPC contracts. Add a material-backed question catalog for worksheets that have no Master Base relationship:

- Master-backed worksheets continue to use `master_worksheet_questions` and `student_question_logs` unchanged.
- Standalone/template-native worksheets generate stable question rows from `materials.question_count`.
- Student entries for those rows are stored separately and exposed through the same Practice Log and worksheet RPCs.
- Selection is based on worksheet lineage (`master_material_id` present or absent), not `course_mode`.
- Publication, release time, active profile, enrollment, ownership, and Admin authorization remain mandatory.
- Admin Practice Progress reads the same combined catalog.

The UI, routes, controls, and response shapes do not change.

## Why this option

It supports RC, DI, and future template-based Full Course batches without reconnecting templates to Master Base. It also avoids rewriting the established Full Course tracker table or its existing Student records.

## Rejected alternatives

### Link Crash Course worksheets back to Master Base

Rejected because it recreates the dependency templates are intended to remove and makes a template snapshot depend on later Master Base edits.

### Replace the existing tracker for every course immediately

Rejected because it would migrate working Full Course records and unnecessarily increase risk to the ongoing batch.

### Restrict the fix to `course_mode = 'crash'`

Rejected because future Full Course batches will also be template-based. Worksheet lineage is the durable distinction.

## Rollout and rollback

The rollout is database-additive and Staging-first. Disposable fixtures cover released RC, locked DI, template-based Full Course, and the existing Master Base Full Course path.

The emergency rollback restores the catalog to Master-backed questions and restores the prior Master-backed update function. It does not drop the new tables or delete Student entries, allowing a later re-enable without data loss.

## Consequences

- Two physical log stores exist temporarily behind one stable API.
- Template worksheet question counts must remain positive and accurate before a batch is generated.
- A later consolidation may unify the storage tables, but that is deliberately outside this release.
