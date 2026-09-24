import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  normalizeNotionInput,
  reorderCourseTemplateEvents,
  validateCourseTemplateDraft,
} from '../src/lib/courseTemplates.ts';

const validDraft = {
  title: 'Critical Reasoning Crash Course',
  sections: [{ key: 'cr', title: 'Critical Reasoning', displayOrder: 1 }],
  events: [{
    key: 'cr-01-boldface-inferences',
    title: 'CR (Boldface + Inferences)',
    eventType: 'live_class',
    sectionKey: 'cr',
    relativeDay: 0,
    displayOrder: 1,
    startTime: '20:00',
    durationMinutes: 60,
    instructor: 'Tanya',
    venue: '',
    reportingTime: '',
    instructions: '',
    publishedByDefault: true,
    sourceMasterSessionId: null,
  }],
  resources: [],
};

test('accepts the approved crash-course event shape', () => {
  const result = validateCourseTemplateDraft(validDraft);
  assert.equal(result.valid, true);
  if (result.valid) {
    assert.equal(result.draft.events[0].startTime, '20:00');
    assert.equal(result.draft.events[0].durationMinutes, 60);
    assert.equal(result.draft.events[0].instructor, 'Tanya');
  }
});

test('reordering events moves them into the destination schedule slots', () => {
  const orientation = {
    ...validDraft.events[0],
    key: 'orientation',
    title: 'Orientation',
    relativeDay: 7,
    displayOrder: 1,
    startTime: '20:00',
    durationMinutes: 60,
  };
  const verbal = {
    ...validDraft.events[0],
    key: 'verbal-one',
    title: 'VA 1',
    relativeDay: 8,
    displayOrder: 2,
    startTime: '10:00',
    durationMinutes: 120,
  };

  const moved = reorderCourseTemplateEvents([orientation, verbal], 0, 1);

  assert.deepEqual(
    moved.map(({ key, relativeDay, displayOrder, startTime, durationMinutes }) => ({
      key, relativeDay, displayOrder, startTime, durationMinutes,
    })),
    [
      { key: 'verbal-one', relativeDay: 7, displayOrder: 1, startTime: '20:00', durationMinutes: 120 },
      { key: 'orientation', relativeDay: 8, displayOrder: 2, startTime: '10:00', durationMinutes: 60 },
    ],
  );

  const restored = reorderCourseTemplateEvents(moved, 1, -1);
  assert.deepEqual(restored, [orientation, verbal]);
});

test('accepts reusable Starter Pack, pre-read and worksheet content for a crash template', () => {
  const result = validateCourseTemplateDraft({
    ...validDraft,
    resources: [
      { key: 'starter-one', title: 'Starter One', resourceType: 'starter', scope: 'template', sectionKey: null, eventKey: null, masterMaterialId: null, format: 'notion', notionUrl: 'https://ace.notion.site/starter-one', fileUrl: '', textContent: '', questionCount: null, displayOrder: 1 },
      { key: 'pre-one', title: 'Read One', resourceType: 'pre_read', scope: 'event', sectionKey: null, eventKey: 'cr-01-boldface-inferences', masterMaterialId: null, format: 'notion', notionUrl: 'https://ace.notion.site/read-one', fileUrl: '', textContent: '', questionCount: null, displayOrder: 2 },
      { key: 'worksheet-one', title: 'Worksheet One', resourceType: 'worksheet', scope: 'section', sectionKey: 'cr', eventKey: null, masterMaterialId: null, format: 'pdf', notionUrl: '', fileUrl: '/api/materials/file?path=worksheets%2F10000000-0000-4000-8000-000000000002%2F30000000-0000-4000-8000-000000000001.pdf', textContent: '', questionCount: 24, displayOrder: 3 },
    ],
  });
  assert.equal(result.valid, true);
  if (result.valid) {
    assert.equal(result.draft.resources.length, 3);
    assert.equal(result.draft.resources[2].questionCount, 24);
  }
});

test('requires a positive question count for every reusable worksheet', () => {
  const result = validateCourseTemplateDraft({
    ...validDraft,
    resources: [{
      key: 'worksheet-without-count',
      title: 'Worksheet without count',
      resourceType: 'worksheet',
      scope: 'event',
      sectionKey: null,
      eventKey: 'cr-01-boldface-inferences',
      masterMaterialId: null,
      format: 'pdf',
      notionUrl: '',
      fileUrl: '/api/materials/file?path=worksheets%2F10000000-0000-4000-8000-000000000002%2F30000000-0000-4000-8000-000000000001.pdf',
      textContent: '',
      questionCount: null,
      displayOrder: 1,
    }],
  });
  assert.equal(result.valid, false);
  if (!result.valid) assert.match(result.errors.join('\n'), /positive number of questions/i);
});

test('extracts a Notion URL when the complete iframe embed code is pasted', () => {
  const iframe = '<iframe src="https://nebula-darkness-356.notion.site/ebd//3504e51784b881bd829ff826f7295789" width="100%" height="600" frameborder="0" allowfullscreen />';
  assert.equal(
    normalizeNotionInput(iframe),
    'https://nebula-darkness-356.notion.site/ebd//3504e51784b881bd829ff826f7295789',
  );
  const result = validateCourseTemplateDraft({
    ...validDraft,
    resources: [{
      key: 'iframe-pre-read',
      title: 'Iframe pre-read',
      resourceType: 'pre_read',
      scope: 'event',
      sectionKey: null,
      eventKey: 'cr-01-boldface-inferences',
      masterMaterialId: null,
      format: 'notion',
      notionUrl: iframe,
      fileUrl: '',
      textContent: '',
      displayOrder: 1,
    }],
  });
  assert.equal(result.valid, true);
});

