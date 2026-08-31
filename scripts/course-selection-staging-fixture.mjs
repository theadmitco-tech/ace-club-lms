import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { chmod, readFile, unlink, writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const projectRef = 'eyphkkginlgoaxflauog';
const stagingUrl = `https://${projectRef}.supabase.co`;
const manifestPath = process.env.COURSE_SELECTION_FIXTURE_PATH
  ?? '/private/tmp/ace-club-release1-course-selection-fixture.json';
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

const options = { auth: { autoRefreshToken: false, persistSession: false } };

function clients() {
  const { anonKey, serviceRoleKey } = loadApiKeys();
  return {
    anonKey,
    service: createClient(stagingUrl, serviceRoleKey, options),
  };
}

function assertNoError(error, context) {
  if (error) throw new Error(`${context}: ${error.message}`);
}

async function readManifest() {
  return JSON.parse(await readFile(manifestPath, 'utf8'));
}

async function removeFixture(service, manifest, removeManifest = true) {
  const courseIds = [manifest.activeCourseId, manifest.historicalCourseId].filter(Boolean);

  if (manifest.userId) {
    assertNoError(
      (await service.from('student_course_preferences').delete().eq('user_id', manifest.userId)).error,
      'Delete course preference',
    );
    assertNoError(
      (await service.from('enrollments').delete().eq('user_id', manifest.userId)).error,
      'Delete enrollments',
    );
  }

  if (courseIds.length) {
    assertNoError(
      (await service.from('courses').delete().in('id', courseIds)).error,
      'Delete courses',
    );
  }

  if (manifest.userId) {
    const deletedUser = await service.auth.admin.deleteUser(manifest.userId);
    assertNoError(deletedUser.error, 'Delete Auth user');
    assertNoError(
      (await service.from('profiles').delete().eq('id', manifest.userId)).error,
      'Delete residual profile',
    );
  }

  if (removeManifest) {
    await unlink(manifestPath).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }
}

async function setup() {
  await readFile(manifestPath, 'utf8').then(() => {
    throw new Error(`Fixture manifest already exists at ${manifestPath}; clean it before another setup.`);
  }).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
  });

  const { anonKey, service } = clients();
  const runId = randomUUID();
  const manifest = {
    projectRef,
    runId,
    email: `release1-course-selection-${runId}@example.invalid`,
    password: `R1-${randomUUID()}!aA1`,
    userId: null,
    activeCourseId: null,
    historicalCourseId: null,
    activeCourseName: `QA Current RC ${runId.slice(0, 8)}`,
    historicalCourseName: `QA Historical CR ${runId.slice(0, 8)}`,
  };

  try {
    const createdUser = await service.auth.admin.createUser({
      email: manifest.email,
      password: manifest.password,
      email_confirm: true,
      user_metadata: { full_name: 'Release 1 QA Student' },
    });
    assertNoError(createdUser.error, 'Create QA Auth user');
    manifest.userId = createdUser.data.user.id;

    assertNoError((await service.from('profiles').upsert({
      id: manifest.userId,
      email: manifest.email,
      full_name: 'Release 1 QA Student',
      role: 'student',
      is_active: true,
      activated_at: new Date().toISOString(),
    })).error, 'Create QA Student profile');

    const insertedCourses = await service.from('courses').insert([
      {
        name: manifest.activeCourseName,
        description: `Disposable Release 1 fixture ${runId}`,
        is_active: true,
        cohort_start_date: '2026-08-31',
        course_mode: 'crash',
      },
      {
        name: manifest.historicalCourseName,
        description: `Disposable Release 1 fixture ${runId}`,
        is_active: false,
        cohort_start_date: '2026-07-01',
        course_mode: 'crash',
      },
    ]).select('id,name,is_active');
    assertNoError(insertedCourses.error, 'Create QA courses');
    manifest.activeCourseId = insertedCourses.data.find((course) => course.is_active)?.id ?? null;
    manifest.historicalCourseId = insertedCourses.data.find((course) => !course.is_active)?.id ?? null;
    assert.ok(manifest.activeCourseId && manifest.historicalCourseId, 'Both QA courses must exist.');

    assertNoError((await service.from('enrollments').insert([
      {
        user_id: manifest.userId,
        course_id: manifest.historicalCourseId,
        enrolled_at: '2026-07-01T00:00:00.000Z',
      },
      {
        user_id: manifest.userId,
        course_id: manifest.activeCourseId,
        enrolled_at: '2026-08-31T00:00:00.000Z',
      },
    ])).error, 'Create QA enrollments');

    const qaClient = createClient(stagingUrl, anonKey, options);
    assertNoError((await qaClient.auth.signInWithPassword({
      email: manifest.email,
      password: manifest.password,
    })).error, 'Sign in QA Student');
    const optionsResult = await qaClient.rpc('get_student_course_options');
    assertNoError(optionsResult.error, 'Read QA course options');
    assert.equal(optionsResult.data.selected_course_id, null, 'Fresh multi-course Student must not have a selection.');
    assert.equal(optionsResult.data.courses.length, 2, 'Fresh multi-course Student must see two courses.');
    assert.ok(optionsResult.data.courses.some((course) => course.id === manifest.historicalCourseId && course.is_active === false));

    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
    await chmod(manifestPath, 0o600);
    console.log(JSON.stringify({
      environment: 'staging',
      projectRef,
      fixture: 'created',
      courseCount: 2,
      hasInitialPreference: false,
      includesHistoricalInactiveCourse: true,
      manifestPath,
    }, null, 2));
  } catch (error) {
    await removeFixture(service, manifest, false).catch(() => {});
    throw error;
  }
}

