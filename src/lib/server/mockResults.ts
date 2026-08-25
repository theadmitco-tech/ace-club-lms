import 'server-only';
import { SECTION_LABELS, type MockSection } from '@/lib/mockAttempt';
import { answerMap, buildMockResultSummary, resultOutcome, type MockResultItemInput } from '@/lib/mockResults';
import { createMockAdminClient } from './mockQuestionBankAdmin';

type OptionSnapshot = { response_slot_id: string; option_id: string; display_order: number; content: unknown };
type AttemptItemRow = {
  id: string;
  question_revision_id: string;
  section: MockSection;
  display_order: number;
  time_spent_ms: number;
  bookmarked: boolean;
  question_snapshot: { question_type?: string; stem?: unknown; topic?: string; subtopic?: string | null; media?: unknown[] };
  stimulus_snapshot: { kind?: string; title?: string; content?: unknown; config?: unknown; media?: unknown[] } | null;
  response_config_snapshot: { response_type?: string; interaction?: unknown; options?: OptionSnapshot[] };
  mock_responses: Array<{ response: unknown }>;
};

export type MockResultItem = AttemptItemRow & {
  selected_answer: Record<string, string>;
  correct_answer: Record<string, string>;
  outcome: 'correct' | 'incorrect' | 'unanswered';
  topic: string;
  subtopic: string | null;
  note: string;
};

function relationOne<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export async function loadMockResult(attemptId: string, access: { studentId?: string; admin?: boolean }) {
  const db = createMockAdminClient();
  let attemptQuery = db.from('mock_attempts').select('id,assignment_id,student_id,status,started_at,completed_at,assessment_version_id').eq('id', attemptId);
  if (access.studentId) attemptQuery = attemptQuery.eq('student_id', access.studentId);
  const { data: attempt, error: attemptError } = await attemptQuery.single();
  if (attemptError || !attempt || (!access.admin && attempt.student_id !== access.studentId)) throw new Error('RESULT_NOT_FOUND');
  if (attempt.status !== 'completed') throw new Error('RESULT_UNAVAILABLE');

  const [{ data: assignment, error: assignmentError }, { data: student, error: studentError }, { data: sections, error: sectionError }, { data: itemRows, error: itemError }] = await Promise.all([
    db.from('mock_assessment_assignments').select('id,course_id,mock_assessment_versions!inner(version_number,mock_assessments!inner(name,purpose))').eq('id', attempt.assignment_id).single(),
    db.from('profiles').select('id,full_name,email').eq('id', attempt.student_id).single(),
    db.from('mock_attempt_sections').select('id,section,sequence_index,status,started_at,submitted_at,time_limit_seconds').eq('attempt_id', attempt.id).order('sequence_index'),
    db.from('mock_attempt_items').select('id,question_revision_id,section,display_order,time_spent_ms,bookmarked,question_snapshot,stimulus_snapshot,response_config_snapshot,mock_responses(response)').eq('attempt_id', attempt.id).order('section').order('display_order'),
  ]);
  if (assignmentError || studentError || sectionError || itemError) throw assignmentError ?? studentError ?? sectionError ?? itemError;

  const items = (itemRows ?? []) as unknown as AttemptItemRow[];
  const itemIds = items.map((item) => item.id);
  const revisionIds = items.map((item) => item.question_revision_id);
  const [{ data: keys, error: keyError }, { data: notes, error: noteError }, { data: revisions, error: revisionError }] = await Promise.all([
    itemIds.length ? db.rpc('get_completed_mock_attempt_keys', { p_attempt_id: attempt.id }) : { data: [], error: null },
    itemIds.length ? db.from('mock_attempt_item_notes').select('attempt_item_id,note').eq('attempt_id', attempt.id).in('attempt_item_id', itemIds) : { data: [], error: null },
    revisionIds.length ? db.from('mock_question_revisions').select('id,topic_id,subtopic_id').in('id', revisionIds) : { data: [], error: null },
  ]);
  if (keyError || noteError || revisionError) throw keyError ?? noteError ?? revisionError;
  const topicIds = [...new Set((revisions ?? []).flatMap((revision) => [revision.topic_id, revision.subtopic_id].filter(Boolean) as string[]))];
  const { data: topics, error: topicError } = topicIds.length ? await db.from('mock_topics').select('id,label').in('id', topicIds) : { data: [], error: null };
  if (topicError) throw topicError;

  const keyByItem = new Map((keys ?? []).map((key: { attempt_item_id: string; answer_json: unknown }) => [key.attempt_item_id, key.answer_json]));
  const noteByItem = new Map((notes ?? []).map((note) => [note.attempt_item_id, note.note]));
  const revisionById = new Map((revisions ?? []).map((revision) => [revision.id, revision]));
  const topicById = new Map((topics ?? []).map((topic) => [topic.id, topic.label]));
  const sectionSequence = new Map((sections ?? []).map((section) => [section.section, section.sequence_index]));
  const resultItems: MockResultItem[] = items.map((item) => {
    const revision = revisionById.get(item.question_revision_id);
    const selected = answerMap(item.mock_responses[0]?.response);
    const correct = answerMap(keyByItem.get(item.id));
    return {
      ...item,
      selected_answer: selected,
      correct_answer: correct,
      outcome: resultOutcome(selected, correct),
      topic: item.question_snapshot.topic ?? topicById.get(revision?.topic_id ?? '') ?? 'Uncategorized',
      subtopic: item.question_snapshot.subtopic ?? topicById.get(revision?.subtopic_id ?? '') ?? null,
      note: noteByItem.get(item.id) ?? '',
    };
  }).sort((left, right) => (sectionSequence.get(left.section) ?? 0) - (sectionSequence.get(right.section) ?? 0) || left.display_order - right.display_order);
  const input: MockResultItemInput[] = resultItems.map((item) => ({ id: item.id, section: item.section, timeSpentMs: item.time_spent_ms, selectedAnswer: item.selected_answer, correctAnswer: item.correct_answer, topic: item.topic, subtopic: item.subtopic }));
  const version = relationOne(assignment.mock_assessment_versions);
  const assessment = relationOne(version?.mock_assessments);
  return {
    attempt: { ...attempt, mock_name: assessment?.name ?? 'Mock assessment', purpose: assessment?.purpose ?? 'standard', version_number: version?.version_number ?? 1 },
    student,
    sections: (sections ?? []).map((section) => ({ ...section, label: SECTION_LABELS[section.section as MockSection], time_spent_ms: resultItems.filter((item) => item.section === section.section).reduce((sum, item) => sum + item.time_spent_ms, 0) })),
    items: resultItems,
    summary: buildMockResultSummary(input),
  };
}

