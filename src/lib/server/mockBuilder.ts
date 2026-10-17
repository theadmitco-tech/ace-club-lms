import 'server-only';
import { createMockAdminClient } from './mockQuestionBankAdmin';

export const DEFAULT_SECTIONS = [
  { section: 'quant', question_count: 21, time_limit_seconds: 2700, display_order: 1 },
  { section: 'verbal', question_count: 23, time_limit_seconds: 2700, display_order: 2 },
  { section: 'data_insights', question_count: 20, time_limit_seconds: 2700, display_order: 3 },
] as const;

export async function listMockAssessments() {
  const db = createMockAdminClient();
  const [{ data, error }, { data: assignments, error: assignmentError }] = await Promise.all([
    db.from('mock_assessments').select('id,name,purpose,status,draft_version,updated_at,mock_assessment_sections(section,question_count,time_limit_seconds,display_order),mock_assessment_versions(id,version_number,published_at)').order('updated_at', { ascending: false }),
    db.from('mock_assessment_assignments').select('id,assessment_version_id,course_id,release_at,due_at'),
  ]);
  if (error) throw error;
  if (assignmentError) throw assignmentError;
  const assignmentsByVersion = new Map<string, typeof assignments>();
  for (const assignment of assignments ?? []) {
    const existing = assignmentsByVersion.get(assignment.assessment_version_id) ?? [];
    existing.push(assignment);
    assignmentsByVersion.set(assignment.assessment_version_id, existing);
  }
  return (data ?? []).map((assessment) => ({
    ...assessment,
    mock_assessment_versions: (assessment.mock_assessment_versions ?? []).map((version) => ({
      ...version,
      mock_assessment_assignments: assignmentsByVersion.get(version.id) ?? [],
    })),
  }));
}

export async function loadMockAssessment(assessmentId: string) {
  const db = createMockAdminClient();
  const [assessment, sections, items, assignments] = await Promise.all([
    db.from('mock_assessments').select('id,name,purpose,status,draft_version,mock_assessment_versions(id,version_number,published_at)').eq('id', assessmentId).single(),
    db.from('mock_assessment_sections').select('section,question_count,time_limit_seconds,display_order').eq('assessment_id', assessmentId).order('display_order'),
    db.from('mock_assessment_items').select('section,question_revision_id,display_order,stimulus_group_key').eq('assessment_id', assessmentId).order('section').order('display_order'),
    db.from('mock_assessment_assignments').select('id,assessment_version_id,course_id,release_at,due_at,mock_assessment_versions!inner(assessment_id)').eq('mock_assessment_versions.assessment_id', assessmentId),
  ]);
  if (assessment.error) throw assessment.error; if (sections.error) throw sections.error; if (items.error) throw items.error; if (assignments.error) throw assignments.error;
  const byVersion = new Map<string, typeof assignments.data>();
  for (const assignment of assignments.data ?? []) {
    const rows = byVersion.get(assignment.assessment_version_id) ?? [];
    rows.push(assignment);
    byVersion.set(assignment.assessment_version_id, rows);
  }
  return { assessment: { ...assessment.data, mock_assessment_versions: (assessment.data.mock_assessment_versions ?? []).map((version) => ({ ...version, mock_assessment_assignments: byVersion.get(version.id) ?? [] })) }, sections: sections.data ?? [], items: items.data ?? [] };
}

export async function loadMockBuilderReference() {
  const db = createMockAdminClient();
  const [questions, courses] = await Promise.all([
    db.from('mock_question_revisions').select('id,section,question_type,difficulty,content_json:stem_json,stimulus_revision_id,mock_questions!mock_question_revisions_question_id_fkey!inner(source_external_id,mock_source_namespaces!inner(code))').eq('status', 'published').order('created_at', { ascending: false }),
    db.from('courses').select('id,name,is_active').eq('is_active', true).order('name'),
  ]);
  if (questions.error) throw questions.error; if (courses.error) throw courses.error;
  return { questions: questions.data ?? [], courses: courses.data ?? [] };
}

export async function createMockAssessment(userId: string, name: string, purpose: 'standard' | 'diagnostic') {
  if (name.length < 1 || name.length > 160) throw new Error('Mock name must be between 1 and 160 characters.');
  const db = createMockAdminClient();
  const { data, error } = await db.from('mock_assessments').insert({ name, purpose, created_by: userId }).select('id').single();
  if (error) throw error;
  const { error: sectionError } = await db.from('mock_assessment_sections').insert(DEFAULT_SECTIONS.map((section) => ({ ...section, assessment_id: data.id })));
  if (sectionError) throw sectionError;
  await db.from('mock_assessment_audit').insert({ assessment_id: data.id, action: 'created', actor_id: userId });
  return data.id as string;
}

