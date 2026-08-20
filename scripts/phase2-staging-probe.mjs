import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const environment = process.env.PHASE2_PROBE_ENVIRONMENT ?? 'staging';
const skipStaleTemplate = process.env.PHASE2_SKIP_STALE_TEMPLATE === '1';
const skipStaleSchedule = process.env.PHASE2_SKIP_STALE_SCHEDULE === '1';

if (!url || !anonKey || !serviceRoleKey) {
  throw new Error('Staging Supabase URL, anon key, and service-role key are required.');
}
if (!url.includes('eyphkkginlgoaxflauog')) {
  throw new Error('Phase 2 probe refused: configured Supabase URL is not the approved Staging project.');
}

const options = { auth: { autoRefreshToken: false, persistSession: false } };
const service = createClient(url, serviceRoleKey, options);
const anonymous = createClient(url, anonKey, options);
const runId = randomUUID();
const password = `P2-${randomUUID()}!aA1`;
const users = [
  { label: 'admin', email: `phase2-admin-${runId}@example.invalid`, role: 'admin' },
  { label: 'student', email: `phase2-student-${runId}@example.invalid`, role: 'student' },
];
const createdUserIds = [];
let courseId;

function assertNoError(error, context) {
  if (error) throw new Error(`${context}: ${error.message}`);
}

async function signIn(email) {
  const client = createClient(url, anonKey, options);
  const { error } = await client.auth.signInWithPassword({ email, password });
  assertNoError(error, `Sign in ${email}`);
  return client;
}

async function exactCount(table, configure = (query) => query) {
  const query = configure(service.from(table).select('id', { count: 'exact', head: true }));
  const { count, error } = await query;
  assertNoError(error, `Count ${table}`);
  return count ?? 0;
}

async function expectRpcError(client, fn, args, pattern, label) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const { error } = await client.rpc(fn, args);
    assert(error, `${label}: expected an RPC error`);
    if (!/upstream request timeout/i.test(error.message) || attempt === 3) {
      assert.match(error.message, pattern, `${label}: unexpected error`);
      return error.message;
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 500));
  }
  throw new Error(`${label}: retry loop ended unexpectedly`);
}

async function getCourseRevision() {
  const { data, error } = await service.from('courses').select('schedule_revision').eq('id', courseId).single();
  assertNoError(error, 'Read schedule revision');
  return data.schedule_revision;
}

async function getSessions() {
  const { data, error } = await service.from('sessions')
    .select('id,title,session_number,session_date,session_end_at,event_type,section_key,display_order,instructor,venue,instructions,is_published,cancelled_at')
    .eq('course_id', courseId)
    .order('display_order');
  assertNoError(error, 'Read probe sessions');
  return data;
}

function saveArgs(session, revision, overrides = {}) {
  const duration = Math.round((new Date(session.session_end_at) - new Date(session.session_date)) / 60_000);
  return {
    p_course_id: courseId,
    p_session_id: session.id,
    p_expected_schedule_revision: revision,
    p_title: session.title,
    p_event_type: session.event_type,
    p_section_key: session.section_key,
    p_starts_at: session.session_date,
    p_duration_minutes: duration,
    p_instructor: session.instructor ?? '',
    p_venue: session.venue ?? '',
    p_reporting_time: null,
    p_instructions: session.instructions ?? '',
    p_is_published: session.is_published,
    ...overrides,
  };
}

async function otherBatchSnapshot() {
  const { data: course, error: courseError } = await service.from('courses')
    .select('id,name,schedule_revision,source_template_revision_id')
    .eq('name', 'V2 QA CR 2026-08-17')
    .maybeSingle();
  assertNoError(courseError, 'Read isolation batch');
  if (!course) return null;
  const { data: sessions, error: sessionsError } = await service.from('sessions')
    .select('id,title,session_number,session_date,cancelled_at')
    .eq('course_id', course.id)
    .order('session_number');
  assertNoError(sessionsError, 'Read isolation batch sessions');
  return { course, sessions };
}

async function removeProbeCourse(probeCourseId) {
  const { data: sessions, error: sessionsError } = await service.from('sessions')
    .select('id').eq('course_id', probeCourseId);
  assertNoError(sessionsError, 'Audit probe sessions');
  const sessionIds = sessions.map((item) => item.id);
  if (sessionIds.length) {
    assertNoError((await service.from('materials').delete().in('session_id', sessionIds)).error, 'Audit-delete probe materials');
    assertNoError((await service.from('practice_sets').delete().in('session_id', sessionIds)).error, 'Audit-delete probe practice sets');
  }
  assertNoError((await service.from('enrollments').delete().eq('course_id', probeCourseId)).error, 'Audit-delete probe enrollments');
  assertNoError((await service.from('sessions').delete().eq('course_id', probeCourseId)).error, 'Audit-delete probe sessions');
  assertNoError((await service.from('courses').delete().eq('id', probeCourseId)).error, 'Audit-delete probe course');
}

