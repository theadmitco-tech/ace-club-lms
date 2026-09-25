import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import mockAttempt from '../src/lib/mockAttempt.ts';

const { allowsSectionOrderSelection, categoryForQuestionType, formatClock, isSectionOrder, publishedSectionOrder, remainingSeconds, SECTION_ORDERS, sectionTimeSeconds, sectionOrders } = mockAttempt;

const migrationUrl = new URL('../supabase/migrations/20260822213000_add_mock_attempt_player.sql', import.meta.url);
const timeoutMigrationUrl = new URL('../supabase/migrations/20260823110000_advance_expired_mock_sections.sql', import.meta.url);
const rulesMigrationUrl = new URL('../supabase/migrations/20260823111000_enforce_gmat_player_rules.sql', import.meta.url);
const resetMigrationUrl = new URL('../supabase/migrations/20260823112000_add_preview_attempt_reset.sql', import.meta.url);
const playerUrl = new URL('../src/app/mocks/[attemptId]/MockPlayer.tsx', import.meta.url);
const attemptApiUrl = new URL('../src/app/api/student/mock-attempts/[attemptId]/route.ts', import.meta.url);
const attemptServerUrl = new URL('../src/lib/server/mockAttempts.ts', import.meta.url);
const playerCssUrl = new URL('../src/app/mocks/mocks.css', import.meta.url);
const builderUrl = new URL('../src/components/admin/MockBuilder.tsx', import.meta.url);
const builderServerUrl = new URL('../src/lib/server/mockBuilder.ts', import.meta.url);
const vercelConfigUrl = new URL('../vercel.json', import.meta.url);
const flexibleMigrationUrl = new URL('../supabase/migrations/20260924120000_add_mock_category_snapshots.sql', import.meta.url);
const categoryOrderMigrationUrl = new URL('../supabase/migrations/20260925100000_scope_mock_attempt_order_by_category.sql', import.meta.url);
const mocksListUrl = new URL('../src/app/mocks/MocksList.tsx', import.meta.url);

test('exposes all six and only six three-section permutations', () => {
  assert.equal(SECTION_ORDERS.length, 6);
  assert.equal(new Set(SECTION_ORDERS.map((order) => order.join('|'))).size, 6);
  for (const order of SECTION_ORDERS) assert.equal(isSectionOrder(order), true);
  assert.equal(isSectionOrder(['quant', 'verbal', 'quant']), false);
assert.equal(isSectionOrder(['quant', 'verbal']), true);
assert.equal(isSectionOrder(['verbal']), true);
assert.equal(isSectionOrder(['quant', 'quant']), false);
assert.equal(sectionTimeSeconds('quant', 1), 129);
assert.equal(sectionTimeSeconds('verbal', 23), 2700);
assert.equal(sectionTimeSeconds('data_insights', 10), 1350);
assert.equal(sectionOrders(['verbal']).length, 1);
assert.equal(sectionOrders(['quant', 'verbal']).length, 2);
});

test('supports RC-only, mixed sectional and full mocks with proportional timing', async () => {
  assert.equal(categoryForQuestionType('RC'), 'rc');
  assert.equal(categoryForQuestionType('CR'), 'cr');
  assert.equal(categoryForQuestionType('PS'), 'qa');
  assert.equal(categoryForQuestionType('GI'), 'di');
  assert.deepEqual(sectionOrders(['rc']), [['rc']]);
  assert.equal(sectionOrders(['rc', 'cr']).length, 2);
  assert.equal(isSectionOrder(['va']), true);
  assert.equal(sectionOrders(['quant', 'verbal', 'data_insights']).length, 6);
  assert.equal(sectionTimeSeconds('verbal', 11), 1291);
  assert.equal(sectionTimeSeconds('quant', 21), 2700);
  assert.equal(sectionTimeSeconds('data_insights', 20), 2700);
  const sql = await readFile(flexibleMigrationUrl, 'utf8');
  assert.match(sql, /category_key.*'qa','rc','cr','va','di'/s);
  assert.match(sql, /v_item\.time_limit_seconds/);
  assert.match(sql, /jsonb_array_length\(snapshot->'sections'\)/);
  assert.match(sql, /category_key = coalesce\(v_item\.category_key, v_item\.section\)/);
});

