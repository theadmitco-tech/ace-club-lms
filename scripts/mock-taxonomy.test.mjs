import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/20260821150000_add_mock_taxonomy_management.sql', import.meta.url), 'utf8');
const manager = await readFile(new URL('../src/lib/server/mockTaxonomyAdmin.ts', import.meta.url), 'utf8');

test('taxonomy migration enforces parent section and seeds the four UNNATI mappings', () => {
  assert.match(migration, /enforce_mock_topic_parent_section/);
  assert.match(migration, /new\.section <> parent_section/);
  for (const label of ['Comparing fractions, decimals and roots', 'Divisibility and factors', 'Averages \(arithmetic mean\)', 'Probability and averages']) assert.match(migration, new RegExp(label.replace(/[()]/g, '\\$&')));
  assert.doesNotMatch(manager, /delete\(/);
});

test('taxonomy Admin service never exposes answer-bearing data and offers activation controls', () => {
  assert.match(manager, /mock_topics/);
  assert.match(manager, /is_active/);
  assert.doesNotMatch(manager, /mock_question_keys|answer_json|explanation_json/);
});
