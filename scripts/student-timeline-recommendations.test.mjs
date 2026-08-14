import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getLastClassSessionMaterials,
  getNextClassPreReads,
  getRecommendedPractice,
} from '../src/lib/studentTimeline.ts';

function material(id, type, isAvailable = true) {
  return {
    id,
    type,
    title: id,
    available_from: '2026-08-01T00:00:00.000Z',
    is_available: isAvailable,
    tracker_available: type === 'worksheet' && isAvailable,
  };
}

function session(id, section, sessionDate, materials = [], sessionNumber = 1, sessionEndAt = sessionDate) {
  return {
    id,
    title: id,
    session_number: sessionNumber,
    session_date: sessionDate,
    session_end_at: sessionEndAt,
    class_type: section,
    instructor: null,
    week_number: 1,
    weekday: null,
    materials,
  };
}

test('returns every unique released worksheet from each latest released section set', () => {
  const vaCr = material('va-cr', 'worksheet');
  const vaRc = material('va-rc', 'worksheet');
  const recommendations = getRecommendedPractice([
    session('di-1', 'DI', '2026-08-09T04:30:00.000Z', [material('di-old', 'worksheet')], 1),
    session('di-2', 'DI', '2026-08-16T04:30:00.000Z', [material('di-new', 'worksheet', false)], 2),
    session('va-1', 'VA', '2026-08-07T14:30:00.000Z', [vaCr, vaRc, vaCr], 3),
    session('qa-1', 'QA', '2026-08-08T04:30:00.000Z', [material('qa', 'worksheet')], 4),
  ]);

  assert.deepEqual(
    recommendations.map(({ session: item, material: itemMaterial }) => [item.id, itemMaterial.id]),
    [['di-1', 'di-old'], ['va-1', 'va-cr'], ['va-1', 'va-rc'], ['qa-1', 'qa']],
  );
});

test('keeps an earlier set through missing and unreleased replacements, then replaces it after release', () => {
  const earlier = session('qa-1', 'QA', '2026-08-01T04:30:00.000Z', [material('qa-old', 'worksheet')], 1);
  const missing = session('qa-2', 'QA', '2026-08-08T04:30:00.000Z', [], 2);
  const replacement = session('qa-3', 'QA', '2026-08-15T04:30:00.000Z', [material('qa-new', 'worksheet', false)], 3);

  assert.deepEqual(
    getRecommendedPractice([earlier, missing, replacement]).map(({ material: item }) => item.id),
    ['qa-old'],
  );

  replacement.materials[0].is_available = true;
  assert.deepEqual(
    getRecommendedPractice([replacement, earlier, missing]).map(({ material: item }) => item.id),
    ['qa-new'],
  );
});

test('isolates empty and partial sections', () => {
  assert.deepEqual(
    getRecommendedPractice([
      session('invalid', null, '2026-08-01T00:00:00.000Z', [material('ignored', 'worksheet')]),
      session('va', 'VA', '2026-08-02T00:00:00.000Z', [material('locked', 'worksheet', false)]),
      session('qa', 'QA', '2026-08-03T00:00:00.000Z', [material('qa', 'worksheet')]),
    ]).map(({ material: item }) => item.id),
    ['qa'],
  );
});

test('recommends every unique pre-read for each section\'s next class', () => {
  const qaOne = material('qa-pre-1', 'pre_read');
  const qaTwo = material('qa-pre-2', 'pre_read', false);
  const sessions = [
    session('qa-next', 'QA', '2026-08-15T04:30:00.000Z', [qaOne, qaTwo, qaOne]),
    session('qa-later', 'QA', '2026-08-22T04:30:00.000Z', [material('qa-later-pre', 'pre_read')]),
    session('va-next', 'VA', '2026-08-14T14:30:00.000Z', [material('va-pre', 'pre_read')]),
    session('di-next', 'DI', '2026-08-16T04:30:00.000Z', [material('di-pre', 'pre_read')]),
  ];
  const recommendations = getNextClassPreReads(sessions, '2026-08-13T12:30:00.000Z');

  assert.deepEqual(
    recommendations.map((item) => [item.section, item.session?.id, item.materials.map(({ id }) => id)]),
    [
      ['QA', 'qa-next', ['qa-pre-1', 'qa-pre-2']],
      ['VA', 'va-next', ['va-pre']],
      ['DI', 'di-next', ['di-pre']],
    ],
  );
  assert.equal(recommendations[0].materials[1].is_available, false);
});