test('sectional mocks start in published order while only full mocks offer order selection', async () => {
  const rcOnly = [{ section: 'verbal', category_key: 'rc' }];
  const mixed = [
    { section: 'quant', category_key: 'qa' },
    { section: 'verbal', category_key: 'cr' },
    { section: 'data_insights', category_key: 'di' },
  ];
  const full = [
    { section: 'quant', category_key: 'quant' },
    { section: 'verbal', category_key: 'verbal' },
    { section: 'data_insights', category_key: 'data_insights' },
  ];

  assert.deepEqual(publishedSectionOrder(rcOnly), ['rc']);
  assert.deepEqual(publishedSectionOrder(mixed), ['qa', 'cr', 'di']);
  assert.equal(allowsSectionOrderSelection(rcOnly), false);
  assert.equal(allowsSectionOrderSelection(mixed), false);
  assert.equal(allowsSectionOrderSelection(full), true);

  const list = await readFile(mocksListUrl, 'utf8');
  assert.match(list, /allowsSectionOrderSelection\(sections\)/);
  assert.match(list, /'Start mock'/);
  assert.match(list, /start\(mock, publishedSectionOrder\(sections\)\)/);
  assert.match(list, />Choose section order</);
});

test('mock start and reset requests recover from network failures', async () => {
  const list = await readFile(mocksListUrl, 'utf8');
  assert.match(list, /signal: AbortSignal\.timeout\(20_000\)/);
  assert.match(list, /The request did not complete\. Check your connection and try again\./);
  assert.match(list, /The reset did not complete\. Check your connection and try again\./);
  assert.match(list, /finally \{\s*setBusy\(false\);\s*\}/);
});

test('attempt rows scope category order independently inside a parent section', async () => {
  const [categorySql, sql] = await Promise.all([
    readFile(flexibleMigrationUrl, 'utf8'),
    readFile(categoryOrderMigrationUrl, 'utf8'),
  ]);
  assert.match(categorySql, /mock_attempt_sections add unique \(attempt_id, category_key\)/);
  assert.match(sql, /drop constraint if exists mock_attempt_items_attempt_id_display_order_section_key/);
  assert.match(sql, /unique \(attempt_id, display_order, category_key\)/);
  assert.doesNotMatch(sql, /delete from|drop table|truncate/i);
});

test('mock builder isolates composition state while switching assessments', async () => {
  const builder = await readFile(builderUrl, 'utf8');
  assert.match(builder, /const chooseRequest=useRef\(0\)/);
  assert.match(builder, /setSelectedId\(id\); setSelected\(next\); setItems\(\[\]\)/);
  assert.match(builder, /if\(request!==chooseRequest\.current\)return/);
  assert.match(builder, /current\?\.id===id/);
});

test('timer display is derived from a server deadline', () => {
  assert.equal(remainingSeconds('2026-08-22T10:05:00.000Z', Date.parse('2026-08-22T10:00:00.000Z')), 300);
  assert.equal(remainingSeconds('2026-08-22T09:59:59.000Z', Date.parse('2026-08-22T10:00:00.000Z')), 0);
  assert.equal(formatClock(300), '05:00');
  assert.equal(formatClock(60), '01:00');
});

test('student player uses sequential navigation and optimistic routine saves', async () => {
  const [player, attemptApi] = await Promise.all([
    readFile(playerUrl, 'utf8'),
    readFile(attemptApiUrl, 'utf8'),
  ]);
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
  assert.match(player, /confirm_and_navigate/);
  assert.match(player, /includeState:options\.refreshAfter === true/);
  assert.match(player, /result\.state\) applyFullState/);
  assert.match(attemptApi, /body\.operation === 'confirm_and_navigate'/);
  assert.match(attemptApi, /derivedMutationId\(body\.clientMutationId, 'response'\)/);
  assert.match(attemptApi, /derivedMutationId\(body\.clientMutationId, 'navigate'\)/);
  assert.match(attemptApi, /state: await loadAttemptState\(identity\.id, attemptId\)/);
});

test('GI is stacked, answer controls align, and admin review can reorder every published question', async () => {
  const [player, attemptServer, css, builder, builderServer] = await Promise.all([
    readFile(playerUrl, 'utf8'),
    readFile(attemptServerUrl, 'utf8'),
    readFile(playerCssUrl, 'utf8'),
    readFile(builderUrl, 'utf8'),
    readFile(builderServerUrl, 'utf8'),
  ]);
  assert.match(player, /question_type === 'GI'.*mock-gi-stacked/);
  assert.match(player, /showCaption=\{item\.question_snapshot\.question_type !== 'GI'\}/);
  assert.match(player, /asset\.url \?\?/);
  assert.match(attemptServer, /createSignedUrls\([^;]+3600\)/s);
  assert.match(attemptServer, /width: media\.width_px/);
  assert.match(attemptServer, /height: media\.height_px/);
  assert.match(css, /\.mock-gi-stacked/);
  assert.match(css, /\.mock-single-choice label\{align-items:center\}/);
  assert.match(builder, /published available/);
  assert.match(builder, /Review the selected questions and reorder them here/);
  assert.match(builder, /available\.map/);
  assert.doesNotMatch(builder, /available\.slice/);
  assert.doesNotMatch(builderServer, /\.limit\(500\)/);
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