export async function saveMockItems(assessmentId: string, items: Array<{ section: string; question_revision_id: string; display_order: number; stimulus_group_key?: string | null }>, userId: string) {
  const db = createMockAdminClient();
  const ids = items.map((item) => item.question_revision_id);
  if (new Set(ids).size !== ids.length) throw new Error('A question revision may only appear once in a mock.');
  if (items.some((item) => !['quant', 'verbal', 'data_insights'].includes(item.section) || !Number.isInteger(item.display_order) || item.display_order < 1)) throw new Error('Invalid section or question order.');
  if (ids.length) {
    const { data: revisions, error: revisionError } = await db.from('mock_question_revisions').select('id,section,status').in('id', ids);
    if (revisionError) throw revisionError;
    const byId = new Map((revisions ?? []).map((revision) => [revision.id, revision]));
    for (const item of items) { const revision = byId.get(item.question_revision_id); if (!revision || revision.status !== 'published') throw new Error('Only Published question revisions may be added.'); if (revision.section !== item.section) throw new Error('Question section does not match its composition section.'); }
  }
  const { error: deleteError } = await db.from('mock_assessment_items').delete().eq('assessment_id', assessmentId);
  if (deleteError) throw deleteError;
  if (items.length) { const { error } = await db.from('mock_assessment_items').insert(items.map((item) => ({ ...item, assessment_id: assessmentId }))); if (error) throw error; }
  const { data: current, error: currentError } = await db.from('mock_assessments').select('draft_version,status').eq('id', assessmentId).single();
  if (currentError) throw currentError;
  await db.from('mock_assessments').update({ updated_at: new Date().toISOString(), status: 'draft', draft_version: current.status === 'published' ? current.draft_version + 1 : current.draft_version }).eq('id', assessmentId);
  await db.from('mock_assessment_audit').insert({ assessment_id: assessmentId, action: 'updated', actor_id: userId, details: { itemCount: items.length } });
}

export async function validateMock(assessmentId: string) {
  const db = createMockAdminClient();
  const [{ data: assessment, error: ae }, { data: sections, error: se }, { data: items, error: ie }] = await Promise.all([
    db.from('mock_assessments').select('id,name,purpose,status').eq('id', assessmentId).single(),
    db.from('mock_assessment_sections').select('section,question_count,time_limit_seconds,display_order').eq('assessment_id', assessmentId).order('display_order'),
    db.from('mock_assessment_items').select('id,section,display_order,stimulus_group_key,question_revision_id,mock_question_revisions!inner(status,section,stimulus_revision_id)').eq('assessment_id', assessmentId).order('section').order('display_order'),
  ]);
  if (ae || se || ie) throw ae ?? se ?? ie;
  const errors: string[] = [];
  for (const expected of DEFAULT_SECTIONS) {
    const section = (sections ?? []).find((row) => row.section === expected.section);
    const selected = (items ?? []).filter((row) => row.section === expected.section);
    if (!section) errors.push(`Missing ${expected.section} section.`);
    else { if (section.question_count !== selected.length) errors.push(`${expected.section} requires ${section.question_count} questions; ${selected.length} selected.`); if (section.time_limit_seconds !== 2700) errors.push(`${expected.section} must be timed for 45 minutes.`); }
    for (let index = 1; index < selected.length; index += 1) if (selected[index].stimulus_group_key && selected[index].stimulus_group_key === selected[index - 1].stimulus_group_key && selected[index].display_order !== selected[index - 1].display_order + 1) errors.push(`${expected.section} stimulus group is split.`);
  }
  if ((items ?? []).some((row) => (row.mock_question_revisions as unknown as { status: string } | null)?.status !== 'published')) errors.push('Only Published question revisions can be included.');
  return { valid: errors.length === 0, errors, assessment, sections: sections ?? [], items: items ?? [] };
}

