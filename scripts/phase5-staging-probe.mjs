import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const projectRef = 'eyphkkginlgoaxflauog';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey && process.env.PHASE5_LOAD_SERVICE_KEY === 'supabase-cli') {
  const keyMetadata = JSON.parse(execFileSync('npx', [
    '--yes',
    'supabase@2.114.0',
    'projects',
    'api-keys',
    '--project-ref',
    projectRef,
    '--output',
    'json',
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }));
  serviceRoleKey = keyMetadata.find((key) => key.id === 'service_role')?.api_key;
}

if (!url || !anonKey || !serviceRoleKey) throw new Error('Staging Supabase credentials are required.');
if (!url.includes(projectRef)) throw new Error('Phase 5 probe refused: this is not approved Staging.');

const options = { auth: { autoRefreshToken: false, persistSession: false } };
const service = createClient(url, serviceRoleKey, options);
const runId = randomUUID();
const password = `P5-${randomUUID()}!aA1`;
const users = [
  { label: 'admin', role: 'admin' },
  { label: 'student-a', role: 'student' },
  { label: 'student-b', role: 'student' },
].map((user) => ({ ...user, email: `phase5-${user.label}-${runId}@example.invalid` }));
const createdUserIds = [];
const courseIds = [];
const checks = {};
const trackedTables = ['courses', 'sessions', 'materials', 'enrollments', 'student_question_logs'];

function assertNoError(error, context) {
  if (error) throw new Error(`${context}: ${error.message}`);
}

async function signIn(email) {
  const client = createClient(url, anonKey, options);
  const { error } = await client.auth.signInWithPassword({ email, password });
  assertNoError(error, 'Sign in disposable fixture');
  return client;
}

async function exactCount(table) {
  const { count, error } = await service.from(table).select('id', { count: 'exact', head: true });
  assertNoError(error, `Count ${table}`);
  return count ?? 0;
}

async function aggregateSnapshot() {
  return Object.fromEntries(await Promise.all(trackedTables.map(async (table) => [table, await exactCount(table)])));
}

async function removeCourse(courseId) {
  const { data: sessions, error: sessionsError } = await service.from('sessions').select('id').eq('course_id', courseId);
  assertNoError(sessionsError, 'Read cleanup sessions');
  const sessionIds = sessions.map((row) => row.id);
  assertNoError((await service.from('materials').delete().eq('course_id', courseId)).error, 'Delete cleanup resources');
  if (sessionIds.length) {
    assertNoError((await service.from('practice_sets').delete().in('session_id', sessionIds)).error, 'Delete cleanup practice sets');
  }
  assertNoError((await service.from('enrollments').delete().eq('course_id', courseId)).error, 'Delete cleanup enrollments');
  assertNoError((await service.from('sessions').delete().eq('course_id', courseId)).error, 'Delete cleanup sessions');
  assertNoError((await service.from('courses').delete().eq('id', courseId)).error, 'Delete cleanup batch');
}

async function createResource(admin, input) {
  const { data, error } = await admin.rpc('save_batch_resource', {
    p_course_id: input.courseId,
    p_title: input.title,
    p_category: input.category,
    p_resource_scope: input.scope,
    p_resource_format: input.format,
    p_section_key: null,
    p_session_id: input.sessionId ?? null,
    p_notion_url: null,
    p_file_url: input.fileUrl ?? null,
    p_video_url: input.videoUrl ?? null,
    p_text_content: input.textContent ?? null,
    p_material_id: null,
  });
  assertNoError(error, `Create ${input.category} fixture`);
  return data.id;
}

function milliseconds(value) {
  return new Date(value).getTime();
}

const before = await aggregateSnapshot();
let cleanupFailure;