export async function listAdminMockReporting() {
  const db = createMockAdminClient();
  const { data: assignments, error } = await db.from('mock_assessment_assignments')
    .select('id,course_id,release_at,due_at,courses(name),mock_assessment_versions!inner(version_number,mock_assessments!inner(name,purpose))')
    .order('release_at', { ascending: false });
  if (error) throw error;
  const courseIds = [...new Set((assignments ?? []).map((assignment) => assignment.course_id))];
  const assignmentIds = (assignments ?? []).map((assignment) => assignment.id);
  const [{ data: enrollments, error: enrollmentError }, { data: attempts, error: attemptError }, { data: testerGrants, error: testerError }] = await Promise.all([
    courseIds.length ? db.from('enrollments').select('course_id,user_id,profiles!inner(full_name,email,is_active)').in('course_id', courseIds) : { data: [], error: null },
    assignmentIds.length ? db.from('mock_attempts').select('id,assignment_id,student_id,status,started_at,completed_at').in('assignment_id', assignmentIds) : { data: [], error: null },
    assignmentIds.length ? db.from('mock_assignment_testers').select('assignment_id,user_id,granted_at,revoked_at').in('assignment_id', assignmentIds).is('revoked_at', null) : { data: [], error: null },
  ]);
  if (enrollmentError || attemptError || testerError) throw enrollmentError ?? attemptError ?? testerError;
  const testerUserIds = [...new Set((testerGrants ?? []).map((grant) => grant.user_id))];
  const { data: testerProfiles, error: testerProfileError } = testerUserIds.length
    ? await db.from('profiles').select('id,full_name,email,is_active,role').in('id', testerUserIds)
    : { data: [], error: null };
  if (testerProfileError) throw testerProfileError;
  const testerProfileById = new Map((testerProfiles ?? []).map((profile) => [profile.id, profile]));
  const attemptByAssignmentStudent = new Map((attempts ?? []).map((attempt) => [`${attempt.assignment_id}:${attempt.student_id}`, attempt]));
  return (assignments ?? []).map((assignment) => {
    const version = relationOne(assignment.mock_assessment_versions);
    const assessment = relationOne(version?.mock_assessments);
    const course = relationOne(assignment.courses);
    const students = (enrollments ?? []).filter((enrollment) => enrollment.course_id === assignment.course_id).map((enrollment) => {
      const profile = relationOne(enrollment.profiles);
      const attempt = attemptByAssignmentStudent.get(`${assignment.id}:${enrollment.user_id}`) ?? null;
      return { id: enrollment.user_id, full_name: profile?.full_name ?? 'Student', email: profile?.email ?? '', is_active: profile?.is_active ?? false, status: attempt?.status === 'completed' ? 'Completed' : attempt ? 'In Progress' : 'Not Started', attempt };
    });
    const testers = (testerGrants ?? []).filter((grant) => grant.assignment_id === assignment.id).map((grant) => {
      const profile = testerProfileById.get(grant.user_id);
      const attempt = attemptByAssignmentStudent.get(`${assignment.id}:${grant.user_id}`) ?? null;
      return { id: grant.user_id, full_name: profile?.full_name ?? 'Tester', email: profile?.email ?? '', role: profile?.role ?? 'student', is_active: profile?.is_active ?? false, status: attempt?.status === 'completed' ? 'Completed' : attempt ? 'In Progress' : 'Not Started', attempt };
    });
    return { ...assignment, course_name: course?.name ?? 'Batch', mock_name: assessment?.name ?? 'Mock assessment', purpose: assessment?.purpose ?? 'standard', version_number: version?.version_number ?? 1, students, testers };
  });
}
