import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey && process.env.PHASE3_LOAD_SERVICE_KEY === 'supabase-cli') {
  const keyMetadata = JSON.parse(execFileSync('npx', [
    '--yes',
    'supabase@2.114.0',
    'projects',
    'api-keys',
    '--project-ref',
    'eyphkkginlgoaxflauog',
    '--output',
    'json',
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }));
  serviceRoleKey = keyMetadata.find((key) => key.id === 'service_role')?.api_key;
}

if (!url || !anonKey || !serviceRoleKey) throw new Error('Staging Supabase credentials are required.');
if (!url.includes('eyphkkginlgoaxflauog')) throw new Error('Phase 3 probe refused: this is not approved Staging.');

const options = { auth: { autoRefreshToken: false, persistSession: false } };
const service = createClient(url, serviceRoleKey, options);
const anonymous = createClient(url, anonKey, options);
const runId = randomUUID();
const password = `P3-${randomUUID()}!aA1`;
const users = [
  { label: 'admin', role: 'admin', active: true },
  { label: 'enrolled', role: 'student', active: true },
  { label: 'unenrolled', role: 'student', active: true },
  { label: 'inactive', role: 'student', active: false },
].map((user) => ({ ...user, email: `phase3-${user.label}-${runId}@example.invalid` }));
const createdUserIds = [];
const courseIds = [];
let templateId;
let originalRevisionId;
let probeRevisionId;

function assertNoError(error, context) {
  if (error) throw new Error(`${context}: ${error.message}`);
}

async function signIn(email) {
  const client = createClient(url, anonKey, options);
  const { error } = await client.auth.signInWithPassword({ email, password });
  assertNoError(error, `Sign in ${email}`);
  return client;
}

async function visibleMaterialIds(client, ids) {
  const { data, error } = await client.from('materials').select('id').in('id', ids);
  assertNoError(error, 'Read visible resources');
  return data.map((row) => row.id).sort();
}

async function removeCourse(courseId) {
  const { data: sessions, error: sessionsError } = await service.from('sessions').select('id').eq('course_id', courseId);
  assertNoError(sessionsError, 'Read cleanup sessions');
  const sessionIds = sessions.map((row) => row.id);
  assertNoError((await service.from('materials').delete().eq('course_id', courseId)).error, 'Delete cleanup resources');
  if (sessionIds.length) assertNoError((await service.from('practice_sets').delete().in('session_id', sessionIds)).error, 'Delete cleanup practice sets');
  assertNoError((await service.from('enrollments').delete().eq('course_id', courseId)).error, 'Delete cleanup enrollments');
  assertNoError((await service.from('sessions').delete().eq('course_id', courseId)).error, 'Delete cleanup sessions');
  assertNoError((await service.from('courses').delete().eq('id', courseId)).error, 'Delete cleanup batch');
}