try {
  for (const user of users) {
    const { data, error } = await service.auth.admin.createUser({
      email: user.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: `Phase 5 ${user.label}` },
    });
    assertNoError(error, `Create ${user.label} fixture`);
    user.id = data.user.id;
    createdUserIds.push(user.id);
  }

  assertNoError((await service.from('profiles').upsert(users.map((user) => ({
    id: user.id,
    email: user.email,
    full_name: `Phase 5 ${user.label}`,
    role: user.role,
    is_active: true,
  })))).error, 'Prepare disposable profiles');

  const admin = await signIn(users[0].email);
  const studentA = await signIn(users[1].email);
  const studentB = await signIn(users[2].email);

  const { data: templates, error: templatesError } = await service.from('course_templates')
    .select('id,template_key,current_revision_id')
    .in('template_key', ['di-crash-course', 'full-course']);
  assertNoError(templatesError, 'Read batch templates');
  assert.equal(templates.length, 2, 'Expected both probe templates');

  for (const templateKey of ['di-crash-course', 'full-course']) {
    const template = templates.find((item) => item.template_key === templateKey);
    const { data, error } = await admin.rpc('confirm_template_batch_v2', {
      p_name: `Phase 5 integrated probe ${templateKey} ${runId}`,
      p_template_id: template.id,
      p_expected_revision_id: template.current_revision_id,
      p_start_date: '2028-06-01',
      p_publication_state: 'published',
      p_idempotency_key: randomUUID(),
    });
    assertNoError(error, `Create ${templateKey} batch`);
    courseIds.push(data.courseId);
  }

  const [batchA, batchB] = courseIds;
  assertNoError((await service.from('enrollments').insert([
    { user_id: users[1].id, course_id: batchA },
    { user_id: users[2].id, course_id: batchA },
  ])).error, 'Create student enrollments');

  const { data: sessionsA, error: sessionsAError } = await service.from('sessions')
    .select('id,session_date,session_end_at,display_order').eq('course_id', batchA).order('display_order');
  const { data: sessionsB, error: sessionsBError } = await service.from('sessions')
    .select('id').eq('course_id', batchB).order('display_order');
  assertNoError(sessionsAError, 'Read Batch A schedule');
  assertNoError(sessionsBError, 'Read Batch B schedule');
  assert(sessionsA.length > 0 && sessionsB.length > 0, 'Expected events in both batches');
  checks.different_template_schedules = sessionsA.length !== sessionsB.length;
  const firstSession = sessionsA[0];

  const recordingId = await createResource(admin, {
    courseId: batchA,
    sessionId: firstSession.id,
    title: `Phase 5 recording ${runId}`,
    category: 'recording',
    scope: 'event',
    format: 'youtube',
    videoUrl: 'https://youtu.be/dQw4w9WgXcQ',
  });
  const batchBMarkerId = await createResource(admin, {
    courseId: batchB,
    title: `Phase 5 cross-batch marker ${runId}`,
    category: 'starter_pack',
    scope: 'standalone',
    format: 'text',
    textContent: 'Disposable cross-batch isolation marker.',
  });
  assertNoError((await service.from('materials').update({ available_from: new Date(Date.now() - 60_000).toISOString() })
    .eq('id', recordingId)).error, 'Release recording fixture');

  const { data: masterQuestion, error: masterQuestionError } = await service.from('master_worksheet_questions')
    .select('id,master_material_id').order('question_number').limit(1).single();
  assertNoError(masterQuestionError, 'Read Master worksheet fixture');
  const worksheetId = await createResource(admin, {
    courseId: batchA,
    sessionId: firstSession.id,
    title: `Phase 5 worksheet ${runId}`,
    category: 'worksheet',
    scope: 'event',
    format: 'pdf',
    fileUrl: `/api/materials/file?path=worksheets%2F${randomUUID()}%2F${randomUUID()}.pdf`,
  });
  const releasedAt = new Date(Date.now() - 60_000).toISOString();
  assertNoError((await service.from('materials').update({
    master_material_id: masterQuestion.master_material_id,
    available_from: releasedAt,
  }).eq('id', worksheetId)).error, 'Link and release worksheet fixture');

  const timelineAResult = await studentA.rpc('get_student_timeline');
  assertNoError(timelineAResult.error, 'Read Student A timeline');
  const projectedResourceIds = new Set([
    ...timelineAResult.data.resources.map((resource) => resource.id),
    ...timelineAResult.data.sessions.flatMap((session) => session.materials.map((material) => material.id)),
  ]);
  checks.batch_resource_isolation = projectedResourceIds.has(recordingId)
    && !projectedResourceIds.has(batchBMarkerId);

  const { data: allFixtureLogs, error: allFixtureLogsError } = await service.from('student_question_logs')
    .select('id,user_id,course_id,session_id,material_id,master_question_id,status,time_taken_seconds,comment')
    .eq('material_id', worksheetId);
  assertNoError(allFixtureLogsError, 'Read provisioned tracker fixtures');
  const logsA = allFixtureLogs.filter((row) => row.user_id === users[1].id);
  const logsB = allFixtureLogs.filter((row) => row.user_id === users[2].id);
  assert(logsA.length > 0 && logsA.length === logsB.length, 'Expected equal tracker rows for both students');

  const { data: directA, error: directAError } = await studentA.from('student_question_logs')
    .select('id,user_id').eq('material_id', worksheetId);
  const { data: directB, error: directBError } = await studentB.from('student_question_logs')
    .select('id,user_id').eq('material_id', worksheetId);
  assertNoError(directAError, 'Read Student A tracker rows');
  assertNoError(directBError, 'Read Student B tracker rows');
  checks.cross_student_tracker_denied = directA.length === logsA.length
    && directB.length === logsB.length
    && directA.every((row) => row.user_id === users[1].id)
    && directB.every((row) => row.user_id === users[2].id);

  const target = logsA[0];
  const updateResult = await studentA.rpc('update_student_question_log', {
    p_material_id: worksheetId,
    p_question_id: target.master_question_id,
    p_status: 'done',
    p_time_taken_seconds: 95,
    p_comment: 'Phase 5 persistence marker',
  });
  assertNoError(updateResult.error, 'Update Student A tracker row');
  checks.student_tracker_update = updateResult.data.status === 'done'
    && updateResult.data.time_taken_seconds === 95
    && updateResult.data.comment === 'Phase 5 persistence marker';

  const studentAdminAttempt = await studentA.rpc('get_admin_course_practice_progress', { p_course_id: batchA });
  const adminStudentAttempt = await admin.rpc('get_student_timeline');
  checks.role_specific_rpc_denial = studentAdminAttempt.error?.code === '42501'
    && adminStudentAttempt.error?.code === '42501';

  const adminBeforeResult = await admin.rpc('get_admin_course_practice_progress', { p_course_id: batchA });
  assertNoError(adminBeforeResult.error, 'Read Admin progress before shift');
  const progressA = adminBeforeResult.data.progress.find((row) => row.user_id === users[1].id && row.material_id === worksheetId);
  const progressB = adminBeforeResult.data.progress.find((row) => row.user_id === users[2].id && row.material_id === worksheetId);
  checks.admin_aggregate_parity_before_shift = progressA?.done_count === 1 && progressB?.done_count === 0;

  const adminDetailBeforeResult = await admin.rpc('get_admin_student_worksheet_progress', {
    p_course_id: batchA,
    p_user_id: users[1].id,
    p_material_id: worksheetId,
  });
  assertNoError(adminDetailBeforeResult.error, 'Read Admin worksheet detail before shift');
  const detailBefore = adminDetailBeforeResult.data.worksheet.questions.find((question) => question.id === target.master_question_id);
  assert(detailBefore, 'Expected Admin tracker detail');

  const { data: courseBefore, error: courseBeforeError } = await service.from('courses')
    .select('schedule_revision').eq('id', batchA).single();
  assertNoError(courseBeforeError, 'Read schedule revision');
  const shiftResult = await admin.rpc('shift_batch_schedule', {
    p_course_id: batchA,
    p_selected_session_id: firstSession.id,
    p_days: 2,
    p_expected_schedule_revision: courseBefore.schedule_revision,
  });
  assertNoError(shiftResult.error, 'Shift Batch A schedule');

  const { data: sessionsAfter, error: sessionsAfterError } = await service.from('sessions')
    .select('id,session_date,session_end_at,display_order').eq('course_id', batchA).order('display_order');
  assertNoError(sessionsAfterError, 'Read shifted schedule');
  checks.schedule_shifted_exactly_two_days = sessionsAfter.length === sessionsA.length
    && sessionsAfter.every((session, index) => milliseconds(session.session_date) - milliseconds(sessionsA[index].session_date) === 2 * 86_400_000
      && milliseconds(session.session_end_at) - milliseconds(sessionsA[index].session_end_at) === 2 * 86_400_000);

  const { data: persisted, error: persistedError } = await service.from('student_question_logs')
    .select('id,user_id,course_id,session_id,material_id,master_question_id,status,time_taken_seconds,comment')
    .eq('id', target.id).single();
  const { data: worksheetAfter, error: worksheetAfterError } = await service.from('materials')
    .select('id,course_id,session_id,master_material_id,available_from').eq('id', worksheetId).single();
  assertNoError(persistedError, 'Read tracker after shift');
  assertNoError(worksheetAfterError, 'Read worksheet after shift');
  checks.released_tracker_persisted_after_shift = persisted.id === target.id
    && persisted.user_id === users[1].id
    && persisted.course_id === batchA
    && persisted.session_id === firstSession.id
    && persisted.material_id === worksheetId
    && persisted.master_question_id === target.master_question_id
    && persisted.status === 'done'
    && persisted.time_taken_seconds === 95
    && persisted.comment === 'Phase 5 persistence marker'
    && worksheetAfter.course_id === batchA
    && worksheetAfter.session_id === firstSession.id
    && worksheetAfter.master_material_id === masterQuestion.master_material_id
    && milliseconds(worksheetAfter.available_from) === milliseconds(releasedAt);

  const adminAfterResult = await admin.rpc('get_admin_course_practice_progress', { p_course_id: batchA });
  const adminDetailAfterResult = await admin.rpc('get_admin_student_worksheet_progress', {
    p_course_id: batchA,
    p_user_id: users[1].id,
    p_material_id: worksheetId,
  });
  assertNoError(adminAfterResult.error, 'Read Admin progress after shift');
  assertNoError(adminDetailAfterResult.error, 'Read Admin worksheet detail after shift');
  const progressAfterA = adminAfterResult.data.progress.find((row) => row.user_id === users[1].id && row.material_id === worksheetId);
  const progressAfterB = adminAfterResult.data.progress.find((row) => row.user_id === users[2].id && row.material_id === worksheetId);
  const detailAfter = adminDetailAfterResult.data.worksheet.questions.find((question) => question.id === target.master_question_id);
  checks.admin_parity_after_shift = progressAfterA?.done_count === 1
    && progressAfterB?.done_count === 0
    && detailAfter?.status === detailBefore.status
    && detailAfter?.time_taken_seconds === detailBefore.time_taken_seconds
    && detailAfter?.comment === detailBefore.comment;

  const readonlyAttempt = await admin.from('student_question_logs')
    .update({ comment: 'Admin must not write' }).eq('id', target.id).select('id');
  const { data: afterReadonly, error: afterReadonlyError } = await service.from('student_question_logs')
    .select('comment').eq('id', target.id).single();
  assertNoError(readonlyAttempt.error, 'Attempt Admin tracker update');
  assertNoError(afterReadonlyError, 'Verify Admin tracker readonly state');
  checks.admin_tracker_readonly = readonlyAttempt.data.length === 0
    && afterReadonly.comment === 'Phase 5 persistence marker';

  assert(Object.values(checks).every(Boolean), `Failed checks: ${Object.entries(checks).filter(([, value]) => !value).map(([key]) => key).join(', ')}`);
  console.log(JSON.stringify({
    environment: 'staging',
    project: projectRef,
    checks,
    passed: Object.values(checks).filter(Boolean).length,
    failed: Object.values(checks).filter((value) => !value).length,
  }, null, 2));
} finally {
  try {
    for (const courseId of courseIds.reverse()) await removeCourse(courseId);
    for (const userId of createdUserIds.reverse()) await service.auth.admin.deleteUser(userId);
  } catch (error) {
    cleanupFailure = error;
  }
}

if (cleanupFailure) throw cleanupFailure;

const after = await aggregateSnapshot();
const { count: orphanCourses, error: orphanCoursesError } = await service.from('courses')
  .select('id', { count: 'exact', head: true }).like('name', `Phase 5 integrated probe % ${runId}`);
assertNoError(orphanCoursesError, 'Audit cleanup batches');
const { data: authUsers, error: authUsersError } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
assertNoError(authUsersError, 'Audit cleanup users');
const orphanUsers = authUsers.users.filter((user) => user.email?.includes(runId)).length;
assert.deepEqual(after, before, 'Staging aggregate counts did not restore exactly');
assert.equal(orphanCourses, 0, 'Disposable batches remain after cleanup');
assert.equal(orphanUsers, 0, 'Disposable users remain after cleanup');
console.log(JSON.stringify({
  cleanup: {
    aggregate_counts_restored: true,
    batches_remaining: orphanCourses,
    users_remaining: orphanUsers,
  },
}, null, 2));
