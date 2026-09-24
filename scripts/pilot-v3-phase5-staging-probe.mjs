import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const projectRef = 'eyphkkginlgoaxflauog';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey && process.env.PILOT_V3_PHASE5_LOAD_SERVICE_KEY === 'supabase-cli') {
  const keys = JSON.parse(execFileSync('npx', [
    '--yes',
    'supabase@2.114.0',
    'projects',
    'api-keys',
    '--project-ref',
    projectRef,
    '--output',
    'json',
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }));
  serviceRoleKey = keys.find((key) => key.id === 'service_role')?.api_key;
}

if (!url || !anonKey || !serviceRoleKey) throw new Error('Staging Supabase credentials are required.');
if (!url.includes(projectRef)) throw new Error('Pilot V3 Phase 5 probe refused: target is not approved Staging.');

const options = { auth: { autoRefreshToken: false, persistSession: false } };
const service = createClient(url, serviceRoleKey, options);
const anonymous = createClient(url, anonKey, options);
const runId = randomUUID();
const password = `V3-P5-${randomUUID()}!aA1`;
const users = [
  { label: 'admin', role: 'admin', active: true },
  { label: 'enrolled', role: 'student', active: true },
  { label: 'cross-student', role: 'student', active: true },
  { label: 'inactive', role: 'student', active: false },
].map((user) => ({ ...user, email: `pilot-v3-phase5-${user.label}-${runId}@example.invalid` }));
const createdUserIds = [];
const checks = {};
let courseId;
let assignmentId;
let attemptId;

function assertNoError(error, context) {
  if (error) throw new Error(`${context}: ${error.message}`);
}

async function signIn(email) {
  const client = createClient(url, anonKey, options);
  const { error } = await client.auth.signInWithPassword({ email, password });
  assertNoError(error, `Sign in ${email}`);
  return client;
}

async function counts() {
  const tables = [
    'courses', 'sessions', 'materials', 'enrollments', 'student_question_logs',
    'mock_assessment_assignments', 'mock_attempts', 'mock_attempt_sections',
    'mock_attempt_items', 'mock_responses', 'mock_review_edits', 'mock_attempt_item_notes',
  ];
  const result = {};
  for (const table of tables) {
    const { count, error } = await service.from(table).select('id', { count: 'exact', head: true });
    assertNoError(error, `Count ${table}`);
    result[table] = count;
  }
  return result;
}

async function removeCourse(id) {
  const { data: sessions, error: sessionsError } = await service.from('sessions').select('id').eq('course_id', id);
  assertNoError(sessionsError, 'Read cleanup sessions');
  const sessionIds = sessions.map((row) => row.id);
  assertNoError((await service.from('materials').delete().eq('course_id', id)).error, 'Delete cleanup resources');
  if (sessionIds.length) assertNoError((await service.from('practice_sets').delete().in('session_id', sessionIds)).error, 'Delete cleanup practice sets');
  assertNoError((await service.from('enrollments').delete().eq('course_id', id)).error, 'Delete cleanup enrollments');
  assertNoError((await service.from('sessions').delete().eq('course_id', id)).error, 'Delete cleanup sessions');
  assertNoError((await service.from('courses').delete().eq('id', id)).error, 'Delete cleanup batch');
}

const { count: staleCourses, error: staleCourseError } = await service.from('courses')
  .select('id', { count: 'exact', head: true }).like('name', 'Pilot V3 Phase 5 isolation probe %');
assertNoError(staleCourseError, 'Audit stale Phase 5 batches before starting');
const { data: existingAuthUsers, error: existingUsersError } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
assertNoError(existingUsersError, 'Audit stale Phase 5 users before starting');
const staleUsers = existingAuthUsers.users.filter((user) => user.email?.startsWith('pilot-v3-phase5-')).length;
assert.equal(staleCourses, 0, 'No stale Phase 5 batch may remain before the probe');
assert.equal(staleUsers, 0, 'No stale Phase 5 user may remain before the probe');

const baseline = await counts();