async function cleanupOwnedProbeOrphans() {
  const { data: courses, error: coursesError } = await service.from('courses')
    .select('id').like('name', 'Phase 2 authenticated probe %');
  assertNoError(coursesError, 'Audit prior probe courses');
  for (const course of courses) await removeProbeCourse(course.id);

  const { data: authPage, error: usersError } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  assertNoError(usersError, 'Audit prior probe users');
  const probeUsers = authPage.users.filter((user) => /^phase2-(admin|student)-.+@example\.invalid$/.test(user.email ?? ''));
  for (const user of probeUsers) {
    assertNoError((await service.auth.admin.deleteUser(user.id)).error, 'Audit-delete prior probe user');
  }
  return { courses: courses.length, users: probeUsers.length };
}

const checks = {};
const skipped = [];
const diagnostics = {};

try {
  const orphanCleanup = await cleanupOwnedProbeOrphans();
  checks.pre_run_orphan_cleanup = orphanCleanup.courses >= 0 && orphanCleanup.users >= 0;

  for (const user of users) {
    const { data, error } = await service.auth.admin.createUser({
      email: user.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: `Phase 2 ${user.label}` },
    });
    assertNoError(error, `Create ${user.label}`);
    user.id = data.user.id;
    createdUserIds.push(user.id);
  }

  const { error: profilesError } = await service.from('profiles').upsert(users.map((user) => ({
    id: user.id,
    email: user.email,
    full_name: `Phase 2 ${user.label}`,
    role: user.role,
    is_active: true,
  })));
  assertNoError(profilesError, 'Prepare probe profiles');

  const admin = await signIn(users[0].email);
  const student = await signIn(users[1].email);

  const { data: template, error: templateError } = await service.from('course_templates')
    .select('id,name,current_revision_id,course_mode')
    .eq('template_key', 'full-course')
    .single();
  assertNoError(templateError, 'Read Full Course template');

  const proposalCountsBefore = {
    courses: await exactCount('courses'),
    sessions: await exactCount('sessions'),
    materials: await exactCount('materials'),
  };
  const { data: proposalEvents, error: proposalEventsError } = await service.from('course_template_events')
    .select('id,title,display_order,relative_day,start_time,duration_minutes')
    .eq('revision_id', template.current_revision_id)
    .order('display_order');
  assertNoError(proposalEventsError, 'Read no-write proposal events');
  const { data: proposalResources, error: proposalResourcesError } = await service.from('course_template_resources')
    .select('id,event_id,resource_type')
    .eq('revision_id', template.current_revision_id);
  assertNoError(proposalResourcesError, 'Read no-write proposal resources');
  const proposalCountsAfter = {
    courses: await exactCount('courses'),
    sessions: await exactCount('sessions'),
    materials: await exactCount('materials'),
  };
  checks.no_write_proposal = proposalEvents.length > 0 && JSON.stringify(proposalCountsBefore) === JSON.stringify(proposalCountsAfter);

  const otherBefore = await otherBatchSnapshot();
  const templateBefore = JSON.stringify(template);
  const idempotencyKey = randomUUID();
  const createArgs = {
    p_name: `Phase 2 authenticated probe ${runId}`,
    p_template_id: template.id,
    p_expected_revision_id: template.current_revision_id,
    p_start_date: '2028-01-10',
    p_publication_state: 'draft',
    p_idempotency_key: idempotencyKey,
  };

  const { data: created, error: createError } = await admin.rpc('confirm_template_batch', createArgs);
  assertNoError(createError, 'Create authenticated probe batch');
  courseId = created.courseId;
  assert.equal(created.replayed, false);
  assert.equal(created.sessions, proposalEvents.length);
  assert.equal(created.materials, proposalResources.length);

  const sessionsBeforeRetry = await getSessions();
  const countsBeforeRetry = {
    sessions: await exactCount('sessions', (query) => query.eq('course_id', courseId)),
    materials: await exactCount('materials', (query) => query.in('session_id', sessionsBeforeRetry.map((item) => item.id))),
  };
  const { data: replayed, error: replayError } = await admin.rpc('confirm_template_batch', createArgs);
  assertNoError(replayError, 'Retry authenticated probe batch');
  const retrySessions = await getSessions();
  const countsAfterRetry = {
    sessions: retrySessions.length,
    materials: await exactCount('materials', (query) => query.in('session_id', retrySessions.map((item) => item.id))),
  };
  checks.idempotent_retry = replayed.replayed === true && replayed.courseId === courseId
    && JSON.stringify(countsBeforeRetry) === JSON.stringify(countsAfterRetry);

  if (skipStaleTemplate) {
    skipped.push('stale_template_rejected_gateway_timeout');
  } else {
    const courseCountBeforeStaleTemplate = await exactCount('courses');
    await expectRpcError(admin, 'confirm_template_batch', {
      ...createArgs,
      p_name: `Phase 2 stale template ${runId}`,
      p_expected_revision_id: randomUUID(),
      p_idempotency_key: randomUUID(),
    }, /template changed after preview/i, 'Stale template');
    checks.stale_template_rejected = await exactCount('courses') === courseCountBeforeStaleTemplate;
  }

  const { error: enrollmentError } = await service.from('enrollments').insert({ user_id: users[1].id, course_id: courseId });
  assertNoError(enrollmentError, 'Enroll probe student');

  let revision = await getCourseRevision();
  let sessions = await getSessions();
  const editable = sessions[0];
  const { data: edited, error: editError } = await admin.rpc('save_batch_event', saveArgs(editable, revision, {
    p_title: `${editable.title} [authenticated edit]`,
    p_venue: 'Phase 2 room',
  }));
  assertNoError(editError, 'Edit future event after enrollment');
  revision = edited.scheduleRevision;
  const editedRow = (await getSessions()).find((item) => item.id === editable.id);
  checks.future_edit_after_enrollment = editedRow.title.endsWith('[authenticated edit]') && editedRow.venue === 'Phase 2 room';

  if (skipStaleSchedule) {
    skipped.push('stale_schedule_rejected_gateway_timeout');
  } else {
    await expectRpcError(admin, 'save_batch_event', {
      ...saveArgs(editable, 1),
      p_session_id: null,
      p_title: 'Stale schedule extra event',
      p_starts_at: '2028-12-01T14:30:00.000Z',
    }, /schedule changed after review/i, 'Stale schedule');
    checks.stale_schedule_rejected = await getCourseRevision() === revision;
  }

  const extraStartsAt = '2028-12-01T14:30:00.000Z';
  const { data: extra, error: extraError } = await admin.rpc('save_batch_event', {
    p_course_id: courseId,
    p_session_id: null,
    p_expected_schedule_revision: revision,
    p_title: 'Phase 2 extra class',
    p_event_type: 'live_class',
    p_section_key: 'programme',
    p_starts_at: extraStartsAt,
    p_duration_minutes: 90,
    p_instructor: 'Probe instructor',
    p_venue: 'Probe venue',
    p_reporting_time: null,
    p_instructions: 'Authenticated Phase 2 verification',
    p_is_published: false,
  });
  assertNoError(extraError, 'Add extra future event');
  revision = extra.scheduleRevision;
  checks.extra_class_isolated = (await getSessions()).some((item) => item.id === extra.sessionId && item.title === 'Phase 2 extra class');

  sessions = await getSessions();
  const originalIds = sessions.map((item) => item.id);
  const arbitraryIds = [...originalIds];
  const lastArbitraryIndex = arbitraryIds.length - 1;
  [arbitraryIds[0], arbitraryIds[lastArbitraryIndex]] = [arbitraryIds[lastArbitraryIndex], arbitraryIds[0]];
  const { data: reordered, error: reorderError } = await admin.rpc('reorder_batch_events', {
    p_course_id: courseId,
    p_ordered_session_ids: arbitraryIds,
    p_expected_schedule_revision: revision,
  });
  assertNoError(reorderError, 'Reorder arbitrary future events');
  revision = reordered.scheduleRevision;
  checks.arbitrary_reorder = JSON.stringify((await getSessions()).map((item) => item.id)) === JSON.stringify(arbitraryIds);

  sessions = await getSessions();
  const sectionCounts = new Map();
  for (const session of sessions) sectionCounts.set(session.section_key, (sectionCounts.get(session.section_key) ?? 0) + 1);
  const sectionKey = [...sectionCounts].find(([, count]) => count > 1)?.[0];
  assert(sectionKey, 'Expected one complete multi-event Section');
  const sectionIds = sessions.filter((item) => item.section_key === sectionKey).map((item) => item.id);
  const sectionMoveIds = sessions.filter((item) => item.section_key !== sectionKey).map((item) => item.id).concat(sectionIds);
  const { data: sectionMoved, error: sectionMoveError } = await admin.rpc('reorder_batch_events', {
    p_course_id: courseId,
    p_ordered_session_ids: sectionMoveIds,
    p_expected_schedule_revision: revision,
  });
  assertNoError(sectionMoveError, 'Move complete eligible Section');
  revision = sectionMoved.scheduleRevision;
  checks.complete_section_move = JSON.stringify((await getSessions()).slice(-sectionIds.length).map((item) => item.id)) === JSON.stringify(sectionIds);

  sessions = await getSessions();
  const shiftStart = sessions[0];
  const releasedAt = new Date(Date.now() - 86_400_000).toISOString();
  const futureAt = new Date(Date.now() + 86_400_000).toISOString();
  const { data: probeMaterials, error: probeMaterialsError } = await service.from('materials').insert([
    { session_id: shiftStart.id, type: 'class_material', title: 'Phase 2 released marker', available_from: releasedAt },
    { session_id: shiftStart.id, type: 'class_material', title: 'Phase 2 future marker', available_from: futureAt },
  ]).select('id,title,available_from');
  assertNoError(probeMaterialsError, 'Create release-boundary markers');
  const releasedMarker = probeMaterials.find((item) => item.title.includes('released'));
  const futureMarker = probeMaterials.find((item) => item.title.includes('future'));
  const datesBeforeShift = new Map(sessions.map((item) => [item.id, item.session_date]));
  const { data: shifted, error: shiftError } = await admin.rpc('shift_batch_schedule', {
    p_course_id: courseId,
    p_selected_session_id: shiftStart.id,
    p_days: 2,
    p_expected_schedule_revision: revision,
  });
  assertNoError(shiftError, 'Shift all eligible subsequent events by two days');
  revision = shifted.scheduleRevision;
  const sessionsAfterShift = await getSessions();
  checks.two_day_shift = sessionsAfterShift.every((item) =>
    new Date(item.session_date) - new Date(datesBeforeShift.get(item.id)) === 2 * 86_400_000);
  const { data: markersAfterShift, error: markersAfterShiftError } = await service.from('materials')
    .select('id,available_from').in('id', [releasedMarker.id, futureMarker.id]);
  assertNoError(markersAfterShiftError, 'Read release-boundary markers');
  const releasedAfter = markersAfterShift.find((item) => item.id === releasedMarker.id);
  const futureAfter = markersAfterShift.find((item) => item.id === futureMarker.id);
  const shiftedStartAfter = sessionsAfterShift.find((item) => item.id === shiftStart.id);
  checks.release_boundaries = new Date(releasedAfter.available_from).getTime() === new Date(releasedMarker.available_from).getTime()
    && new Date(futureAfter.available_from).getTime() === new Date(shiftedStartAfter.session_end_at).getTime();
  diagnostics.release_boundaries = {
    releasedBefore: new Date(releasedMarker.available_from).getTime(),
    releasedAfter: new Date(releasedAfter.available_from).getTime(),
    futureBefore: new Date(futureMarker.available_from).getTime(),
    futureAfter: new Date(futureAfter.available_from).getTime(),
    expectedFutureAfter: new Date(shiftedStartAfter.session_end_at).getTime(),
  };
  checks.shift_consequence_list = shifted.events.length === sessions.length
    && shifted.events.every((item) => new Date(item.after) - new Date(item.before) === 2 * 86_400_000);

  const cancellable = sessionsAfterShift.at(-1);
  const publishedBeforeCancel = cancellable.is_published;
  const { data: cancelled, error: cancelError } = await admin.rpc('cancel_batch_event', {
    p_course_id: courseId,
    p_session_id: cancellable.id,
    p_reason: 'Authenticated Phase 2 cancellation verification',
    p_expected_schedule_revision: revision,
  });
  assertNoError(cancelError, 'Cancel eligible future event');
  revision = cancelled.scheduleRevision;
  const cancelledRow = (await getSessions()).find((item) => item.id === cancellable.id);
  checks.future_cancellation = Boolean(cancelledRow.cancelled_at) && cancelledRow.is_published === publishedBeforeCancel;

  const currentStarts = new Date(Date.now() - 30 * 60_000);
  const currentEnds = new Date(Date.now() + 30 * 60_000);
  const currentOrder = Math.max(...(await getSessions()).map((item) => item.display_order)) + 1;
  const { data: currentEvent, error: currentEventError } = await service.from('sessions').insert({
    course_id: courseId,
    title: 'Phase 2 current event',
    session_number: currentOrder,
    display_order: currentOrder,
    session_date: currentStarts.toISOString(),
    session_end_at: currentEnds.toISOString(),
    class_type: 'PROGRAMME',
    event_type: 'support',
    section_key: 'programme',
    is_published: true,
  }).select('id,title,session_date,session_end_at,event_type,section_key,instructor,venue,instructions,is_published').single();
  assertNoError(currentEventError, 'Create current-event protection fixture');

  await expectRpcError(admin, 'save_batch_event', saveArgs(currentEvent, revision, {
    p_title: 'Forbidden current-event scheduling edit',
  }), /completed or current events allow only venue and instruction corrections/i, 'Current event edit protection');
  await expectRpcError(admin, 'cancel_batch_event', {
    p_course_id: courseId,
    p_session_id: currentEvent.id,
    p_reason: 'Forbidden current cancellation',
    p_expected_schedule_revision: revision,
  }, /only an eligible future event can be cancelled/i, 'Current event cancellation protection');
  await expectRpcError(admin, 'shift_batch_schedule', {
    p_course_id: courseId,
    p_selected_session_id: currentEvent.id,
    p_days: 2,
    p_expected_schedule_revision: revision,
  }, /completed, current or cancelled events cannot be shifted/i, 'Current event shift protection');
  checks.current_event_protected = await getCourseRevision() === revision;

  const { data: venueCorrection, error: venueCorrectionError } = await admin.rpc('save_batch_event', saveArgs(currentEvent, revision, {
    p_venue: 'Corrected current venue',
    p_instructions: 'Permitted non-scheduling correction',
  }));
  assertNoError(venueCorrectionError, 'Apply permitted current-event correction');
  revision = venueCorrection.scheduleRevision;
  checks.current_nonscheduling_correction = true;

  const futureInUnderwaySection = (await getSessions()).find((item) => item.section_key === 'programme'
    && item.id !== currentEvent.id && !item.cancelled_at && new Date(item.session_date) > new Date());
  assert(futureInUnderwaySection, 'Expected future event in underway Section');
  const { data: underwayEdit, error: underwayEditError } = await admin.rpc('save_batch_event', saveArgs(futureInUnderwaySection, revision, {
    p_title: `${futureInUnderwaySection.title} [underway Section edit]`,
  }));
  assertNoError(underwayEditError, 'Edit future event in underway Section');
  revision = underwayEdit.scheduleRevision;
  checks.underway_section_future_edit = true;

  const denialArgs = saveArgs(futureInUnderwaySection, revision, { p_venue: 'Unauthorized venue' });
  await expectRpcError(student, 'save_batch_event', denialArgs, /admin access required/i, 'Student mutation denial');
  await expectRpcError(anonymous, 'save_batch_event', denialArgs, /admin access required|permission denied for function/i, 'Anonymous mutation denial');
  checks.unauthorized_denied = await getCourseRevision() === revision;

  const { data: templateAfter, error: templateAfterError } = await service.from('course_templates')
    .select('id,name,current_revision_id,course_mode').eq('id', template.id).single();
  assertNoError(templateAfterError, 'Read template after mutations');
  const otherAfter = await otherBatchSnapshot();
  checks.template_unchanged = JSON.stringify(templateAfter) === templateBefore;
  checks.other_batch_unchanged = JSON.stringify(otherAfter) === JSON.stringify(otherBefore);
  checks.enrollment_preserved = await exactCount('enrollments', (query) => query.eq('course_id', courseId).eq('user_id', users[1].id)) === 1;

  console.log(JSON.stringify({
    environment,
    project: 'eyphkkginlgoaxflauog',
    checks,
    skipped,
    diagnostics,
    passed: Object.values(checks).filter(Boolean).length,
    failed: Object.values(checks).filter((value) => !value).length,
  }, null, 2));
  assert(Object.values(checks).every(Boolean), `Failed checks: ${Object.entries(checks).filter(([, value]) => !value).map(([key]) => key).join(', ')}`);
} finally {
  if (courseId) {
    await removeProbeCourse(courseId);
  }
  for (const userId of createdUserIds.reverse()) {
    await service.auth.admin.deleteUser(userId);
  }
}
