import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('course preference storage is private and selection is enrollment-gated', async () => {
  const sql = await read('supabase/migrations/20260830133000_add_student_course_selection.sql');
  assert.match(sql, /create table public\.student_course_preferences/);
  assert.match(sql, /alter table public\.student_course_preferences enable row level security/);
  assert.match(sql, /revoke all on table public\.student_course_preferences from public, anon, authenticated/);
  assert.match(sql, /create or replace function public\.select_student_course\(p_course_id uuid\)/);
  assert.match(sql, /enrollment\.user_id = student_id\s+and enrollment\.course_id = p_course_id/);
  assert.match(sql, /profile\.role = 'student'\s+and profile\.is_active = true/);
  assert.match(sql, /revoke all on function public\.select_student_course\(uuid\) from public, anon/);
  assert.match(sql, /grant execute on function public\.select_student_course\(uuid\) to authenticated/);
});

test('all enrolled courses remain selectable regardless of operational status', async () => {
  const sql = await read('supabase/migrations/20260830133000_add_student_course_selection.sql');
  const optionsFunction = sql.match(/create or replace function public\.get_student_course_options\(\)[\s\S]*?revoke all on function public\.get_student_course_options/)?.[0] ?? '';
  assert.match(optionsFunction, /from public\.enrollments as enrollment\s+join public\.courses as course/);
  assert.match(optionsFunction, /where enrollment\.user_id = student_id/);
  assert.match(optionsFunction, /'is_active', course\.is_active/);
  assert.doesNotMatch(optionsFunction, /course\.is_active\s*=\s*true/);
});

test('student projections and mocks use the saved course selection', async () => {
  const [sql, mockLoader] = await Promise.all([
    read('supabase/migrations/20260830133000_add_student_course_selection.sql'),
    read('src/lib/server/mockAttempts.ts'),
  ]);
  assert.match(sql, /selected_course_id := public\.resolve_student_course_id\(student_id\)/g);
  assert.match(sql, /create or replace function public\.get_student_timeline\(\)/);
  assert.match(sql, /create or replace function public\.get_student_practice_log\(\)/);
  assert.match(mockLoader, /\.eq\('course_id', participant\.selectedCourseId\)/);
  assert.doesNotMatch(mockLoader, /\.in\('course_id', courseIds\)/);
});

test('multi-course students choose first and can switch later', async () => {
  const [authorization, page, action, header] = await Promise.all([
    read('src/lib/server/portalAuthorization.ts'),
    read('src/app/courses/page.tsx'),
    read('src/app/courses/actions.ts'),
    read('src/components/student/StudentHeader.tsx'),
  ]);
  assert.match(authorization, /identity\.courseCount > 1\s+&& !identity\.selectedCourseId/);
  assert.match(authorization, /redirect\('\/courses'\)/);
  assert.match(page, /including completed and historical batches/);
  assert.match(page, /selectStudentCourseAction/);
  assert.match(action, /rpc\('select_student_course'/);
  assert.match(header, /href="\/courses">Switch course/);
});
