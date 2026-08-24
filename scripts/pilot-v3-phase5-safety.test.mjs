import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const v3Migrations = [
  'supabase/migrations/20260821093017_add_mock_question_bank_foundation.sql',
  'supabase/migrations/20260821113000_fix_mock_answer_key_slot_count.sql',
  'supabase/migrations/20260821114500_add_mock_question_key_reader.sql',
  'supabase/migrations/20260821123000_add_mock_builder_release.sql',
  'supabase/migrations/20260821150000_add_mock_taxonomy_management.sql',
  'supabase/migrations/20260822110000_allow_msr_binary_matrix.sql',
  'supabase/migrations/20260822213000_add_mock_attempt_player.sql',
  'supabase/migrations/20260823100000_allow_mock_import_taxonomy_labels.sql',
  'supabase/migrations/20260823101000_allow_mock_builder_server_mutations.sql',
  'supabase/migrations/20260823102000_allow_reused_mock_media_bytes.sql',
  'supabase/migrations/20260823110000_advance_expired_mock_sections.sql',
  'supabase/migrations/20260823111000_enforce_gmat_player_rules.sql',
  'supabase/migrations/20260823112000_add_preview_attempt_reset.sql',
  'supabase/migrations/20260824150000_route_data_sufficiency_to_data_insights.sql',
  'supabase/migrations/20260824173000_add_mock_results_and_notes.sql',
  'supabase/migrations/20260824190000_add_mock_result_key_reader.sql',
];

