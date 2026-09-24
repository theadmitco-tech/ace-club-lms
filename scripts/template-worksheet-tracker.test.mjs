import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationPath = '../supabase/migrations/20260906132807_add_material_worksheet_tracker.sql';
const readMigration = () => readFile(new URL(migrationPath, import.meta.url), 'utf8');
const readRollback = () => readFile(
  new URL('../supabase/rollback/20260906132807_disable_material_worksheet_tracker.sql', import.meta.url),
  'utf8',
);

test('adds an isolated material-backed question catalog without changing master tables', async () => {
  const sql = await readMigration();

  assert.match(sql, /create table public\.material_worksheet_questions/);
  assert.match(sql, /create table public\.student_material_question_logs/);
  assert.match(sql, /alter table public\.material_worksheet_questions enable row level security/);
  assert.match(sql, /alter table public\.student_material_question_logs enable row level security/);
  assert.match(sql, /revoke all on table public\.material_worksheet_questions from public, anon, authenticated/);
  assert.match(sql, /revoke all on table public\.student_material_question_logs from public, anon, authenticated/);
  assert.doesNotMatch(sql, /alter table public\.student_question_logs/);
  assert.doesNotMatch(sql, /alter table public\.master_worksheet_questions/);
});

test('builds standalone worksheet questions from question_count regardless of course mode', async () => {
  const sql = await readMigration();
  const syncFunction = sql.match(
    /create or replace function public\.sync_material_worksheet_question_rows\(\)[\s\S]*?revoke all on function public\.sync_material_worksheet_question_rows/,
  )?.[0] ?? '';

  assert.match(syncFunction, /new\.type = 'worksheet'/);
  assert.match(syncFunction, /new\.master_material_id is null/);
  assert.match(syncFunction, /generate_series\(1, new\.question_count\)/);
  assert.doesNotMatch(syncFunction, /course_mode/);
  assert.match(sql, /after insert or update of type, master_material_id, question_count\s+on public\.materials/);
});

test('keeps the existing RPC contracts while reading both worksheet sources', async () => {
  const sql = await readMigration();

  assert.match(sql, /create view public\.worksheet_question_catalog\s+with \(security_invoker = true\)/);
  assert.match(sql, /create view public\.worksheet_question_log_catalog\s+with \(security_invoker = true\)/);
  assert.match(sql, /create or replace function public\.get_student_practice_log\(\)/);
  assert.match(sql, /create or replace function public\.get_student_worksheet_log\(p_material_id uuid\)/);
  assert.match(sql, /create or replace function public\.update_student_question_log\(\s*p_material_id uuid,\s*p_question_id uuid,/);
  assert.match(sql, /create or replace function public\.get_student_timeline\(\)/);
  assert.match(sql, /create or replace function public\.get_admin_course_practice_progress\(p_course_id uuid\)/);
  assert.match(sql, /create or replace function public\.get_admin_student_worksheet_progress/);
  assert.match(sql, /join public\.worksheet_question_catalog as question/);
  assert.match(sql, /join public\.worksheet_question_log_catalog as log/);
});

test('preserves release, publication, enrollment, and student ownership gates', async () => {
  const sql = await readMigration();

  assert.match(sql, /material\.available_from <= statement_timestamp\(\)/g);
  assert.match(sql, /session\.is_published = true/g);
  assert.match(sql, /enrollment\.user_id = student_id and enrollment\.course_id = session\.course_id/);
  assert.match(sql, /profile\.id = student_id and profile\.role = 'student' and profile\.is_active = true/);
  assert.match(sql, /revoke all on function public\.update_student_question_log[\s\S]*from public, anon/);
  assert.match(sql, /grant execute on function public\.update_student_question_log[\s\S]*to authenticated/);
});

test('ships a no-data-loss emergency rollback that preserves Full Course tracking', async () => {
  const rollback = await readRollback();

  assert.match(rollback, /create or replace view public\.worksheet_question_catalog/);
  assert.match(rollback, /join public\.master_worksheet_questions as question/);
  assert.doesNotMatch(rollback, /drop table/);
  assert.doesNotMatch(rollback, /delete from public\.student_material_question_logs/);
  assert.match(rollback, /create or replace function public\.update_student_question_log/);
  assert.match(rollback, /update public\.student_question_logs as log/);
  assert.doesNotMatch(rollback, /insert into public\.student_material_question_logs/);
});
