import 'server-only';
import { createHash } from 'node:crypto';
import { createMockAdminClient } from './mockQuestionBankAdmin';
import type { MockSection } from '@/lib/mockAttempt';

export type MockAttemptItem = {
  id: string;
  display_order: number;
  section: MockSection;
  bookmarked: boolean;
  time_spent_ms: number;
  question_snapshot: { question_type?: string; stem?: unknown; media?: AttemptMedia[] };
  stimulus_snapshot: { kind?: string; title?: string; content?: unknown; config?: unknown; media?: AttemptMedia[] } | null;
  response_config_snapshot: { response_type?: string; interaction?: unknown; options?: Array<{ response_slot_id: string; option_id: string; display_order: number; content: unknown }> };
  mock_responses: Array<{ response: unknown; response_version: number; answered_at: string | null }>;
};

export type AttemptMedia = { id: string; source_external_id: string; alt_text: string; usage: string };

export function mutationHash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export async function listStudentMocks(studentId: string) {
  const db = createMockAdminClient();
  const [{ data: enrollments, error: enrollmentError }, { data: profile, error: profileError }] = await Promise.all([
    db.from('enrollments').select('course_id').eq('user_id', studentId),
    db.from('profiles').select('full_name').eq('id', studentId).single(),
  ]);
  if (enrollmentError) throw enrollmentError;
  if (profileError) throw profileError;
  const courseIds = (enrollments ?? []).map((row) => row.course_id);
  if (!courseIds.length) return { studentName: profile.full_name ?? 'Student', mocks: [] };
  const { data: assignments, error } = await db.from('mock_assessment_assignments')
    .select('id,release_at,due_at,course_id,mock_assessment_versions!inner(id,version_number,mock_assessments!inner(name,purpose))')
    .in('course_id', courseIds).lte('release_at', new Date().toISOString()).order('release_at', { ascending: false });
  if (error) throw error;
  const assignmentIds = (assignments ?? []).map((row) => row.id);
  const { data: attempts, error: attemptError } = assignmentIds.length
    ? await db.from('mock_attempts').select('id,assignment_id,status,current_section_index,updated_at').eq('student_id', studentId).in('assignment_id', assignmentIds)
    : { data: [], error: null };
  if (attemptError) throw attemptError;
  const byAssignment = new Map((attempts ?? []).map((attempt) => [attempt.assignment_id, attempt]));
  return { studentName: profile.full_name ?? 'Student', mocks: (assignments ?? []).map((assignment) => ({ ...assignment, attempt: byAssignment.get(assignment.id) ?? null })) };
}

export async function loadAttemptState(studentId: string, attemptId: string) {
  const db = createMockAdminClient();
  const { data: attempt, error } = await db.from('mock_attempts')
    .select('id,assignment_id,status,section_order,current_section_index,current_item_id,break_status,break_deadline_at,lock_version,started_at,completed_at,mock_attempt_sections(id,section,sequence_index,status,time_limit_seconds,started_at,deadline_at,submitted_at,review_edit_count)')
    .eq('id', attemptId).eq('student_id', studentId).single();
  if (error) throw error;
  const activeSection = (attempt.mock_attempt_sections ?? []).find((section) => section.sequence_index === attempt.current_section_index) ?? null;
  const { data: items, error: itemError } = activeSection
    ? await db.from('mock_attempt_items').select('id,display_order,section,bookmarked,time_spent_ms,question_snapshot,stimulus_snapshot,response_config_snapshot,mock_responses(response,response_version,answered_at)').eq('attempt_section_id', activeSection.id).order('display_order')
    : { data: [], error: null };
  if (itemError) throw itemError;
  return { attempt, activeSection, items: (items ?? []) as unknown as MockAttemptItem[], serverNow: new Date().toISOString() };
}
