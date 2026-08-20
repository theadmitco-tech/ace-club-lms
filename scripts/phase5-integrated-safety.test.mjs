import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const v2MigrationPaths = [
  'supabase/migrations/20260817090845_add_versioned_course_templates.sql',
  'supabase/migrations/20260817143000_add_batch_schedule_builder.sql',
  'supabase/migrations/20260817170000_fix_batch_event_reorder.sql',
  'supabase/migrations/20260817233540_fix_phase2_conflicts_and_shift_materials.sql',
  'supabase/migrations/20260818113000_add_flexible_batch_resources.sql',
  'supabase/migrations/20260818170000_add_student_portal_projection.sql',
  'supabase/migrations/20260818173000_fix_student_portal_projection_compatibility.sql',
];

test('Student and Admin route groups enforce active role authorization', async () => {
  const guards = await Promise.all([
    read('src/app/dashboard/layout.tsx'),
    read('src/app/schedule/layout.tsx'),
    read('src/app/resources/layout.tsx'),
    read('src/app/session/layout.tsx'),
    read('src/app/admin/layout.tsx'),
  ]);

  for (const guard of guards.slice(0, 4)) {
    assert.match(guard, /requirePortalRole\('student'\)/);
  }
  assert.match(guards[4], /requirePortalRole\('admin'\)/);

  const authorization = await read('src/lib/server/portalAuthorization.ts');
  assert.match(authorization, /supabase\.auth\.getUser\(\)/);
  assert.match(authorization, /!profile\?\.is_active/);
  assert.match(authorization, /profile\.role !== 'admin' && profile\.role !== 'student'/);
  assert.match(authorization, /identity\.role !== role/);
});

test('every Pilot V2 Admin mutation entry point re-authorizes the caller', async () => {
  const actionPaths = [
    'src/app/admin/courses/actions.ts',
    'src/app/admin/sessions/actions.ts',
    'src/app/admin/templates/actions.ts',
    'src/app/admin/resources/actions.ts',
  ];

  for (const path of actionPaths) {
    const source = await read(path);
    assert.match(source, /requirePortalRole\('admin'\)/, `${path} must authorize Admin access`);
  }

  const uploadPaths = [
    'src/app/api/admin/resource-upload/route.ts',
    'src/app/api/admin/template-resource-upload/route.ts',
  ];
  for (const path of uploadPaths) {
    const source = await read(path);
    assert.match(source, /await requireAdmin\(\)/, `${path} must authorize Admin access`);
    assert.match(source, /if \(!authorization\.authorized\)/, `${path} must stop unauthorized requests`);
  }
});

test('protected PDFs authorize through RLS before service-role signing and never cache', async () => {
  const route = await read('src/app/api/materials/file/route.ts');
  const authIndex = route.indexOf('supabase.auth.getUser()');
  const activeIndex = route.indexOf(".select('is_active')");
  const materialIndex = route.indexOf(".from('materials')");
  const serviceRoleIndex = route.indexOf('createAdminClient(');

  assert(authIndex > 0);
  assert(activeIndex > authIndex);
  assert(materialIndex > activeIndex);
  assert(serviceRoleIndex > materialIndex);
  assert.match(route, /isSupportedProtectedMaterialPath\(path\)/);
  assert.match(route, /\.eq\('file_url', fileUrl\)/);
  assert.match(route, /\.eq\('type', expectedType\)/);
  assert.match(route, /createSignedUrl\(path, 60\)/);
  assert.equal(route.match(/'Cache-Control': 'private, no-store'/g)?.length, 2);
});

