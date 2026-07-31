import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceRoleKey) {
  throw new Error('Staging Supabase URL, anon key, and service-role key are required.');
}

const options = { auth: { autoRefreshToken: false, persistSession: false } };
const service = createClient(url, serviceRoleKey, options);
const runId = randomUUID();
const password = `P1-${randomUUID()}!aA1`;
const users = [
  { label: 'admin', email: `phase1-admin-${runId}@example.invalid`, role: 'admin' },
  { label: 'studentA', email: `phase1-student-a-${runId}@example.invalid`, role: 'student' },
  { label: 'studentB', email: `phase1-student-b-${runId}@example.invalid`, role: 'student' },
];

const createdUserIds = [];
let courseId;
let sessionId;
const materialIds = [];

function assertNoError(error, context) {
  if (error) throw new Error(`${context}: ${error.message}`);
}

async function countRows(client, table, select = 'id') {
  const { data, error } = await client.from(table).select(select);
  assertNoError(error, `Read ${table}`);
  return data ?? [];
}

async function signIn(email) {
  const client = createClient(url, anonKey, options);
  const { error } = await client.auth.signInWithPassword({ email, password });
  assertNoError(error, 'Password sign-in');
  return client;
}

try {
  for (const user of users) {
    const { data, error } = await service.auth.admin.createUser({
      email: user.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: `Phase 1 ${user.label}` },
    });
    assertNoError(error, `Create ${user.label}`);
    createdUserIds.push(data.user.id);
    user.id = data.user.id;
  }

  const { error: profileError } = await service.from('profiles').upsert(
    users.map((user) => ({
      id: user.id,
      email: user.email,
      full_name: `Phase 1 ${user.label}`,
      role: user.role,
      is_active: true,
    })),
  );
  assertNoError(profileError, 'Prepare profiles');

  const { data: course, error: courseError } = await service
    .from('courses')
    .insert({ name: `Phase 1 probe ${runId}`, is_active: true })
    .select('id')
    .single();
  assertNoError(courseError, 'Create course');
  courseId = course.id;

  const { error: enrollmentError } = await service
    .from('enrollments')
    .insert({ user_id: users[1].id, course_id: courseId });
  assertNoError(enrollmentError, 'Enroll student A');

  const { data: session, error: sessionError } = await service
    .from('sessions')
    .insert({
      course_id: courseId,
      title: 'Phase 1 probe session',
      session_number: 1,
      session_date: new Date().toISOString(),
      is_published: true,
    })
    .select('id')
    .single();
  assertNoError(sessionError, 'Create session');
  sessionId = session.id;

  const now = Date.now();
  const { data: materials, error: materialError } = await service
    .from('materials')
    .insert([
      {
        session_id: sessionId,
        type: 'class_material',
        title: 'Released probe material',
        available_from: new Date(now - 60_000).toISOString(),
      },
      {
        session_id: sessionId,
        type: 'class_material',
        title: 'Future probe material',
        available_from: new Date(now + 86_400_000).toISOString(),
      },
    ])
    .select('id, available_from');
  assertNoError(materialError, 'Create materials');
  materialIds.push(...materials.map((material) => material.id));
  const futureMaterialId = materials.find(
    (material) => new Date(material.available_from).getTime() > now,
  ).id;

  const anonymous = createClient(url, anonKey, options);
  const admin = await signIn(users[0].email);
  const studentA = await signIn(users[1].email);
  const studentB = await signIn(users[2].email);

  const anonymousProfiles = await countRows(anonymous, 'profiles');
  const anonymousEnrollments = await countRows(anonymous, 'enrollments');
  const studentAProfiles = await countRows(studentA, 'profiles');
  const studentAEnrollments = await countRows(studentA, 'enrollments', 'id, user_id');
  const studentACourses = await countRows(studentA, 'courses');
  const studentASessions = await countRows(studentA, 'sessions');
  const studentAMaterials = await countRows(studentA, 'materials', 'id, available_from');
  const studentBProfiles = await countRows(studentB, 'profiles');
  const studentBCourses = await countRows(studentB, 'courses');
  const studentBMaterials = await countRows(studentB, 'materials');
  const adminProfiles = await countRows(admin, 'profiles');

  const { error: deactivateError } = await service
    .from('profiles')
    .update({ is_active: false })
    .eq('id', users[1].id);
  assertNoError(deactivateError, 'Deactivate student A');
  const deactivatedCourses = await countRows(studentA, 'courses');

  const checks = {
    anonymous_cannot_read_profiles: anonymousProfiles.length === 0,
    anonymous_cannot_read_enrollments: anonymousEnrollments.length === 0,
    student_reads_only_own_profile:
      studentAProfiles.length === 1 && studentAProfiles[0].id === users[1].id,
    student_reads_only_own_enrollment:
      studentAEnrollments.length === 1 &&
      studentAEnrollments[0].user_id === users[1].id,
    enrolled_student_reads_course: studentACourses.length === 1,
    enrolled_student_reads_session: studentASessions.length === 1,
    unenrolled_student_cannot_read_course: studentBCourses.length === 0,
    unenrolled_student_cannot_read_materials: studentBMaterials.length === 0,
    second_student_reads_only_own_profile:
      studentBProfiles.length === 1 && studentBProfiles[0].id === users[2].id,
    admin_can_read_test_profiles: adminProfiles.length >= 3,
    deactivated_student_loses_course_access: deactivatedCourses.length === 0,
    future_material_is_hidden:
      !studentAMaterials.some((material) => material.id === futureMaterialId),
  };

  console.log(JSON.stringify({
    environment: 'staging',
    checks,
    counts: {
      enrolled_student_materials_visible: studentAMaterials.length,
      test_materials_created: materials.length,
    },
    passed: Object.values(checks).filter(Boolean).length,
    failed: Object.values(checks).filter((value) => !value).length,
  }, null, 2));
} finally {
  if (materialIds.length) {
    await service.from('materials').delete().in('id', materialIds);
  }
  if (sessionId) {
    await service.from('sessions').delete().eq('id', sessionId);
  }
  if (courseId) {
    await service.from('enrollments').delete().eq('course_id', courseId);
    await service.from('courses').delete().eq('id', courseId);
  }
  for (const userId of createdUserIds.reverse()) {
    await service.auth.admin.deleteUser(userId);
  }
}