async function verify() {
  const manifest = await readManifest();
  assert.equal(manifest.projectRef, projectRef, 'Fixture must belong to approved Staging.');
  const { anonKey, service } = clients();
  const qaClient = createClient(stagingUrl, anonKey, options);
  assertNoError((await qaClient.auth.signInWithPassword({
    email: manifest.email,
    password: manifest.password,
  })).error, 'Sign in QA Student');

  const [identityResult, optionsResult, preferenceResult] = await Promise.all([
    qaClient.rpc('get_portal_identity'),
    qaClient.rpc('get_student_course_options'),
    service.from('student_course_preferences').select('selected_course_id').eq('user_id', manifest.userId).single(),
  ]);
  assertNoError(identityResult.error, 'Read portal identity');
  assertNoError(optionsResult.error, 'Read course options');
  assertNoError(preferenceResult.error, 'Read selected preference');
  assert.equal(identityResult.data.course_count, 2);
  assert.equal(optionsResult.data.courses.length, 2);
  assert.ok(optionsResult.data.courses.some((course) => course.id === manifest.historicalCourseId && course.is_active === false));
  assert.ok(
    [manifest.activeCourseId, manifest.historicalCourseId].includes(preferenceResult.data.selected_course_id),
    'Browser acceptance must select one enrolled course.',
  );
  assert.equal(identityResult.data.selected_course_id, preferenceResult.data.selected_course_id);

  console.log(JSON.stringify({
    environment: 'staging',
    fixture: 'verified',
    courseCount: 2,
    historicalCourseSelectable: true,
    browserSelectionPersisted: true,
  }, null, 2));
}

async function cleanup() {
  const manifest = await readManifest();
  assert.equal(manifest.projectRef, projectRef, 'Fixture must belong to approved Staging.');
  const { service } = clients();
  await removeFixture(service, manifest);

  const [users, courses] = await Promise.all([
    service.from('profiles').select('id', { count: 'exact', head: true }).eq('email', manifest.email),
    service.from('courses').select('id', { count: 'exact', head: true }).eq('description', `Disposable Release 1 fixture ${manifest.runId}`),
  ]);
  assertNoError(users.error, 'Audit profile cleanup');
  assertNoError(courses.error, 'Audit course cleanup');
  assert.equal(users.count, 0, 'QA profile residue must be zero.');
  assert.equal(courses.count, 0, 'QA course residue must be zero.');

  console.log(JSON.stringify({
    environment: 'staging',
    fixture: 'removed',
    profileResidue: users.count,
    courseResidue: courses.count,
    manifestRemoved: true,
  }, null, 2));
}

if (mode === 'setup') await setup();
if (mode === 'verify') await verify();
if (mode === 'cleanup') await cleanup();
