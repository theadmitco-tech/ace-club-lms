import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import results from '../src/lib/mockResults.ts';

const { buildMockResultSummary, formatDuration, resultOutcome } = results;
const resultViewUrl = new URL('../src/components/mock/MockResultView.tsx', import.meta.url);

test('scores all required response slots with no partial credit', () => {
  assert.equal(resultOutcome(null, { answer: 'A' }), 'unanswered');
  assert.equal(resultOutcome({}, { answer: 'A' }), 'unanswered');
  assert.equal(resultOutcome({ answer: 'A' }, { answer: 'A' }), 'correct');
  assert.equal(resultOutcome({ left: 'A' }, { left: 'A', right: 'B' }), 'incorrect');
  assert.equal(resultOutcome({ left: 'A', right: 'C' }, { left: 'A', right: 'B' }), 'incorrect');
});

test('derives reconciled counts and time from attempt items', () => {
  const items = [
    { id: '1', section: 'quant', topic: 'Arithmetic', subtopic: 'Factors', timeSpentMs: 61000, selectedAnswer: { a: '1' }, correctAnswer: { a: '1' } },
    { id: '2', section: 'quant', topic: 'Arithmetic', subtopic: 'Averages', timeSpentMs: 30000, selectedAnswer: { a: '2' }, correctAnswer: { a: '1' } },
    { id: '3', section: 'verbal', topic: 'Critical Reasoning', subtopic: null, timeSpentMs: 0, selectedAnswer: null, correctAnswer: { a: '1' } },
  ];
  const summary = buildMockResultSummary(items);
  assert.deepEqual({ total: summary.overall.total, correct: summary.overall.correct, incorrect: summary.overall.incorrect, unanswered: summary.overall.unanswered, time: summary.overall.timeSpentMs }, { total: 3, correct: 1, incorrect: 1, unanswered: 1, time: 91000 });
  assert.equal(summary.sections.length, 2);
  assert.equal(summary.topics[0].total, 2);
  assert.equal(formatDuration(61000), '1m 1s');
});

test('phase 4 migration keeps keys private and notes student-owned/admin-read-only', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20260824173000_add_mock_results_and_notes.sql', import.meta.url), 'utf8');
  const reader = await readFile(new URL('../supabase/migrations/20260824190000_add_mock_result_key_reader.sql', import.meta.url), 'utf8');
  assert.match(sql, /enable row level security/);
  assert.match(sql, /Students create own mock notes/);
  assert.match(sql, /Students edit own mock notes/);
  assert.match(sql, /Admins read mock notes/);
  assert.doesNotMatch(sql, /Admins .*mock notes.*update/i);
  assert.doesNotMatch(sql, /grant .*private\.mock_attempt_keys/i);
  assert.match(sql, /status <> 'completed'/);
  assert.match(reader, /attempt\.status = 'completed'/);
  assert.match(reader, /revoke all .* from public, anon, authenticated/);
  assert.match(reader, /grant execute .* to service_role/);
  assert.doesNotMatch(reader, /explanation_json/);
});

test('results renderer owns its interactive client boundary', async () => {
  const view = await readFile(resultViewUrl, 'utf8');
  assert.match(view, /^'use client';/);
  assert.match(view, /<MockQuestionBody disabled/);
  assert.match(view, /onChange=\{\(\) => undefined\}/);
  assert.match(view, /label: 'Overall'/);
  assert.match(view, /label: 'DI'/);
  assert.match(view, /label: 'QA'/);
  assert.match(view, /label: 'VA'/);
  assert.match(view, /Average time\/question/);
  assert.match(view, /function PacingChart/);
  assert.match(view, /Question-wise breakdown/);
  assert.match(view, /window\.history\.pushState/);
  assert.match(view, /window\.history\.back/);
  assert.match(view, /scrollIntoView/);
});
