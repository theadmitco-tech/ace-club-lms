import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getPreReadRecommendation,
  getRecommendedPractice,
  getRecommendedReading,
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

function session(id, section, sessionDate, materials = [], sessionNumber = 1) {
  return {
    id,
    title: id,
    session_number: sessionNumber,
    session_date: sessionDate,
    session_end_at: sessionDate,
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

test('returns every unique released Session material from each latest released section set', () => {
  const vaCr = material('va-cr-reading', 'session_material');
  const vaRc = material('va-rc-reading', 'session_material');
  const recommendations = getRecommendedReading([
    session('di-1', 'DI', '2026-08-09T04:30:00.000Z', [material('di-old-reading', 'session_material')], 1),
    session('di-2', 'DI', '2026-08-16T04:30:00.000Z', [material('di-new-reading', 'session_material', false)], 2),
    session('va-1', 'VA', '2026-08-07T14:30:00.000Z', [vaCr, vaRc, vaCr], 3),
    session('qa-1', 'QA', '2026-08-08T04:30:00.000Z', [material('qa-reading', 'session_material')], 4),
  ]);

  assert.deepEqual(
    recommendations.map(({ session: item, material: itemMaterial }) => [item.id, itemMaterial.id]),
    [['di-1', 'di-old-reading'], ['va-1', 'va-cr-reading'], ['va-1', 'va-rc-reading'], ['qa-1', 'qa-reading']],
  );
});

test('keeps earlier reading through missing and locked replacements, then replaces the complete set', () => {
  const earlier = session('qa-1', 'QA', '2026-08-01T04:30:00.000Z', [
    material('qa-old-reading-1', 'session_material'),
    material('qa-old-reading-2', 'session_material'),
  ], 1);
  const missing = session('qa-2', 'QA', '2026-08-08T04:30:00.000Z', [], 2);
  const replacement = session('qa-3', 'QA', '2026-08-15T04:30:00.000Z', [
    material('qa-new-reading-1', 'session_material', false),
    material('qa-new-reading-2', 'session_material', false),
  ], 3);

  assert.deepEqual(
    getRecommendedReading([replacement, earlier, missing]).map(({ material: item }) => item.id),
    ['qa-old-reading-1', 'qa-old-reading-2'],
  );

  for (const item of replacement.materials) item.is_available = true;
  assert.deepEqual(
    getRecommendedReading([earlier, missing, replacement]).map(({ material: item }) => item.id),
    ['qa-new-reading-1', 'qa-new-reading-2'],
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

test('recommends the actual next programme-day class across Thursday, Friday, and Saturday', () => {
  const sessions = [
    session('va-friday', 'VA', '2026-08-14T14:30:00.000Z', [material('va-read', 'pre_read')]),
    session('qa-saturday', 'QA', '2026-08-15T04:30:00.000Z', [material('qa-read', 'pre_read')]),
    session('di-sunday', 'DI', '2026-08-16T04:30:00.000Z', [material('di-read', 'pre_read')]),
  ];

  assert.equal(getPreReadRecommendation(sessions, '2026-08-13T18:00:00+05:30', 'Asia/Kolkata')?.session.id, 'va-friday');
  assert.equal(getPreReadRecommendation(sessions, '2026-08-14T18:00:00+05:30', 'Asia/Kolkata')?.session.id, 'qa-saturday');
  assert.equal(getPreReadRecommendation(sessions, '2026-08-15T18:00:00+05:30', 'Asia/Kolkata')?.session.id, 'di-sunday');
});

test('uses the programme timezone at the calendar-day boundary and does not alter release state', () => {
  const lockedPreRead = material('qa-read', 'pre_read', false);
  lockedPreRead.available_from = '2026-08-08T04:30:00.000Z';
  const qaSession = session('qa-saturday', 'QA', '2026-08-15T04:30:00.000Z', [lockedPreRead]);
  const recommendation = getPreReadRecommendation(
    [qaSession],
    '2026-08-13T19:00:00.000Z',
    'Asia/Kolkata',
  );

  assert.equal(recommendation?.session.id, 'qa-saturday');
  assert.equal(recommendation?.material?.is_available, false);
  assert.equal(recommendation?.material?.available_from, '2026-08-08T04:30:00.000Z');
  assert.equal(getPreReadRecommendation([qaSession], '2026-08-13T18:00:00.000Z', 'Asia/Kolkata'), null);
});