test('rotates only the section whose next class has started', () => {
  const sessions = [
    session('qa-current', 'QA', '2026-08-15T04:30:00.000Z', [material('qa-current-pre', 'pre_read')]),
    session('qa-following', 'QA', '2026-08-22T04:30:00.000Z', [material('qa-following-pre', 'pre_read')]),
    session('va-next', 'VA', '2026-08-15T06:30:00.000Z', [material('va-pre', 'pre_read')]),
    session('di-next', 'DI', '2026-08-16T04:30:00.000Z', [material('di-pre', 'pre_read')]),
  ];

  assert.deepEqual(
    getNextClassPreReads(sessions, '2026-08-15T04:30:00.000Z')
      .map((item) => [item.section, item.session?.id]),
    [['QA', 'qa-following'], ['VA', 'va-next'], ['DI', 'di-next']],
  );
});

test('shows all released Session materials after class and removes them at the next same-section class start', () => {
  const qaOne = material('qa-session-1', 'session_material');
  const qaTwo = material('qa-session-2', 'session_material');
  const sessions = [
    session('qa-last', 'QA', '2026-08-08T04:30:00.000Z', [qaOne, qaTwo, qaOne], 1, '2026-08-08T06:30:00.000Z'),
    session('qa-next', 'QA', '2026-08-15T04:30:00.000Z', [material('qa-next-session', 'session_material')], 2, '2026-08-15T06:30:00.000Z'),
    session('va-last', 'VA', '2026-08-07T14:30:00.000Z', [material('va-session', 'session_material')], 1, '2026-08-07T16:30:00.000Z'),
    session('va-next', 'VA', '2026-08-15T06:30:00.000Z', [], 2, '2026-08-15T08:30:00.000Z'),
    session('di-last', 'DI', '2026-08-09T04:30:00.000Z', [material('di-session', 'session_material')], 1, '2026-08-09T06:30:00.000Z'),
    session('di-next', 'DI', '2026-08-16T04:30:00.000Z', [], 2, '2026-08-16T06:30:00.000Z'),
  ];

  const beforeQaClass = getLastClassSessionMaterials(sessions, '2026-08-15T04:29:59.000Z');
  assert.deepEqual(beforeQaClass[0].materials.map(({ id }) => id), ['qa-session-1', 'qa-session-2']);

  const duringQaClass = getLastClassSessionMaterials(sessions, '2026-08-15T04:30:00.000Z');
  assert.deepEqual(
    duringQaClass.map((item) => [item.section, item.session?.id, item.materials.map(({ id }) => id)]),
    [
      ['QA', undefined, []],
      ['VA', 'va-last', ['va-session']],
      ['DI', 'di-last', ['di-session']],
    ],
  );

  const afterQaClass = getLastClassSessionMaterials(sessions, '2026-08-15T06:30:00.000Z');
  assert.deepEqual(afterQaClass[0].materials.map(({ id }) => id), ['qa-next-session']);
  assert.equal(afterQaClass[0].session?.id, 'qa-next');
  assert.equal(afterQaClass[1].session, null);
  assert.deepEqual(afterQaClass[2].materials.map(({ id }) => id), ['di-session']);
});

test('does not recommend locked Session materials', () => {
  const recommendations = getLastClassSessionMaterials([
    session('qa-last', 'QA', '2026-08-08T04:30:00.000Z', [
      material('released', 'session_material'),
      material('locked', 'session_material', false),
    ], 1, '2026-08-08T06:30:00.000Z'),
  ], '2026-08-09T00:00:00.000Z');

  assert.deepEqual(recommendations[0].materials.map(({ id }) => id), ['released']);
});