test('requires template Starter Packs to use Notion', () => {
  const result = validateCourseTemplateDraft({
    ...validDraft,
    resources: [{
      key: 'text-starter', title: 'Text Starter', resourceType: 'starter', scope: 'template',
      sectionKey: null, eventKey: null, masterMaterialId: null, format: 'text', notionUrl: '',
      fileUrl: '', textContent: 'Instructions', displayOrder: 1,
    }],
  });
  assert.equal(result.valid, false);
  if (!result.valid) assert.match(result.errors.join('\n'), /Starter Pack must use Notion/i);
});

test('rejects duplicate order and an unknown Section', () => {
  const result = validateCourseTemplateDraft({
    ...validDraft,
    events: [
      validDraft.events[0],
      { ...validDraft.events[0], key: 'second-event', sectionKey: 'missing' },
    ],
  });
  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.match(result.errors.join('\n'), /display order 1 is duplicated/i);
    assert.match(result.errors.join('\n'), /must use one of this template’s Sections/i);
  }
});

test('rejects recording and Session-material template resources', () => {
  const result = validateCourseTemplateDraft({
    ...validDraft,
    resources: [{
      key: 'forbidden-recording',
      title: 'Recording',
      resourceType: 'recording',
      scope: 'event',
      sectionKey: 'cr',
      eventKey: 'cr-01-boldface-inferences',
      masterMaterialId: null,
      format: 'youtube',
      notionUrl: '',
      fileUrl: '',
      textContent: '',
      displayOrder: 1,
    }],
  });
  assert.equal(result.valid, false);
  if (!result.valid) assert.match(result.errors.join('\n'), /invalid reusable type/i);
});

test('rejects the removed Window event type', () => {
  const result = validateCourseTemplateDraft({
    ...validDraft,
    events: [{ ...validDraft.events[0], eventType: 'window' }],
  });
  assert.equal(result.valid, false);
  if (!result.valid) assert.match(result.errors.join('\n'), /invalid event type/i);
});

test('migration seeds exactly four template identities and the approved crash curricula', async () => {
  const sql = await readFile(
    new URL('../supabase/migrations/20260817090845_add_versioned_course_templates.sql', import.meta.url),
    'utf8',
  );
  for (const templateKey of ['full-course', 'cr-crash-course', 'rc-crash-course', 'di-crash-course']) {
    assert.match(sql, new RegExp(`'${templateKey}'`));
  }
  for (const approvedRow of [
    "'CR (Boldface + Inferences)'",
    "'CR (Complete the Argument + Paradoxes)'",
    "'RC (Intro to Mind-Mapping + Question Types)'",
    "'RC (Function & Role Qs)'",
    "'DS + GI'",
    "'TPA + MSR (Non-Math)'",
  ]) {
    assert.ok(sql.includes(approvedRow), `missing ${approvedRow}`);
  }
  assert.match(sql, /select template_revision_id, section_id, event_key, title, event_type, relative_day,[\s\S]+time '20:00', 60/);
  assert.match(sql, /create policy "Admins view course templates"/);
  assert.match(sql, /security invoker/);
  assert.match(sql, /Full Course template must include every active mvp-2026 Master event/);
  assert.match(sql, /from public\.master_sessions[\s\S]+curriculum_version = 'mvp-2026'[\s\S]+is_archived = false/);
  assert.doesNotMatch(sql, /requires exactly 31 active mvp-2026 Master events/);
  assert.doesNotMatch(sql, /recording'\s*,\s*'event'/);
  assert.doesNotMatch(sql, /session_material/);
  assert.doesNotMatch(sql, /alter table public\.(?:courses|sessions|materials)\b/i);
});

test('Phase 3 migration adds editable template content, atomic inheritance and reviewed sync', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20260818113000_add_flexible_batch_resources.sql', import.meta.url), 'utf8');
  assert.match(sql, /alter table public\.course_template_resources[\s\S]+resource_format text/);
  assert.match(sql, /create_course_template_revision_v2/);
  assert.match(sql, /confirm_template_batch_v2/);
  assert.match(sql, /source_template_resource_id/);
  assert.match(sql, /preview_course_template_resource_sync/);
  assert.match(sql, /sync_course_template_resources/);
  assert.match(sql, /v_existing\.available_from <= statement_timestamp\(\)/);
  assert.doesNotMatch(sql, /resource_type.*(?:recording|session_material)/);
});

test('worksheet-count migration persists validated counts into generated batch materials', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20260830112501_add_template_worksheet_question_count.sql', import.meta.url), 'utf8');
  assert.match(sql, /alter table public\.course_template_resources[\s\S]+add column question_count integer/);
  assert.match(sql, /Reusable worksheet needs a positive number of questions/);
  assert.match(sql, /question_count = case when v_resource->>'resourceType' = 'worksheet'/);
  assert.match(sql, /create trigger apply_template_resource_question_count/);
  assert.match(sql, /coalesce\(resource\.question_count, master\.question_count\)/);
  assert.match(sql, /revoke all on function public\.apply_template_resource_question_count\(\) from public, anon, authenticated/);
});

test('worksheet-count correction runs after the legacy Master worksheet linker', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20260830133001_fix_template_worksheet_question_count_trigger_order.sql', import.meta.url), 'utf8');
  assert.match(sql, /drop trigger if exists apply_template_resource_question_count on public\.materials/);
  assert.match(sql, /create trigger set_template_resource_question_count/);
  assert.match(sql, /execute function public\.apply_template_resource_question_count\(\)/);
});
