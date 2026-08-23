import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import mockAttempt from '../src/lib/mockAttempt.ts';

const { formatClock, isSectionOrder, remainingSeconds, SECTION_ORDERS } = mockAttempt;

const migrationUrl = new URL('../supabase/migrations/20260822213000_add_mock_attempt_player.sql', import.meta.url);
const timeoutMigrationUrl = new URL('../supabase/migrations/20260823110000_advance_expired_mock_sections.sql', import.meta.url);
const rulesMigrationUrl = new URL('../supabase/migrations/20260823111000_enforce_gmat_player_rules.sql', import.meta.url);
const resetMigrationUrl = new URL('../supabase/migrations/20260823112000_add_preview_attempt_reset.sql', import.meta.url);
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
  assert.doesNotMatch(player, />Previous</);
  assert.match(player, /function navigateTo/);
  assert.match(player, /optimistic:/);
  assert.match(player, /refreshAfter:true/);
  assert.match(player, /Saving…/);
  assert.match(player, /Question Review &amp; Edit/);
  assert.match(player, /Confirm your answer\?/);
  assert.match(player, /answerComplete/);
  assert.match(player, /setDraftResponses/);
});

test('Vercel functions run alongside the Singapore data source', async () => {
  const config = JSON.parse(await readFile(vercelConfigUrl, 'utf8'));
  assert.deepEqual(config.regions, ['sin1']);
});

test('expired sections advance idempotently instead of accepting late interactions', async () => {
  const player = await readFile(playerUrl, 'utf8');
  const sql = await readFile(timeoutMigrationUrl, 'utf8');
  assert.match(player, /mutate\('timeout'/);
  assert.match(player, /Time is up/);
  assert.match(sql, /create or replace function public\.advance_mock_attempt_timeout/);
  assert.match(sql, /v_section\.deadline_at > v_now/);
  assert.match(sql, /current_section_index = current_section_index \+ 1/);
  assert.match(sql, /status = 'completed'/);
  assert.match(sql, /v_section\.status = 'pending'/);
});

test('database enforces official sequential answering, review and break boundaries', async () => {
  const sql = await readFile(rulesMigrationUrl, 'utf8');
  assert.match(sql, /ANSWER_REQUIRED/);
  assert.match(sql, /QUESTIONS_MUST_BE_SEQUENTIAL/);
  assert.match(sql, /RESPONSE_ALREADY_CONFIRMED/);
  assert.match(sql, /ALL_QUESTIONS_MUST_BE_ANSWERED/);
  assert.match(sql, /QUESTION_REVIEW_REQUIRED/);
  assert.match(sql, /preserve_optional_break_after_first_section/);
});

test('test-attempt reset is ownership-scoped and unavailable to authenticated clients directly', async () => {
  const sql = await readFile(resetMigrationUrl, 'utf8');
  assert.match(sql, /student_id = p_student_id/);
  assert.match(sql, /delete from private\.mock_attempt_keys/);
  assert.match(sql, /revoke all on function public\.reset_mock_attempt_for_testing\(uuid, uuid\) from public, anon, authenticated/);
  assert.match(sql, /grant execute on function public\.reset_mock_attempt_for_testing\(uuid, uuid\) to service_role/);
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
