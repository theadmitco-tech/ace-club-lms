import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const projectRef = 'eyphkkginlgoaxflauog';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey && process.env.PHASE4_LOAD_SERVICE_KEY === 'supabase-cli') {
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
if (!url.includes(projectRef)) throw new Error('Phase 4 probe refused: this is not approved Staging.');

const options = { auth: { autoRefreshToken: false, persistSession: false } };
const service = createClient(url, serviceRoleKey, options);
const anonymous = createClient(url, anonKey, options);
const runId = randomUUID();
const password = `P4-${randomUUID()}!aA1`;
const users = [
  { label: 'admin', role: 'admin', active: true },
  { label: 'enrolled', role: 'student', active: true },
  { label: 'unenrolled', role: 'student', active: true },
  { label: 'inactive', role: 'student', active: false },
  { label: 'draft', role: 'student', active: true },
].map((user) => ({ ...user, email: `phase4-${user.label}-${runId}@example.invalid` }));
const createdUserIds = [];
const courseIds = [];
const checks = {};

function assertNoError(error, context) {
  if (error) throw new Error(`${context}: ${error.message}`);
}

async function signIn(email) {
  const client = createClient(url, anonKey, options);
  const { error } = await client.auth.signInWithPassword({ email, password });
  assertNoError(error, `Sign in ${email}`);
  return client;
}

async function timeline(client) {
  return client.rpc('get_student_timeline');
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
    p_section_key: input.sectionKey ?? null,
    p_session_id: input.sessionId ?? null,
    p_notion_url: input.notionUrl ?? null,
    p_file_url: input.fileUrl ?? null,
    p_video_url: input.videoUrl ?? null,
    p_text_content: input.textContent ?? null,
    p_material_id: null,
  });
  assertNoError(error, `Create ${input.category} fixture`);
  return data.id;
}