async function loadTemplateDraft(revisionId) {
  const [revisionResult, sectionsResult, eventsResult, resourcesResult] = await Promise.all([
    service.from('course_template_revisions').select('title').eq('id', revisionId).single(),
    service.from('course_template_sections').select('id,section_key,title,display_order').eq('revision_id', revisionId).order('display_order'),
    service.from('course_template_events').select('id,section_id,event_key,title,event_type,relative_day,display_order,start_time,duration_minutes,instructor,venue,reporting_time,instructions,is_published_by_default,source_master_session_id').eq('revision_id', revisionId).order('display_order'),
    service.from('course_template_resources').select('section_id,event_id,resource_key,title,resource_type,resource_scope,master_material_id,resource_format,notion_url,file_url,text_content,display_order').eq('revision_id', revisionId).order('display_order'),
  ]);
  assertNoError(revisionResult.error, 'Read template revision');
  assertNoError(sectionsResult.error, 'Read template Sections');
  assertNoError(eventsResult.error, 'Read template events');
  assertNoError(resourcesResult.error, 'Read template resources');
  const sectionKeyById = new Map(sectionsResult.data.map((row) => [row.id, row.section_key]));
  const eventKeyById = new Map(eventsResult.data.map((row) => [row.id, row.event_key]));
  return {
    title: revisionResult.data.title,
    sections: sectionsResult.data.map((row) => ({ key: row.section_key, title: row.title, displayOrder: row.display_order })),
    events: eventsResult.data.map((row) => ({
      key: row.event_key,
      title: row.title,
      eventType: row.event_type,
      sectionKey: sectionKeyById.get(row.section_id),
      relativeDay: row.relative_day,
      displayOrder: row.display_order,
      startTime: row.start_time.slice(0, 5),
      durationMinutes: row.duration_minutes,
      instructor: row.instructor ?? '',
      venue: row.venue ?? '',
      reportingTime: row.reporting_time?.slice(0, 5) ?? '',
      instructions: row.instructions ?? '',
      publishedByDefault: row.is_published_by_default,
      sourceMasterSessionId: row.source_master_session_id,
    })),
    resources: resourcesResult.data.map((row) => ({
      key: row.resource_key,
      title: row.title,
      resourceType: row.resource_type,
      scope: row.resource_scope,
      sectionKey: row.section_id ? sectionKeyById.get(row.section_id) : null,
      eventKey: row.event_id ? eventKeyById.get(row.event_id) : null,
      masterMaterialId: row.master_material_id,
      format: row.resource_format,
      notionUrl: row.notion_url ?? '',
      fileUrl: row.file_url ?? '',
      textContent: row.text_content ?? '',
      displayOrder: row.display_order,
    })),
  };
}

const checks = {};

