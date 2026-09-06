import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { chmod, readFile, unlink, writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const projectRef = 'eyphkkginlgoaxflauog';
const stagingUrl = `https://${projectRef}.supabase.co`;
const manifestPath = process.env.TEMPLATE_WORKSHEET_FIXTURE_PATH
  ?? '/private/tmp/ace-club-template-worksheet-tracker-fixture.json';
const mode = process.argv[2];

if (!['setup', 'verify', 'cleanup'].includes(mode)) {
  throw new Error('Use setup, verify, or cleanup.');
}

function loadApiKeys() {
  const metadata = JSON.parse(execFileSync('npx', [
    '--yes',
    'supabase@2.114.0',
    'projects',
    'api-keys',
    '--project-ref',
    projectRef,
    '--output',
    'json',
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }));

  const anonKey = metadata.find((key) => key.id === 'anon' && !key.disabled)?.api_key;
  const serviceRoleKey = metadata.find((key) => key.id === 'service_role' && !key.disabled)?.api_key;
  if (!anonKey || !serviceRoleKey) throw new Error('Could not load approved Staging API keys.');
  return { anonKey, serviceRoleKey };
}

const clientOptions = { auth: { autoRefreshToken: false, persistSession: false } };

function clients() {
  const { anonKey, serviceRoleKey } = loadApiKeys();
  return {
    anonKey,
    service: createClient(stagingUrl, serviceRoleKey, clientOptions),
  };
}

function assertNoError(error, context) {
  if (error) throw new Error(`${context}: ${error.message}`);
}

async function readManifest() {
  return JSON.parse(await readFile(manifestPath, 'utf8'));
}

async function createTemplateOrigin(service, runId, label, questionCount, templateKey) {
  const template = await service.from('course_templates')
    .select('id')
    .eq('template_key', templateKey)
    .single();
  assertNoError(template.error, `Find approved ${label} template`);

  const revision = await service.from('course_template_revisions').insert({
    template_id: template.data.id,
    revision_number: Math.floor(Date.now() / 1000),
    title: `Disposable template tracker fixture ${runId}`,
  }).select('id').single();
  assertNoError(revision.error, `Create ${label} revision`);

  const section = await service.from('course_template_sections').insert({
    revision_id: revision.data.id,
    section_key: label.startsWith('DI') ? 'di' : 'va',
    title: `${label} Section`,
    display_order: 1,
  }).select('id').single();
  assertNoError(section.error, `Create ${label} section`);

  const event = await service.from('course_template_events').insert({
    revision_id: revision.data.id,
    section_id: section.data.id,
    event_key: `qa-event-${runId}`,
    title: `${label} Session`,
    event_type: 'live_class',
    relative_day: 0,
    display_order: 1,
    start_time: '10:00:00',
    duration_minutes: 60,
    is_published_by_default: true,
  }).select('id').single();
  assertNoError(event.error, `Create ${label} event`);

  const resource = await service.from('course_template_resources').insert({
    revision_id: revision.data.id,
    section_id: section.data.id,
    event_id: event.data.id,
    resource_key: `qa-worksheet-${runId}`,
    title: `${label} Worksheet`,
    resource_type: 'worksheet',
    resource_scope: 'event',
    display_order: 1,
    resource_format: 'pdf',
    file_url: `https://example.com/qa-${runId}.pdf`,
    question_count: questionCount,
  }).select('id').single();
  assertNoError(resource.error, `Create ${label} resource`);

  return {
    templateId: template.data.id,
    revisionId: revision.data.id,
    eventId: event.data.id,
    resourceId: resource.data.id,
  };
}

async function removeFixture(service, manifest, removeManifest = true) {
  const userIds = [manifest.studentId, manifest.outsiderId, manifest.adminId].filter(Boolean);
  const courseIds = Object.values(manifest.courseIds ?? {}).filter(Boolean);
  const revisionIds = Object.values(manifest.revisionIds ?? {}).filter(Boolean);

  if (userIds.length) {
    await service.from('student_course_preferences').delete().in('user_id', userIds);
    await service.from('enrollments').delete().in('user_id', userIds);
  }
  if (courseIds.length) await service.from('courses').delete().in('id', courseIds);
  if (revisionIds.length) await service.from('course_template_revisions').delete().in('id', revisionIds);
  if (manifest.masterMaterialId) {
    await service.from('master_materials').delete().eq('id', manifest.masterMaterialId);
  }
  if (manifest.masterSessionId) {
    await service.from('master_sessions').delete().eq('id', manifest.masterSessionId);
  }
  for (const userId of userIds) {
    await service.auth.admin.deleteUser(userId);
    await service.from('profiles').delete().eq('id', userId);
  }

  if (removeManifest) {
    await unlink(manifestPath).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }
}

async function setup() {
  await readFile(manifestPath, 'utf8').then(() => {
    throw new Error(`Fixture manifest already exists at ${manifestPath}; clean it first.`);
  }).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
  });

  const { anonKey, service } = clients();
  const runId = randomUUID();
  const password = `Tracker-${randomUUID()}!aA1`;
  const manifest = {
    projectRef,
    runId,
    email: `template-tracker-${runId}@example.invalid`,
    outsiderEmail: `template-tracker-outsider-${runId}@example.invalid`,
    adminEmail: `template-tracker-admin-${runId}@example.invalid`,
    password,
    studentId: null,
    outsiderId: null,
    adminId: null,
    courseIds: {},
    materialIds: {},
    templateIds: {},
    revisionIds: {},
    questionCounts: { rc: 5, di: 4, fullTemplate: 3, fullMaster: 2 },
    masterSessionId: null,
    masterMaterialId: null,
  };

  try {
    for (const [kind, email, role, fullName] of [
      ['studentId', manifest.email, 'student', 'Template Tracker QA Student'],
      ['outsiderId', manifest.outsiderEmail, 'student', 'Template Tracker QA Outsider'],
      ['adminId', manifest.adminEmail, 'admin', 'Template Tracker QA Admin'],
    ]) {
      const created = await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      assertNoError(created.error, `Create ${role} Auth user`);
      manifest[kind] = created.data.user.id;
      assertNoError((await service.from('profiles').upsert({
        id: created.data.user.id,
        email,
        full_name: fullName,
        role,
        is_active: true,
        activated_at: new Date().toISOString(),
      })).error, `Create ${role} profile`);
    }

    const origins = {
      rc: await createTemplateOrigin(
        service,
        runId,
        'RC Crash',
        manifest.questionCounts.rc,
        'rc-crash-course',
      ),
      di: await createTemplateOrigin(
        service,
        runId,
        'DI Crash',
        manifest.questionCounts.di,
        'di-crash-course',
      ),
      fullTemplate: await createTemplateOrigin(
        service,
        runId,
        'Full Template',
        manifest.questionCounts.fullTemplate,
        'full-course',
      ),
    };
    manifest.templateIds = Object.fromEntries(
      Object.entries(origins).map(([key, origin]) => [key, origin.templateId]),
    );
    manifest.revisionIds = Object.fromEntries(
      Object.entries(origins).map(([key, origin]) => [key, origin.revisionId]),
    );

    const courseRows = [
      ['rc', 'QA Released RC Crash', 'crash', origins.rc],
      ['di', 'QA Locked DI Crash', 'crash', origins.di],
      ['fullTemplate', 'QA Released Full Template', 'full', origins.fullTemplate],
      ['fullMaster', 'QA Released Full Master', 'full', null],
    ].map(([key, name, courseMode, origin]) => ({
      qa_key: key,
      name: `${name} ${runId.slice(0, 8)}`,
      description: `Disposable template tracker fixture ${runId}`,
      is_active: true,
      cohort_start_date: '2026-09-01',
      course_mode: courseMode,
      source_template_id: origin?.templateId ?? null,
      source_template_revision_id: origin?.revisionId ?? null,
    }));

    for (const row of courseRows) {
      const { qa_key: key, ...courseRow } = row;
      const inserted = await service.from('courses').insert(courseRow).select('id').single();
      assertNoError(inserted.error, `Create ${key} course`);
      manifest.courseIds[key] = inserted.data.id;
    }

    const masterSession = await service.from('master_sessions').insert({
      title: `QA Master Session ${runId}`,
      session_number: 9901,
      curriculum_key: `qa-master-${runId}`,
      week_number: 1,
      weekday: 'Monday',
      class_type: 'VA',
      curriculum_version: `qa-${runId}`,
      is_archived: false,
    }).select('id').single();
    assertNoError(masterSession.error, 'Create master session');
    manifest.masterSessionId = masterSession.data.id;

    const masterMaterial = await service.from('master_materials').insert({
      master_session_id: manifest.masterSessionId,
      type: 'worksheet',
      title: `QA Master Worksheet ${runId}`,
      file_url: `https://example.com/qa-master-${runId}.pdf`,
      question_count: manifest.questionCounts.fullMaster,
    }).select('id').single();
    assertNoError(masterMaterial.error, 'Create master worksheet');
    manifest.masterMaterialId = masterMaterial.data.id;

    const now = Date.now();
    const releasedStart = new Date(now - 2 * 60 * 60 * 1000).toISOString();
    const releasedEnd = new Date(now - 60 * 60 * 1000).toISOString();
    const futureStart = new Date(now + 60 * 60 * 1000).toISOString();
    const futureEnd = new Date(now + 2 * 60 * 60 * 1000).toISOString();

    for (const key of ['rc', 'di', 'fullTemplate', 'fullMaster']) {
      const isFuture = key === 'di';
      const insertedSession = await service.from('sessions').insert({
        course_id: manifest.courseIds[key],
        title: `QA ${key} Session`,
        session_number: 1,
        session_date: isFuture ? futureStart : releasedStart,
        session_end_at: isFuture ? futureEnd : releasedEnd,
        is_published: true,
        master_session_id: key === 'fullMaster' ? manifest.masterSessionId : null,
        class_type: key === 'di' ? 'DI' : 'VA',
        event_type: 'live_class',
        section_key: key === 'di' ? 'di' : 'va',
        display_order: 1,
        source_template_event_id: origins[key]?.eventId ?? null,
      }).select('id').single();
      assertNoError(insertedSession.error, `Create ${key} session`);

      const insertedMaterial = await service.from('materials').insert({
        course_id: manifest.courseIds[key],
        session_id: insertedSession.data.id,
        type: 'worksheet',
        title: `QA ${key} Worksheet`,
        file_url: `https://example.com/qa-${key}-${runId}.pdf`,
        available_from: isFuture ? futureEnd : releasedEnd,
        question_count: manifest.questionCounts[key],
        master_material_id: key === 'fullMaster' ? manifest.masterMaterialId : null,
        category: 'worksheet',
        resource_scope: 'event',
        resource_format: 'pdf',
        source_template_resource_id: origins[key]?.resourceId ?? null,
      }).select('id').single();
      assertNoError(insertedMaterial.error, `Create ${key} worksheet`);
      manifest.materialIds[key] = insertedMaterial.data.id;
    }

    assertNoError((await service.from('enrollments').insert(
      Object.values(manifest.courseIds).map((courseId, index) => ({
        user_id: manifest.studentId,
        course_id: courseId,
        enrolled_at: new Date(now + index * 1000).toISOString(),
      })),
    )).error, 'Enroll QA Student in all fixture courses');

    const qaClient = createClient(stagingUrl, anonKey, clientOptions);
    assertNoError((await qaClient.auth.signInWithPassword({
      email: manifest.email,
      password: manifest.password,
    })).error, 'Sign in QA Student');
    const options = await qaClient.rpc('get_student_course_options');
    assertNoError(options.error, 'Read initial course options');
    assert.equal(options.data.courses.length, 4);
    assert.equal(options.data.selected_course_id, null);

    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
    await chmod(manifestPath, 0o600);

    console.log(JSON.stringify({
      environment: 'staging',
      fixture: 'created',
      courseCount: 4,
      scenarios: ['released RC', 'locked DI', 'released Full template', 'released Full master'],
      qaEmail: manifest.email,
      manifestPath,
    }, null, 2));
  } catch (error) {
    await removeFixture(service, manifest, false).catch(() => {});
    throw error;
  }
}