try {
  for (const user of users) {
    const { data, error } = await service.auth.admin.createUser({
      email: user.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: `Phase 4 ${user.label}` },
    });
    assertNoError(error, `Create ${user.label} user`);
    user.id = data.user.id;
    createdUserIds.push(user.id);
  }
  assertNoError((await service.from('profiles').upsert(users.map((user) => ({
    id: user.id,
    email: user.email,
    full_name: `Phase 4 ${user.label}`,
    role: user.role,
    is_active: user.active,
  })))).error, 'Prepare probe profiles');

  const admin = await signIn(users[0].email);
  const enrolled = await signIn(users[1].email);
  const unenrolled = await signIn(users[2].email);
  const inactive = await signIn(users[3].email);
  const draftStudent = await signIn(users[4].email);

  const { data: template, error: templateError } = await service.from('course_templates')
    .select('id,current_revision_id').eq('template_key', 'di-crash-course').single();
  assertNoError(templateError, 'Read DI crash template');

  for (const fixture of [
    { label: 'published', publicationState: 'published' },
    { label: 'draft', publicationState: 'draft' },
  ]) {
    const { data, error } = await admin.rpc('confirm_template_batch_v2', {
      p_name: `Phase 4 portal probe ${fixture.label} ${runId}`,
      p_template_id: template.id,
      p_expected_revision_id: template.current_revision_id,
      p_start_date: '2028-06-01',
      p_publication_state: fixture.publicationState,
      p_idempotency_key: randomUUID(),
    });
    assertNoError(error, `Create ${fixture.label} batch`);
    courseIds.push(data.courseId);
  }
  const [publishedBatch, draftBatch] = courseIds;
  assertNoError((await service.from('enrollments').insert([
    { user_id: users[1].id, course_id: publishedBatch },
    { user_id: users[3].id, course_id: publishedBatch },
    { user_id: users[4].id, course_id: draftBatch },
  ])).error, 'Create enrollment fixtures');

  const { data: sessions, error: sessionsError } = await service.from('sessions')
    .select('id,title,event_type,is_published,session_date,session_end_at').eq('course_id', publishedBatch).order('display_order');
  assertNoError(sessionsError, 'Read published batch events');
  const ordinarySession = sessions.find((session) => session.event_type === 'live_class');
  const mockSession = sessions.find((session) => session.event_type === 'mock');
  assert(ordinarySession && mockSession, 'Expected live class and mock fixtures');

  const starterId = await createResource(admin, {
    courseId: publishedBatch,
    title: `Phase 4 Starter Pack ${runId}`,
    category: 'starter_pack',
    scope: 'standalone',
    format: 'text',
    textContent: 'Disposable Starter Pack verification fixture.',
  });
  const draftMarkerId = await createResource(admin, {
    courseId: draftBatch,
    title: `Phase 4 cross-batch marker ${runId}`,
    category: 'starter_pack',
    scope: 'standalone',
    format: 'text',
    textContent: 'Disposable cross-batch verification fixture.',
  });
  const preReleaseId = await createResource(admin, {
    courseId: publishedBatch,
    title: `Phase 4 future pre-read ${runId}`,
    category: 'pre_read',
    scope: 'event',
    format: 'notion',
    sessionId: ordinarySession.id,
    notionUrl: `https://notion.site/phase4-${runId}`,
  });
  const unpublishedId = await createResource(admin, {
    courseId: publishedBatch,
    title: `Phase 4 unpublished event pre-read ${runId}`,
    category: 'pre_read',
    scope: 'event',
    format: 'notion',
    sessionId: ordinarySession.id,
    notionUrl: `https://notion.site/phase4-unpublished-${runId}`,
  });
  assertNoError((await service.from('materials').update({ available_from: new Date(Date.now() - 60_000).toISOString() })
    .eq('id', unpublishedId)).error, 'Release unpublished-event marker');
  assertNoError((await service.from('sessions').update({ is_published: false }).eq('id', ordinarySession.id)).error, 'Unpublish event fixture');
  assertNoError((await service.from('sessions').update({
    venue: 'Phase 4 Test Centre',
    reporting_time: '08:15:00',
    instructions: 'Bring a photo ID and arrive before reporting time.',
  }).eq('id', mockSession.id)).error, 'Configure mock fixture');

  const activeResult = await timeline(enrolled);
  assertNoError(activeResult.error, 'Load active enrolled timeline');
  const activeTimeline = activeResult.data;
  const resourceIds = new Set(activeTimeline.resources.map((resource) => resource.id));
  const embeddedFuture = activeTimeline.sessions.flatMap((session) => session.materials).find((material) => material.id === preReleaseId);
  const projectedMock = activeTimeline.sessions.find((session) => session.id === mockSession.id);

  checks.active_enrolled_course = activeTimeline.course?.id === publishedBatch;
  checks.future_start_course = activeTimeline.course?.cohort_start_date === '2028-06-01'
    && new Date(activeTimeline.generated_at).getTime() < new Date('2028-06-01T00:00:00Z').getTime();
  checks.starter_pack_released_before_start = resourceIds.has(starterId)
    && activeTimeline.resources.find((resource) => resource.id === starterId)?.category === 'starter_pack';
  checks.pre_release_resource_hidden = !resourceIds.has(preReleaseId)
    && (!embeddedFuture || embeddedFuture.is_available === false);
  checks.unpublished_session_hidden = !activeTimeline.sessions.some((session) => session.id === ordinarySession.id)
    && !resourceIds.has(unpublishedId);
  checks.cross_batch_resource_hidden = !resourceIds.has(draftMarkerId);
  checks.configured_mock_projected = projectedMock?.venue === 'Phase 4 Test Centre'
    && projectedMock.reporting_time?.startsWith('08:15')
    && projectedMock.instructions === 'Bring a photo ID and arrive before reporting time.';

  const unenrolledResult = await timeline(unenrolled);
  assertNoError(unenrolledResult.error, 'Load unenrolled timeline');
  checks.unenrolled_has_no_course = unenrolledResult.data.course === null
    && unenrolledResult.data.sessions.length === 0
    && unenrolledResult.data.resources.length === 0;

  const inactiveResult = await timeline(inactive);
  checks.inactive_denied = inactiveResult.data === null && inactiveResult.error?.code === '42501';

  const anonymousResult = await timeline(anonymous);
  checks.signed_out_denied = anonymousResult.data === null && Boolean(anonymousResult.error);

  const draftResult = await timeline(draftStudent);
  assertNoError(draftResult.error, 'Load draft-batch timeline');
  checks.draft_batch_denied = draftResult.data.course === null
    && draftResult.data.sessions.length === 0
    && draftResult.data.resources.length === 0;

  const { data: directVisible, error: directVisibleError } = await enrolled.from('materials')
    .select('id').in('id', [starterId, draftMarkerId, preReleaseId, unpublishedId]);
  assertNoError(directVisibleError, 'Read direct material visibility');
  checks.material_rls_matches_projection = directVisible.some((row) => row.id === starterId)
    && !directVisible.some((row) => [draftMarkerId, preReleaseId, unpublishedId].includes(row.id));

  console.log(JSON.stringify({
    environment: 'staging',
    project: projectRef,
    checks,
    passed: Object.values(checks).filter(Boolean).length,
    failed: Object.values(checks).filter((value) => !value).length,
  }, null, 2));
  assert(Object.values(checks).every(Boolean), `Failed checks: ${Object.entries(checks).filter(([, value]) => !value).map(([key]) => key).join(', ')}`);
} finally {
  for (const courseId of courseIds.reverse()) await removeCourse(courseId);
  for (const userId of createdUserIds.reverse()) await service.auth.admin.deleteUser(userId);
}

const { count: orphanCourses, error: orphanCoursesError } = await service.from('courses')
  .select('id', { count: 'exact', head: true }).like('name', `Phase 4 portal probe % ${runId}`);
assertNoError(orphanCoursesError, 'Audit cleanup batches');
const { data: authUsers, error: authUsersError } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
assertNoError(authUsersError, 'Audit cleanup users');
const orphanUsers = authUsers.users.filter((user) => user.email?.includes(runId)).length;
assert.equal(orphanCourses, 0);
assert.equal(orphanUsers, 0);
console.log(JSON.stringify({ cleanup: { batches: orphanCourses, users: orphanUsers } }, null, 2));