try {
  for (const user of users) {
    const { data, error } = await service.auth.admin.createUser({
      email: user.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: `Phase 3 ${user.label}` },
    });
    assertNoError(error, `Create ${user.label} user`);
    user.id = data.user.id;
    createdUserIds.push(user.id);
  }
  assertNoError((await service.from('profiles').upsert(users.map((user) => ({
    id: user.id,
    email: user.email,
    full_name: `Phase 3 ${user.label}`,
    role: user.role,
    is_active: user.active,
  })))).error, 'Prepare probe profiles');

  const admin = await signIn(users[0].email);
  const enrolled = await signIn(users[1].email);
  const unenrolled = await signIn(users[2].email);
  const inactive = await signIn(users[3].email);

  const { data: template, error: templateError } = await service.from('course_templates')
    .select('id,current_revision_id').eq('template_key', 'di-crash-course').single();
  assertNoError(templateError, 'Read probe template');
  templateId = template.id;
  originalRevisionId = template.current_revision_id;
  const draft = await loadTemplateDraft(originalRevisionId);

  for (const label of ['A', 'B']) {
    const { data, error } = await admin.rpc('confirm_template_batch_v2', {
      p_name: `Phase 3 authenticated probe ${label} ${runId}`,
      p_template_id: templateId,
      p_expected_revision_id: originalRevisionId,
      p_start_date: '2028-06-01',
      p_publication_state: 'published',
      p_idempotency_key: randomUUID(),
    });
    assertNoError(error, `Create Batch ${label}`);
    courseIds.push(data.courseId);
  }
  const [batchA, batchB] = courseIds;
  assertNoError((await service.from('enrollments').insert([
    { user_id: users[1].id, course_id: batchA },
    { user_id: users[3].id, course_id: batchA },
  ])).error, 'Create access fixtures');

  const { data: sessions, error: sessionsError } = await service.from('sessions')
    .select('id,title,session_date,session_end_at,display_order').eq('course_id', batchA).order('display_order');
  assertNoError(sessionsError, 'Read Batch A events');
  const firstSession = sessions[0];

  const recordingResult = await admin.rpc('save_batch_resource', {
    p_course_id: batchA,
    p_title: `Phase 3 recording ${runId}`,
    p_category: 'recording',
    p_resource_scope: 'event',
    p_resource_format: 'youtube',
    p_section_key: null,
    p_session_id: firstSession.id,
    p_notion_url: null,
    p_file_url: null,
    p_video_url: 'https://youtu.be/dQw4w9WgXcQ',
    p_text_content: null,
    p_material_id: null,
  });
  assertNoError(recordingResult.error, 'Save Batch A recording');
  const sessionMaterialPath = `/api/materials/file?path=session-materials%2F${firstSession.id}%2F${randomUUID()}.pdf`;
  const sessionMaterialResult = await admin.rpc('save_batch_resource', {
    p_course_id: batchA,
    p_title: `Phase 3 Session Material ${runId}`,
    p_category: 'session_material',
    p_resource_scope: 'event',
    p_resource_format: 'pdf',
    p_section_key: null,
    p_session_id: firstSession.id,
    p_notion_url: null,
    p_file_url: sessionMaterialPath,
    p_video_url: null,
    p_text_content: null,
    p_material_id: null,
  });
  assertNoError(sessionMaterialResult.error, 'Save Batch A Session Material');
  const worksheetResult = await admin.rpc('save_batch_resource', {
    p_course_id: batchA,
    p_title: `Phase 3 protected access worksheet ${runId}`,
    p_category: 'worksheet',
    p_resource_scope: 'event',
    p_resource_format: 'pdf',
    p_section_key: null,
    p_session_id: firstSession.id,
    p_notion_url: null,
    p_file_url: `/api/materials/file?path=worksheets%2F${templateId}%2F${randomUUID()}.pdf`,
    p_video_url: null,
    p_text_content: null,
    p_material_id: null,
  });
  assertNoError(worksheetResult.error, 'Save protected access worksheet');
  const worksheetId = worksheetResult.data.id;

  const { data: batchBPrivate, error: batchBPrivateError } = await service.from('materials')
    .select('id').eq('course_id', batchB).in('category', ['recording', 'session_material']);
  assertNoError(batchBPrivateError, 'Check Batch B isolation');
  checks.two_batch_isolation = batchBPrivate.length === 0;

  const releasedAt = new Date(Date.now() - 60_000).toISOString();
  assertNoError((await service.from('materials').update({ available_from: releasedAt }).eq('id', worksheetId)).error, 'Release protected worksheet fixture');
  checks.enrolled_access = (await visibleMaterialIds(enrolled, [worksheetId])).length === 1;
  checks.unenrolled_denied = (await visibleMaterialIds(unenrolled, [worksheetId])).length === 0;
  checks.inactive_denied = (await visibleMaterialIds(inactive, [worksheetId])).length === 0;
  checks.signed_out_denied = (await visibleMaterialIds(anonymous, [worksheetId])).length === 0;

  const { data: courseBeforeShift, error: courseBeforeShiftError } = await service.from('courses')
    .select('schedule_revision').eq('id', batchA).single();
  assertNoError(courseBeforeShiftError, 'Read schedule revision');
  const shiftResult = await admin.rpc('shift_batch_schedule', {
    p_course_id: batchA,
    p_selected_session_id: firstSession.id,
    p_days: 2,
    p_expected_schedule_revision: courseBeforeShift.schedule_revision,
  });
  assertNoError(shiftResult.error, 'Reschedule Batch A');
  const { data: worksheetAfterShift, error: worksheetAfterShiftError } = await service.from('materials')
    .select('available_from').eq('id', worksheetId).single();
  assertNoError(worksheetAfterShiftError, 'Read released worksheet after reschedule');
  checks.released_preserved_after_reschedule = new Date(worksheetAfterShift.available_from).getTime() === new Date(releasedAt).getTime()
    && (await visibleMaterialIds(enrolled, [worksheetId])).length === 1;

  const probeResourceKey = `phase3-pre-read-${runId}`;
  const lastEvent = draft.events.at(-1);
  draft.resources.push({
    key: probeResourceKey,
    title: `Phase 3 sync pre-read ${runId}`,
    resourceType: 'pre_read',
    scope: 'event',
    sectionKey: null,
    eventKey: lastEvent.key,
    masterMaterialId: null,
    format: 'notion',
    notionUrl: `https://notion.site/phase3-${runId}`,
    fileUrl: '',
    textContent: '',
    displayOrder: draft.resources.length + 1,
  });
  const revisionResult = await admin.rpc('create_course_template_revision_v2', {
    p_template_id: templateId,
    p_expected_revision_id: originalRevisionId,
    p_title: draft.title,
    p_sections: draft.sections,
    p_events: draft.events,
    p_resources: draft.resources,
  });
  assertNoError(revisionResult.error, 'Create probe template revision');
  probeRevisionId = revisionResult.data;
  const previewResult = await admin.rpc('preview_course_template_resource_sync', { p_course_id: batchA });
  assertNoError(previewResult.error, 'Preview template resource sync');
  checks.sync_preview = previewResult.data.revisionId === probeRevisionId
    && previewResult.data.add.some((item) => item.key === probeResourceKey);
  const firstSync = await admin.rpc('sync_course_template_resources', {
    p_course_id: batchA,
    p_expected_revision_id: probeRevisionId,
  });
  assertNoError(firstSync.error, 'Apply first template resource sync');
  const secondSync = await admin.rpc('sync_course_template_resources', {
    p_course_id: batchA,
    p_expected_revision_id: probeRevisionId,
  });
  assertNoError(secondSync.error, 'Apply second template resource sync');
  const { data: probeResource, error: probeResourceError } = await service.from('course_template_resources')
    .select('id').eq('revision_id', probeRevisionId).eq('resource_key', probeResourceKey).single();
  assertNoError(probeResourceError, 'Read probe template resource');
  const { count: syncedCount, error: syncedCountError } = await service.from('materials')
    .select('id', { count: 'exact', head: true }).eq('course_id', batchA).eq('source_template_resource_id', probeResource.id);
  assertNoError(syncedCountError, 'Count synced resource');
  checks.sync_twice_no_duplicates = firstSync.data.added === 1 && secondSync.data.added === 0 && syncedCount === 1;

  console.log(JSON.stringify({
    environment: 'staging',
    project: 'eyphkkginlgoaxflauog',
    checks,
    passed: Object.values(checks).filter(Boolean).length,
    failed: Object.values(checks).filter((value) => !value).length,
  }, null, 2));
  assert(Object.values(checks).every(Boolean), `Failed checks: ${Object.entries(checks).filter(([, value]) => !value).map(([key]) => key).join(', ')}`);
} finally {
  if (templateId && originalRevisionId) {
    const { data: current } = await service.from('course_templates').select('current_revision_id').eq('id', templateId).single();
    if (current?.current_revision_id === probeRevisionId) {
      await service.from('course_templates').update({ current_revision_id: originalRevisionId }).eq('id', templateId);
    }
  }
  for (const courseId of courseIds.reverse()) await removeCourse(courseId);
  if (probeRevisionId) {
    await service.from('course_template_resources').delete().eq('revision_id', probeRevisionId);
    await service.from('course_template_events').delete().eq('revision_id', probeRevisionId);
    await service.from('course_template_sections').delete().eq('revision_id', probeRevisionId);
    await service.from('course_template_revisions').delete().eq('id', probeRevisionId);
  }
  for (const userId of createdUserIds.reverse()) await service.auth.admin.deleteUser(userId);
}

const { count: orphanCourses, error: orphanCoursesError } = await service.from('courses')
  .select('id', { count: 'exact', head: true }).like('name', `Phase 3 authenticated probe % ${runId}`);
assertNoError(orphanCoursesError, 'Audit cleanup batches');
const { data: authUsers, error: authUsersError } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
assertNoError(authUsersError, 'Audit cleanup users');
const orphanUsers = authUsers.users.filter((user) => user.email?.includes(runId)).length;
const { count: orphanRevision, error: orphanRevisionError } = await service.from('course_template_revisions')
  .select('id', { count: 'exact', head: true }).eq('id', probeRevisionId);
assertNoError(orphanRevisionError, 'Audit cleanup template revision');
assert.equal(orphanCourses, 0);
assert.equal(orphanUsers, 0);
assert.equal(orphanRevision, 0);
console.log(JSON.stringify({ cleanup: { batches: orphanCourses, users: orphanUsers, revisions: orphanRevision } }, null, 2));