export async function publishMock(assessmentId: string, userId: string) {
  const db = createMockAdminClient(); const result = await validateMock(assessmentId); if (!result.valid) throw new Error(result.errors.join(' '));
  const { data: prior } = await db.from('mock_assessment_versions').select('version_number').eq('assessment_id', assessmentId).order('version_number', { ascending: false }).limit(1).maybeSingle();
  const versionNumber = (prior?.version_number ?? 0) + 1;
  const { data, error } = await db.from('mock_assessment_versions').insert({ assessment_id: assessmentId, version_number: versionNumber, snapshot: { assessment: result.assessment, sections: result.sections, items: result.items }, published_by: userId }).select('id,version_number,published_at').single();
  if (error) throw error;
  await db.from('mock_assessments').update({ status: 'published', updated_at: new Date().toISOString() }).eq('id', assessmentId);
  await db.from('mock_assessment_audit').insert({ assessment_id: assessmentId, version_id: data.id, action: 'published', actor_id: userId, details: { versionNumber } });
  return data;
}

export async function assignMock(versionId: string, courseId: string, releaseAt: string, dueAt: string | null, userId: string) {
  const db = createMockAdminClient(); const { data, error } = await db.from('mock_assessment_assignments').insert({ assessment_version_id: versionId, course_id: courseId, release_at: releaseAt, due_at: dueAt, created_by: userId }).select('id').single();
  if (error) throw error; await db.from('mock_assessment_audit').insert({ version_id: versionId, assignment_id: data.id, action: 'assigned', actor_id: userId, details: { releaseAt, dueAt } }); return data.id as string;
}

export async function assignLatestMock(assessmentId: string, courseId: string, releaseAt: string, dueAt: string | null, userId: string) {
  const db = createMockAdminClient();
  const { data: version, error } = await db.from('mock_assessment_versions').select('id').eq('assessment_id', assessmentId).order('version_number', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  if (!version) throw new Error('The mock has no published version yet.');
  return assignMock(version.id, courseId, releaseAt, dueAt, userId);
}

export async function listMockAssignmentTesters(assignmentId: string) {
  const db = createMockAdminClient();
  const { data: grants, error } = await db.from('mock_assignment_testers')
    .select('user_id,granted_at,revoked_at').eq('assignment_id', assignmentId).order('granted_at');
  if (error) throw error;
  const userIds = (grants ?? []).map((grant) => grant.user_id);
  const { data: profiles, error: profileError } = userIds.length
    ? await db.from('profiles').select('id,full_name,email,role,is_active').in('id', userIds)
    : { data: [], error: null };
  if (profileError) throw profileError;
  const byId = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  return (grants ?? []).map((grant) => ({ ...grant, profile: byId.get(grant.user_id) ?? null }));
}

export async function grantMockAssignmentTester(assignmentId: string, rawEmail: string, actorId: string) {
  const email = rawEmail.trim().toLowerCase();
  if (!email || email.length > 254) throw new Error('Enter the tester’s exact account email.');
  const db = createMockAdminClient();
  const [{ data: profile, error: profileError }, { data: assignment, error: assignmentError }] = await Promise.all([
    db.from('profiles').select('id,full_name,email,role,is_active').eq('email', email).maybeSingle(),
    db.from('mock_assessment_assignments').select('id,assessment_version_id').eq('id', assignmentId).single(),
  ]);
  if (profileError || assignmentError) throw profileError ?? assignmentError;
  if (!profile || !profile.is_active) throw new Error('No active profile matches that exact email.');
  if (profile.role !== 'admin' && profile.role !== 'student') throw new Error('That profile cannot receive mock tester access.');
  const { error } = await db.from('mock_assignment_testers').upsert({ assignment_id: assignmentId, user_id: profile.id, granted_by: actorId, granted_at: new Date().toISOString(), revoked_by: null, revoked_at: null }, { onConflict: 'assignment_id,user_id' });
  if (error) throw error;
  await db.from('mock_assessment_audit').insert({ version_id: assignment.assessment_version_id, assignment_id: assignmentId, action: 'tester_granted', actor_id: actorId, details: { testerUserId: profile.id, testerEmail: profile.email } });
  return profile;
}

export async function revokeMockAssignmentTester(assignmentId: string, userId: string, actorId: string) {
  const db = createMockAdminClient();
  const { data: assignment, error: assignmentError } = await db.from('mock_assessment_assignments').select('assessment_version_id').eq('id', assignmentId).single();
  if (assignmentError) throw assignmentError;
  const { error } = await db.from('mock_assignment_testers').update({ revoked_by: actorId, revoked_at: new Date().toISOString() }).eq('assignment_id', assignmentId).eq('user_id', userId).is('revoked_at', null);
  if (error) throw error;
  await db.from('mock_assessment_audit').insert({ version_id: assignment.assessment_version_id, assignment_id: assignmentId, action: 'tester_revoked', actor_id: actorId, details: { testerUserId: userId } });
}
