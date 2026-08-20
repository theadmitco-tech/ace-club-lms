import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { buildBatchProposal, previewShiftSubsequent } from '../src/lib/batchSchedule.ts';

const template = {
  id: '10000000-0000-4000-8000-000000000002', key: 'cr-crash-course', name: 'CR Crash Course', mode: 'crash',
  revisionId: '20000000-0000-4000-8000-000000000002', revisionNumber: 7, title: 'CR Crash Course', revisionHistory: [],
  sections: [{ key: 'cr', title: 'Critical Reasoning', displayOrder: 1 }],
  events: [{
    key: 'cr-01', title: 'CR One', eventType: 'live_class', sectionKey: 'cr', relativeDay: 0,
    displayOrder: 1, startTime: '20:00', durationMinutes: 60, instructor: 'Tanya', venue: '',
    reportingTime: '', instructions: '', publishedByDefault: true, sourceMasterSessionId: null,
  }],
  resources: [{ key: 'pre-read', title: 'Read first', resourceType: 'pre_read', scope: 'event', sectionKey: 'cr', eventKey: 'cr-01', masterMaterialId: null, format: 'notion', notionUrl: 'https://ace.notion.site/read-first', fileUrl: '', textContent: '', displayOrder: 1 }],
};

test('builds an IST proposal without writing and pins the immutable revision', () => {
  const proposal = buildBatchProposal(template, {
    name: 'September CR', startDate: '2026-09-01', publicationState: 'published', templateId: template.id,
    expectedRevisionId: template.revisionId, idempotencyKey: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  });
  assert.equal(proposal.revisionId, template.revisionId);
  assert.equal(proposal.events[0].startsAt, '2026-09-01T14:30:00.000Z');
  assert.equal(proposal.events[0].endsAt, '2026-09-01T15:30:00.000Z');
  assert.equal(proposal.events[0].resources[0].title, 'Read first');
  assert.equal(proposal.resources[0].scope, 'event');
  assert.equal(proposal.events[0].isPublished, true);
});

test('rejects a stale template revision', () => {
  assert.throws(() => buildBatchProposal(template, {
    name: 'September CR', startDate: '2026-09-01', publicationState: 'draft', templateId: template.id,
    expectedRevisionId: '20000000-0000-4000-8000-000000000099', idempotencyKey: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  }), /template changed/i);
});

test('shift preview includes only eligible selected and subsequent events', () => {
  const events = [
    { id: 'past', title: 'Past', displayOrder: 1, startsAt: '2026-08-01T10:00:00.000Z', endsAt: '2026-08-01T11:00:00.000Z', cancelledAt: null },
    { id: 'selected', title: 'Selected', displayOrder: 2, startsAt: '2026-09-01T10:00:00.000Z', endsAt: '2026-09-01T11:00:00.000Z', cancelledAt: null },
    { id: 'cancelled', title: 'Cancelled', displayOrder: 3, startsAt: '2026-09-02T10:00:00.000Z', endsAt: '2026-09-02T11:00:00.000Z', cancelledAt: '2026-08-10T00:00:00.000Z' },
    { id: 'later', title: 'Later', displayOrder: 4, startsAt: '2026-09-03T10:00:00.000Z', endsAt: '2026-09-03T11:00:00.000Z', cancelledAt: null },
  ];
  const result = previewShiftSubsequent(events, 'selected', 2, new Date('2026-08-17T00:00:00.000Z'));
  assert.deepEqual(result.map((item) => item.id), ['selected', 'later']);
  assert.equal(result[0].after, '2026-09-03T10:00:00.000Z');
});

test('Phase 2 migration is additive, idempotent and protects stale schedules', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20260817143000_add_batch_schedule_builder.sql', import.meta.url), 'utf8');
  assert.match(sql, /creation_idempotency_key uuid/);
  assert.match(sql, /create unique index courses_creation_idempotency_key/);
  assert.match(sql, /current_revision_id is distinct from p_expected_revision_id/);
  assert.match(sql, /schedule_revision <> p_expected_schedule_revision/);
  assert.match(sql, /m\.available_from > statement_timestamp\(\)/);
  assert.match(sql, /A shift cannot move an eligible event into the past/);
  assert.match(sql, /courses_template_revision_ownership_fkey/);
  assert.doesNotMatch(sql, /cancellation_reason = btrim\(p_reason\), is_published = false/);
  assert.match(sql, /event\.event_type/);
  assert.doesNotMatch(sql, /drop table public\.|truncate public\.|include-all/i);
});

test('reorder correction avoids unresolved temporary relations', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20260817170000_fix_batch_event_reorder.sql', import.meta.url), 'utf8');
  assert.match(sql, /v_display_orders integer\[\]/);
  assert.match(sql, /for v_position in 1\.\.v_count loop/);
  assert.doesNotMatch(sql, /pg_temp|create temporary table|truncate/i);
  assert.match(sql, /material\.available_from > statement_timestamp\(\)/);
});

test('Phase 2 correction makes conflicts non-retryable and shifts materials after events', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20260817233540_fix_phase2_conflicts_and_shift_materials.sql', import.meta.url), 'utf8');
  assert.match(sql, /confirm_template_batch\(text,uuid,uuid,date,text,uuid\)/);
  assert.match(sql, /reorder_batch_events\(uuid,uuid\[\],integer\)/);
  assert.match(sql, /if v_occurrences <> 1 then/);
  assert.match(sql, /execute replace\(v_definition, '40001', 'P0001'\)/);
  assert.match(sql, /Schedule changed after review\. Review consequences again\.' using errcode = 'P0001'/);
  assert.doesNotMatch(sql, /errcode = '40001'/);

  const eventUpdateEnd = sql.indexOf('from changed;');
  const materialUpdateStart = sql.indexOf('update public.materials as material');
  assert(eventUpdateEnd > 0 && materialUpdateStart > eventUpdateEnd,
    'unreleased materials must be synchronized in a statement after shifted events');
  assert.doesNotMatch(sql, /material_changes as \(/);
  assert.doesNotMatch(sql, /drop table public\.|truncate public\.|include-all/i);
});