test('every Mock Admin API authenticates an active Admin before privileged work', async () => {
  const routes = [
    'src/app/api/admin/mock-builder/route.ts',
    'src/app/api/admin/mock-namespaces/route.ts',
    'src/app/api/admin/mock-question-import/route.ts',
    'src/app/api/admin/mock-questions/route.ts',
    'src/app/api/admin/mock-questions/answer/route.ts',
    'src/app/api/admin/mock-questions/lifecycle/route.ts',
    'src/app/api/admin/mock-taxonomy/route.ts',
  ];
  for (const path of routes) {
    const source = await read(path);
    const handler = source.slice(source.indexOf('export async function'));
    const authorizationIndex = handler.search(/await requireAdmin\(\)/);
    assert(authorizationIndex >= 0, `${path} must call requireAdmin()`);
    const privilegedIndex = handler.search(/createMockAdminClient\(|\.rpc\(|\.from\(/);
    assert(privilegedIndex < 0 || authorizationIndex < privilegedIndex, `${path} must authorize before database work`);
  }

  const authorization = await read('src/lib/server/requireAdmin.ts');
  assert.match(authorization, /supabase\.auth\.getUser\(\)/);
  assert.match(authorization, /profile\.role !== 'admin'/);
  assert.match(authorization, /profile\.is_active === false/);
});

test('Student attempt APIs require an active Student identity and never cache private state', async () => {
  const routes = [
    'src/app/api/student/mock-attempts/route.ts',
    'src/app/api/student/mock-attempts/[attemptId]/route.ts',
    'src/app/api/student/mock-attempts/[attemptId]/notes/route.ts',
  ];
  for (const path of routes) {
    const source = await read(path);
    assert.match(source, /await getPortalIdentity\(\)/, `${path} must authenticate through the active-profile boundary`);
    assert.match(source, /identity\.role !== 'student'/, `${path} must require the Student role`);
    assert.match(source, /Cache-Control['"]?:?\s*['"]private, no-store|PRIVATE_NO_STORE/, `${path} must prevent private attempt data from being cached`);
  }
});

test('attempt tables and notes enforce Student ownership without direct mutation grants', async () => {
  const [attemptSql, noteSql] = await Promise.all([
    read('supabase/migrations/20260822213000_add_mock_attempt_player.sql'),
    read('supabase/migrations/20260824173000_add_mock_results_and_notes.sql'),
  ]);
  for (const table of ['mock_attempts', 'mock_attempt_sections', 'mock_attempt_items', 'mock_responses', 'mock_review_edits', 'mock_operation_receipts']) {
    assert.match(attemptSql, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
  }
  assert.match(attemptSql, /student_id = \(select auth\.uid\(\)\)/i);
  assert.doesNotMatch(attemptSql, /grant\s+(?:insert|update|delete|all)[^;]*mock_(?:attempts|attempt_sections|attempt_items|responses|review_edits|operation_receipts)/i);
  assert.match(attemptSql, /where id = p_attempt_id and student_id = v_student_id for update/i);

  assert.match(noteSql, /alter table public\.mock_attempt_item_notes enable row level security/i);
  assert.match(noteSql, /for insert\s+with check \(student_id = \(select auth\.uid\(\)\)\)/i);
  assert.match(noteSql, /for update\s+using \(student_id = \(select auth\.uid\(\)\)\) with check \(student_id = \(select auth\.uid\(\)\)\)/i);
  assert.match(noteSql, /v_attempt\.student_id <> new\.student_id or v_attempt\.status <> 'completed'/i);
  assert.doesNotMatch(noteSql, /create policy "Admins[^;]+for (?:insert|update|delete|all)/i);
});

test('answer keys and Mock media remain server-only and attempt-scoped', async () => {
  const [questionSql, attemptSql, questionReader, resultReader, studentMedia, adminMedia] = await Promise.all([
    read('supabase/migrations/20260821093017_add_mock_question_bank_foundation.sql'),
    read('supabase/migrations/20260822213000_add_mock_attempt_player.sql'),
    read('supabase/migrations/20260821114500_add_mock_question_key_reader.sql'),
    read('supabase/migrations/20260824190000_add_mock_result_key_reader.sql'),
    read('src/app/api/student/mock-attempts/[attemptId]/media/[mediaId]/route.ts'),
    read('src/app/api/admin/mock-attempts/[attemptId]/media/[mediaId]/route.ts'),
  ]);
  assert.match(questionSql, /values \('mock-media', 'mock-media', false,/i);
  assert.match(questionSql, /No client Storage policies are created/i);
  assert.match(questionSql, /revoke all on table private\.mock_question_keys from public, anon, authenticated/i);
  assert.match(attemptSql, /revoke all on private\.mock_attempt_keys from anon, authenticated/i);
  for (const reader of [questionReader, resultReader]) {
    assert.match(reader, /revoke all on function [^;]+ from public, anon, authenticated/i);
    assert.match(reader, /grant execute on function [^;]+ to service_role/i);
  }
  assert.doesNotMatch(resultReader, /explanation_json/i);
  assert.match(resultReader, /attempt\.status = 'completed'/i);

  assert.match(studentMedia, /\.eq\('student_id', identity\.id\)/);
  assert.match(adminMedia, /\.eq\('status', 'completed'\)/);
  for (const route of [studentMedia, adminMedia]) {
    assert.match(route, /mock_question_media/);
    assert.match(route, /mock_stimulus_media/);
    assert.match(route, /createSignedUrl\(media\.storage_path, 60\)/);
    assert.match(route, /'Cache-Control': 'private, no-store'/);
  }
});

test('attempt mutation is idempotent, stale-write safe, server-timed, and completion-locked', async () => {
  const [attemptSql, timeoutSql, rulesSql] = await Promise.all([
    read('supabase/migrations/20260822213000_add_mock_attempt_player.sql'),
    read('supabase/migrations/20260823110000_advance_expired_mock_sections.sql'),
    read('supabase/migrations/20260823111000_enforce_gmat_player_rules.sql'),
  ]);
  assert.match(attemptSql, /client_mutation_id uuid not null/);
  assert.match(attemptSql, /IDEMPOTENCY_KEY_REUSED/);
  assert.match(attemptSql, /STALE_ATTEMPT/);
  assert.match(attemptSql, /STALE_RESPONSE/);
  assert.match(attemptSql, /if v_attempt\.status = 'completed' then raise exception 'ATTEMPT_COMPLETED'/i);
  assert.match(attemptSql, /deadline_at = v_now \+ make_interval\(secs => time_limit_seconds\)/i);
  assert.match(timeoutSql, /for update/);
  assert.match(timeoutSql, /status = 'timed_out'/);
  assert.match(attemptSql, /REVIEW_EDIT_LIMIT|review_edit_count >= 3/);
  assert.match(rulesSql, /enforce_mock_navigation_progression/);
});

test('published questions, mocks, and attempt snapshots retain immutable history', async () => {
  const [questionSql, builderSql, attemptSql, notesSql] = await Promise.all([
    read('supabase/migrations/20260821093017_add_mock_question_bank_foundation.sql'),
    read('supabase/migrations/20260821123000_add_mock_builder_release.sql'),
    read('supabase/migrations/20260822213000_add_mock_attempt_player.sql'),
    read('supabase/migrations/20260824173000_add_mock_results_and_notes.sql'),
  ]);
  assert.match(questionSql, /enforce_mock_question_revision_immutability/);
  assert.match(questionSql, /enforce_mock_stimulus_revision_immutability/);
  assert.match(builderSql, /snapshot jsonb not null/);
  assert.match(attemptSql, /question_snapshot jsonb not null/);
  assert.match(attemptSql, /response_config_snapshot jsonb not null/);
  assert.match(attemptSql, /stimulus_snapshot jsonb/);
  assert.match(notesSql, /on delete restrict/g);
  for (const sql of [questionSql, builderSql, attemptSql, notesSql]) {
    assert.doesNotMatch(sql, /on delete cascade/i);
  }
});

test('V3 migrations preserve legacy LMS rows and support application-only rollback', async () => {
  const forbiddenLegacyMutation = /\b(?:insert into|update|delete from|truncate|alter table|drop table)\s+(?:public\.)?(?:courses|sessions|materials|enrollments|student_question_logs|practice_sets)\b/i;
  for (const path of v3Migrations) {
    const sql = await read(path);
    assert.doesNotMatch(sql, forbiddenLegacyMutation, `${path} must not mutate existing LMS entities`);
    assert.doesNotMatch(sql, /drop table\s+(?:public\.|private\.)?mock_/i, `${path} must not require destructive rollback`);
  }

  const navigation = await Promise.all([
    read('src/components/AdminSidebar.tsx'),
    read('src/components/StudentSidebar.tsx'),
  ]).catch(() => []);
  if (navigation.length) {
    assert(navigation.every((source) => !source.includes('SUPABASE_SERVICE_ROLE_KEY')), 'navigation must not depend on privileged data or delete history');
  }
});

test('Mock UI exposes native semantics, visible focus, responsive layouts, and image alternatives', async () => {
  const [player, renderer, results, css] = await Promise.all([
    read('src/app/mocks/[attemptId]/MockPlayer.tsx'),
    read('src/components/mock/MockQuestionContent.tsx'),
    read('src/components/mock/MockResultView.tsx'),
    read('src/app/mocks/mocks.css'),
  ]);
  assert.match(player, /<button|<input/);
  assert.match(renderer, /alt=/);
  assert.match(renderer, /<table|role=/);
  assert.match(results, /role="tablist"/);
  assert.match(results, /aria-selected/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media \(max-width:/);
  assert.match(css, /overflow(?:-x)?:\s*auto/);
  assert.match(css, /\.mock-results\{[^}]*min-width:0/);
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});