try {
  for (const user of users) {
    const { data, error } = await service.auth.admin.createUser({
      email: user.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: `Pilot V3 Phase 5 ${user.label}` },
    });
    assertNoError(error, `Create ${user.label}`);
    user.id = data.user.id;
    createdUserIds.push(user.id);
  }
  assertNoError((await service.from('profiles').upsert(users.map((user) => ({
    id: user.id,
    email: user.email,
    full_name: `Pilot V3 Phase 5 ${user.label}`,
    role: user.role,
    is_active: user.active,
  })))).error, 'Prepare disposable profiles');

  const admin = await signIn(users[0].email);
  const enrolled = await signIn(users[1].email);
  const crossStudent = await signIn(users[2].email);
  const inactive = await signIn(users[3].email);

  const { data: template, error: templateError } = await service.from('course_templates')
    .select('id,current_revision_id').eq('template_key', 'di-crash-course').single();
  assertNoError(templateError, 'Read disposable batch template');
  const { data: batch, error: batchError } = await admin.rpc('confirm_template_batch_v2', {
    p_name: `Pilot V3 Phase 5 isolation probe ${runId}`,
    p_template_id: template.id,
    p_expected_revision_id: template.current_revision_id,
    p_start_date: '2028-08-01',
    p_publication_state: 'published',
    p_idempotency_key: randomUUID(),
  });
  assertNoError(batchError, 'Create disposable batch');
  courseId = batch.courseId;

  const { data: version, error: versionError } = await service.from('mock_assessment_versions')
    .select('id,snapshot').order('published_at', { ascending: false }).limit(1).single();
  assertNoError(versionError, 'Read published Mock version');
  assert.equal(version.snapshot.items.length, 64, 'Expected accepted 64-question Staging Mock version');
  const { data: assignment, error: assignmentError } = await service.from('mock_assessment_assignments').insert({
    assessment_version_id: version.id,
    course_id: courseId,
    release_at: new Date(Date.now() - 60_000).toISOString(),
    due_at: null,
    created_by: users[0].id,
  }).select('id').single();
  assertNoError(assignmentError, 'Create disposable Mock assignment');
  assignmentId = assignment.id;
  assertNoError((await service.from('enrollments').insert([
    { user_id: users[1].id, course_id: courseId },
    { user_id: users[3].id, course_id: courseId },
  ])).error, 'Create disposable enrollments');

  const assignmentIds = async (client) => {
    const { data, error } = await client.from('mock_assessment_assignments').select('id').eq('id', assignmentId);
    assertNoError(error, 'Read released assignment visibility');
    return data.map((row) => row.id);
  };
  checks.signed_out_assignment_denied = (await assignmentIds(anonymous)).length === 0;
  checks.enrolled_assignment_visible = (await assignmentIds(enrolled)).length === 1;
  checks.unenrolled_assignment_denied = (await assignmentIds(crossStudent)).length === 0;
  checks.inactive_assignment_denied = (await assignmentIds(inactive)).length === 0;

  const mutationId = randomUUID();
  const startArgs = {
    p_assignment_id: assignmentId,
    p_section_order: ['quant', 'verbal', 'data_insights'],
    p_client_mutation_id: mutationId,
    p_request_hash: `phase5-${runId}`,
  };
  const start = await enrolled.rpc('start_mock_attempt', startArgs);
  assertNoError(start.error, 'Start enrolled Student attempt');
  attemptId = start.data.attempt_id;
  const retry = await enrolled.rpc('start_mock_attempt', startArgs);
  assertNoError(retry.error, 'Retry same start mutation');
  checks.start_is_idempotent = retry.data.attempt_id === attemptId && retry.data.lock_version === start.data.lock_version;
  const reused = await enrolled.rpc('start_mock_attempt', { ...startArgs, p_request_hash: `changed-${runId}` });
  checks.idempotency_reuse_denied = reused.data === null && Boolean(reused.error);

  const crossRead = await crossStudent.from('mock_attempts').select('id').eq('id', attemptId);
  assertNoError(crossRead.error, 'Cross-Student RLS read');
  checks.cross_student_attempt_read_denied = crossRead.data.length === 0;
  const crossMutation = await crossStudent.rpc('mutate_mock_attempt', {
    p_attempt_id: attemptId,
    p_operation: 'begin',
    p_payload: {},
    p_expected_lock_version: 0,
    p_client_mutation_id: randomUUID(),
    p_request_hash: `cross-${runId}`,
  });
  checks.cross_student_mutation_denied = crossMutation.data === null && crossMutation.error?.code === '42501';
  const adminStart = await admin.rpc('start_mock_attempt', { ...startArgs, p_client_mutation_id: randomUUID() });
  checks.cross_role_start_denied = adminStart.data === null && adminStart.error?.code === '42501';
  const anonymousStart = await anonymous.rpc('start_mock_attempt', { ...startArgs, p_client_mutation_id: randomUUID() });
  checks.signed_out_start_denied = anonymousStart.data === null && Boolean(anonymousStart.error);

  const questionKeys = await enrolled.rpc('get_mock_question_keys', { p_revision_ids: [version.snapshot.items[0].question_revision_id] });
  const attemptKeys = await enrolled.rpc('get_completed_mock_attempt_keys', { p_attempt_id: attemptId });
  checks.answer_key_readers_denied = questionKeys.data === null && Boolean(questionKeys.error)
    && attemptKeys.data === null && Boolean(attemptKeys.error);
  const questionRows = await enrolled.from('mock_question_revisions').select('id').limit(1);
  checks.pre_review_question_bank_denied = (questionRows.data === null && Boolean(questionRows.error))
    || (questionRows.data?.length === 0 && !questionRows.error);

  const { data: media } = await service.from('mock_media').select('storage_path').eq('status', 'ready').limit(1).maybeSingle();
  if (media) {
    const directMedia = await enrolled.storage.from('mock-media').download(media.storage_path);
    checks.direct_private_media_denied = directMedia.data === null && Boolean(directMedia.error);
  } else {
    checks.direct_private_media_denied = true;
  }

  const { data: attemptItems, error: itemError } = await service.from('mock_attempt_items')
    .select('id,question_snapshot,stimulus_snapshot,response_config_snapshot').eq('attempt_id', attemptId);
  assertNoError(itemError, 'Read immutable attempt snapshots');
  checks.historical_snapshots_complete = attemptItems.length === 64
    && attemptItems.every((item) => item.question_snapshot && item.response_config_snapshot);

  const prematureNote = await enrolled.from('mock_attempt_item_notes').insert({
    attempt_id: attemptId,
    attempt_item_id: attemptItems[0].id,
    student_id: users[1].id,
    note: 'This note must be rejected before completion.',
  });
  checks.incomplete_attempt_note_denied = prematureNote.data === null && prematureNote.error?.code === '42501';

  console.log(JSON.stringify({
    environment: 'staging',
    project: projectRef,
    checks,
    passed: Object.values(checks).filter(Boolean).length,
    failed: Object.values(checks).filter((value) => !value).length,
  }, null, 2));
  assert(Object.values(checks).every(Boolean), `Failed: ${Object.entries(checks).filter(([, value]) => !value).map(([key]) => key).join(', ')}`);
} finally {
  if (attemptId) {
    const { error } = await service.rpc('reset_mock_attempt_for_testing', {
      p_attempt_id: attemptId,
      p_student_id: users[1].id,
    });
    assertNoError(error, 'Reset disposable attempt');
  }
  if (assignmentId) assertNoError((await service.from('mock_assessment_assignments').delete().eq('id', assignmentId)).error, 'Delete disposable assignment');
  if (courseId) await removeCourse(courseId);
  for (const userId of createdUserIds.reverse()) await service.auth.admin.deleteUser(userId);
}

const finalCounts = await counts();
assert.deepEqual(finalCounts, baseline, 'Staging aggregate counts must restore exactly after fixture cleanup');
const { count: orphanCourses, error: orphanError } = await service.from('courses')
  .select('id', { count: 'exact', head: true }).like('name', `Pilot V3 Phase 5 isolation probe % ${runId}`);
assertNoError(orphanError, 'Audit disposable batches');
const { data: authUsers, error: usersError } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
assertNoError(usersError, 'Audit disposable users');
const orphanUsers = authUsers.users.filter((user) => user.email?.includes(runId)).length;
assert.equal(orphanCourses, 0);
assert.equal(orphanUsers, 0);
console.log(JSON.stringify({ cleanup: { exactAggregateRestoration: true, batches: orphanCourses, users: orphanUsers } }, null, 2));