async function selectCourse(client, courseId) {
  const result = await client.rpc('select_student_course', { p_course_id: courseId });
  assertNoError(result.error, `Select course ${courseId}`);
}

async function verify() {
  const manifest = await readManifest();
  assert.equal(manifest.projectRef, projectRef, 'Fixture must belong to approved Staging.');
  const { anonKey, service } = clients();
  const qaClient = createClient(stagingUrl, anonKey, clientOptions);
  assertNoError((await qaClient.auth.signInWithPassword({
    email: manifest.email,
    password: manifest.password,
  })).error, 'Sign in QA Student');

  await selectCourse(qaClient, manifest.courseIds.di);
  const [diTimeline, diPractice, diWorksheet] = await Promise.all([
    qaClient.rpc('get_student_timeline'),
    qaClient.rpc('get_student_practice_log'),
    qaClient.rpc('get_student_worksheet_log', { p_material_id: manifest.materialIds.di }),
  ]);
  assertNoError(diTimeline.error, 'Read locked DI timeline');
  assertNoError(diPractice.error, 'Read locked DI Practice Log');
  assert.equal(diPractice.data.worksheets.length, 0);
  assert.equal(diTimeline.data.sessions[0].materials[0].tracker_available, false);
  assert.ok(diWorksheet.error, 'Locked DI worksheet log must be inaccessible.');

  await selectCourse(qaClient, manifest.courseIds.rc);
  const rcPractice = await qaClient.rpc('get_student_practice_log');
  assertNoError(rcPractice.error, 'Read released RC Practice Log');
  assert.equal(rcPractice.data.worksheets.length, 1);
  assert.equal(rcPractice.data.worksheets[0].total_questions, manifest.questionCounts.rc);
  const rcWorksheet = await qaClient.rpc('get_student_worksheet_log', {
    p_material_id: manifest.materialIds.rc,
  });
  assertNoError(rcWorksheet.error, 'Read released RC worksheet');
  assert.equal(rcWorksheet.data.questions.length, manifest.questionCounts.rc);
  const rcQuestion = rcWorksheet.data.questions[0];
  const savedRc = await qaClient.rpc('update_student_question_log', {
    p_material_id: manifest.materialIds.rc,
    p_question_id: rcQuestion.id,
    p_status: 'done',
    p_time_taken_seconds: 75,
    p_comment: 'Disposable RC acceptance note',
  });
  assertNoError(savedRc.error, 'Save released RC worksheet log');
  const rcReloaded = await qaClient.rpc('get_student_worksheet_log', {
    p_material_id: manifest.materialIds.rc,
  });
  assertNoError(rcReloaded.error, 'Reload released RC worksheet');
  assert.equal(rcReloaded.data.questions[0].status, 'done');
  assert.equal(rcReloaded.data.questions[0].time_taken_seconds, 75);

  await selectCourse(qaClient, manifest.courseIds.fullTemplate);
  const templateFull = await qaClient.rpc('get_student_practice_log');
  assertNoError(templateFull.error, 'Read released template Full Course log');
  assert.equal(templateFull.data.worksheets[0].total_questions, manifest.questionCounts.fullTemplate);

  await selectCourse(qaClient, manifest.courseIds.fullMaster);
  const masterFull = await qaClient.rpc('get_student_practice_log');
  assertNoError(masterFull.error, 'Read released Master Base Full Course log');
  assert.equal(masterFull.data.worksheets[0].total_questions, manifest.questionCounts.fullMaster);
  const masterWorksheet = await qaClient.rpc('get_student_worksheet_log', {
    p_material_id: manifest.materialIds.fullMaster,
  });
  assertNoError(masterWorksheet.error, 'Read Master Base Full Course worksheet');
  const savedMaster = await qaClient.rpc('update_student_question_log', {
    p_material_id: manifest.materialIds.fullMaster,
    p_question_id: masterWorksheet.data.questions[0].id,
    p_status: 'review',
    p_time_taken_seconds: 90,
    p_comment: 'Disposable Master Base regression note',
  });
  assertNoError(savedMaster.error, 'Save Master Base Full Course worksheet log');

  const outsider = createClient(stagingUrl, anonKey, clientOptions);
  assertNoError((await outsider.auth.signInWithPassword({
    email: manifest.outsiderEmail,
    password: manifest.password,
  })).error, 'Sign in non-enrolled Student');
  const outsiderRead = await outsider.rpc('get_student_worksheet_log', {
    p_material_id: manifest.materialIds.rc,
  });
  assert.ok(outsiderRead.error, 'Non-enrolled Student must not read the RC worksheet log.');
  const outsiderWrite = await outsider.rpc('update_student_question_log', {
    p_material_id: manifest.materialIds.rc,
    p_question_id: rcQuestion.id,
    p_status: 'done',
    p_time_taken_seconds: 1,
    p_comment: 'Must not save',
  });
  assert.ok(outsiderWrite.error, 'Non-enrolled Student must not update the RC worksheet log.');

  const admin = createClient(stagingUrl, anonKey, clientOptions);
  assertNoError((await admin.auth.signInWithPassword({
    email: manifest.adminEmail,
    password: manifest.password,
  })).error, 'Sign in QA Admin');
  const adminRc = await admin.rpc('get_admin_course_practice_progress', {
    p_course_id: manifest.courseIds.rc,
  });
  assertNoError(adminRc.error, 'Read RC admin progress');
  assert.equal(adminRc.data.worksheets[0].total_questions, manifest.questionCounts.rc);
  assert.equal(adminRc.data.progress[0].done_count, 1);

  const counts = await Promise.all([
    service.from('material_worksheet_questions').select('id', { count: 'exact', head: true })
      .eq('material_id', manifest.materialIds.rc),
    service.from('material_worksheet_questions').select('id', { count: 'exact', head: true })
      .eq('material_id', manifest.materialIds.di),
    service.from('material_worksheet_questions').select('id', { count: 'exact', head: true })
      .eq('material_id', manifest.materialIds.fullTemplate),
  ]);
  counts.forEach((result, index) => assertNoError(result.error, `Count material questions ${index}`));
  assert.deepEqual(counts.map((result) => result.count), [
    manifest.questionCounts.rc,
    manifest.questionCounts.di,
    manifest.questionCounts.fullTemplate,
  ]);

  console.log(JSON.stringify({
    environment: 'staging',
    fixture: 'verified',
    lockedDI: true,
    releasedRCQuestions: manifest.questionCounts.rc,
    releasedTemplateFullQuestions: manifest.questionCounts.fullTemplate,
    masterFullRegressionQuestions: manifest.questionCounts.fullMaster,
    saveAndReload: true,
    nonEnrolledAccessDenied: true,
    adminProgressCompatible: true,
  }, null, 2));
}