test('tracker ownership and Admin progress remain least-privilege and read-only', async () => {
  const [studentSql, adminSql, studentData, adminData] = await Promise.all([
    read('supabase/migrations/20260803120000_add_student_practice_log.sql'),
    read('supabase/migrations/20260803160000_add_admin_practice_progress.sql'),
    read('src/lib/server/studentPractice.ts'),
    read('src/lib/server/adminPractice.ts'),
  ]);

  assert.match(studentSql, /alter table public\.student_question_logs enable row level security/i);
  assert.match(studentSql, /user_id = auth\.uid\(\)/i);
  assert.match(studentSql, /student_id uuid := auth\.uid\(\)/i);
  assert.match(studentSql, /update public\.student_question_logs as log[\s\S]*log\.user_id = student_id/i);
  assert.match(studentSql, /revoke all on function public\.update_student_question_log[\s\S]*from public/i);
  assert.match(studentData, /rpc\('get_student_practice_log'\)/);
  assert.match(studentData, /rpc\('get_student_worksheet_log'/);

  assert.match(adminSql, /auth\.uid\(\) is null or not public\.is_portal_admin\(\)/i);
  assert.match(adminSql, /left join public\.student_question_logs as log/i);
  assert.doesNotMatch(adminSql, /\b(insert into|update|delete from)\s+public\.student_question_logs\b/i);
  assert.match(adminData, /rpc\('get_admin_course_practice_progress'/);
  assert.match(adminData, /rpc\('get_admin_student_worksheet_progress'/);
  assert.doesNotMatch(adminData, /\.from\('student_question_logs'\)|\.insert\(|\.update\(|\.delete\(/);
});

test('Pilot V2 migrations never rewrite canonical Student tracker rows', async () => {
  for (const path of v2MigrationPaths) {
    const sql = await read(path);
    assert.doesNotMatch(
      sql,
      /\b(alter table|drop table|truncate|insert into|update|delete from)\s+(?:public\.)?student_question_logs\b/i,
      `${path} must preserve Student tracker rows`,
    );
  }
});

test('schedule changes move only unreleased material timestamps and keep material identity', async () => {
  const migrationPaths = [
    'supabase/migrations/20260817143000_add_batch_schedule_builder.sql',
    'supabase/migrations/20260817170000_fix_batch_event_reorder.sql',
    'supabase/migrations/20260817233540_fix_phase2_conflicts_and_shift_materials.sql',
  ];

  for (const path of migrationPaths) {
    const sql = await read(path);
    assert.match(sql, /update public\.materials(?: as \w+| \w+)?\s+(?:set|\w+ set)\s+available_from/i);
    assert.match(sql, /available_from > statement_timestamp\(\)/i);
    assert.doesNotMatch(sql, /update public\.materials(?: as \w+| \w+)?\s+set\s+(?:id|session_id|course_id)\s*=/i);
  }
});

test('template and projection migrations preserve existing batch snapshots', async () => {
  const [templates, projection, compatibility] = await Promise.all([
    read('supabase/migrations/20260817090845_add_versioned_course_templates.sql'),
    read('supabase/migrations/20260818170000_add_student_portal_projection.sql'),
    read('supabase/migrations/20260818173000_fix_student_portal_projection_compatibility.sql'),
  ]);

  assert.doesNotMatch(templates, /update\s+public\.courses\s+set\s+source_template/i);
  for (const sql of [projection, compatibility]) {
    assert.doesNotMatch(sql, /\b(insert into|update|delete from|truncate)\s+public\.(courses|sessions|materials|enrollments)\b/i);
    assert.match(sql, /create or replace function public\.get_student_timeline\(\)/i);
  }
});

test('recordings and Session materials remain bound to one batch event', async () => {
  const sql = await read('supabase/migrations/20260818113000_add_flexible_batch_resources.sql');
  assert.match(sql, /p_category in \('recording', 'session_material'\)[\s\S]*p_resource_scope <> 'event'/i);
  assert.match(sql, /Recordings and Session materials must belong to one batch event/i);
  assert.match(sql, /materials_batch_owned_resource_check[\s\S]*category not in \('recording', 'session_material'\)[\s\S]*resource_scope = 'event'[\s\S]*session_id is not null[\s\S]*master_material_id is null/i);
  assert.match(sql, /source_template_resource_id is null or category in \('starter_pack', 'pre_read', 'worksheet'\)/i);
});
