import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import mockAttempt from '../src/lib/mockAttempt.ts';

const { formatClock, isSectionOrder, remainingSeconds, SECTION_ORDERS } = mockAttempt;

const migrationUrl = new URL('../supabase/migrations/20260822213000_add_mock_attempt_player.sql', import.meta.url);
const playerUrl = new URL('../src/app/mocks/[attemptId]/MockPlayer.tsx', import.meta.url);
const vercelConfigUrl = new URL('../vercel.json', import.meta.url);

test('exposes all six and only six three-section permutations', () => {
  assert.equal(SECTION_ORDERS.length, 6);
  assert.equal(new Set(SECTION_ORDERS.map((order) => order.join('|'))).size, 6);
  for (const order of SECTION_ORDERS) assert.equal(isSectionOrder(order), true);
  assert.equal(isSectionOrder(['quant', 'verbal', 'quant']), false);
  assert.equal(isSectionOrder(['quant', 'verbal']), false);
});

test('timer display is derived from a server deadline', () => {
  assert.equal(remainingSeconds('2026-08-22T10:05:00.000Z', Date.parse('2026-08-22T10:00:00.000Z')), 300);
  assert.equal(remainingSeconds('2026-08-22T09:59:59.000Z', Date.parse('2026-08-22T10:00:00.000Z')), 0);
  assert.equal(formatClock(300), '05:00');
  assert.equal(formatClock(60), '01:00');
});

test('student player uses sequential navigation and optimistic routine saves', async () => {
  const player = await readFile(playerUrl, 'utf8');
  assert.doesNotMatch(player, /Question navigator|mock-question-grid|mock-navigator/);
  assert.match(player, /function navigateTo/);
  assert.match(player, /optimistic:/);
  assert.match(player, /refreshAfter:true/);
  assert.match(player, /Saving…/);
});

test('Vercel functions run alongside the Singapore data source', async () => {
  const config = JSON.parse(await readFile(vercelConfigUrl, 'utf8'));
  assert.deepEqual(config.regions, ['sin1']);
});

test('migration enforces the Phase 3 authority and lifecycle boundaries', async () => {
  const sql = await readFile(migrationUrl, 'utf8');
  assert.match(sql, /unique \(assignment_id, student_id\)/);
  assert.match(sql, /review_edit_count >= 3/);
  assert.match(sql, /REVIEW_EDIT_LIMIT/);
  assert.match(sql, /deadline_at <= v_now/);
  assert.match(sql, /STALE_ATTEMPT/);
  assert.match(sql, /STALE_RESPONSE/);
  assert.doesNotMatch(sql, /errcode = '40001'/);
  assert.match(sql, /STALE_ATTEMPT' using errcode = 'P0001'/);
  assert.match(sql, /IDEMPOTENCY_KEY_REUSED/);
  assert.match(sql, /create table private\.mock_attempt_keys/);
  assert.match(sql, /revoke all on private\.mock_attempt_keys from anon, authenticated/);
  assert.doesNotMatch(sql, /grant select on private\.mock_attempt_keys/);
});