async function cleanup() {
  const manifest = await readManifest();
  assert.equal(manifest.projectRef, projectRef, 'Fixture must belong to approved Staging.');
  const { service } = clients();
  await removeFixture(service, manifest);

  const [profiles, courses, revisions] = await Promise.all([
    service.from('profiles').select('id', { count: 'exact', head: true })
      .ilike('email', `%${manifest.runId}%`),
    service.from('courses').select('id', { count: 'exact', head: true })
      .eq('description', `Disposable template tracker fixture ${manifest.runId}`),
    service.from('course_template_revisions').select('id', { count: 'exact', head: true })
      .eq('title', `Disposable template tracker fixture ${manifest.runId}`),
  ]);
  assertNoError(profiles.error, 'Audit profile cleanup');
  assertNoError(courses.error, 'Audit course cleanup');
  assertNoError(revisions.error, 'Audit template revision cleanup');
  assert.equal(profiles.count, 0);
  assert.equal(courses.count, 0);
  assert.equal(revisions.count, 0);

  console.log(JSON.stringify({
    environment: 'staging',
    fixture: 'removed',
    profileResidue: profiles.count,
    courseResidue: courses.count,
    templateRevisionResidue: revisions.count,
    manifestRemoved: true,
  }, null, 2));
}

if (mode === 'setup') await setup();
if (mode === 'verify') await verify();
if (mode === 'cleanup') await cleanup();
