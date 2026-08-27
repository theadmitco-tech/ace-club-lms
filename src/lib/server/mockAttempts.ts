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

export type AttemptMedia = { id: string; source_external_id: string; alt_text: string; usage: string; width?: number; height?: number; url?: string };

export function mutationHash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

async function hydrateAttemptMedia(db: ReturnType<typeof createMockAdminClient>, items: MockAttemptItem[]) {
  const mediaIds = [...new Set(items.flatMap((item) => [
    ...(item.question_snapshot.media ?? []),
    ...(item.stimulus_snapshot?.media ?? []),
  ].map((media) => media.id)))];
  if (!mediaIds.length) return items;

  const { data: mediaRows, error: mediaError } = await db.from('mock_media')
    .select('id,storage_path,width_px,height_px,status').in('id', mediaIds).eq('status', 'ready');
  if (mediaError || !mediaRows?.length) return items;
  const { data: signedRows, error: signedError } = await db.storage.from('mock-media')
    .createSignedUrls(mediaRows.map((media) => media.storage_path), 3600);
  if (signedError) return items;

  const signedByPath = new Map((signedRows ?? []).map((signed) => [signed.path, signed.signedUrl]));
  const metadata = new Map(mediaRows.map((media) => [media.id, {
    width: media.width_px,
    height: media.height_px,
    url: signedByPath.get(media.storage_path),
  }]));
  const hydrate = (media: AttemptMedia[] = []) => media.map((asset) => ({ ...asset, ...metadata.get(asset.id) }));
  return items.map((item) => ({
    ...item,
    question_snapshot: { ...item.question_snapshot, media: hydrate(item.question_snapshot.media) },
    stimulus_snapshot: item.stimulus_snapshot
      ? { ...item.stimulus_snapshot, media: hydrate(item.stimulus_snapshot.media) }
      : null,
  }));
}

export async function listParticipantMocks(userId: string) {
  const db = createMockAdminClient();
  const [{ data: enrollments, error: enrollmentError }, { data: profile, error: profileError }, { data: grants, error: grantError }] = await Promise.all([
    db.from('enrollments').select('course_id').eq('user_id', userId),
    db.from('profiles').select('full_name,role').eq('id', userId).single(),
    db.from('mock_assignment_testers').select('assignment_id').eq('user_id', userId).is('revoked_at', null),
  ]);
  if (enrollmentError) throw enrollmentError;
  if (profileError) throw profileError;
  if (grantError) throw grantError;
  const courseIds = (enrollments ?? []).map((row) => row.course_id);
  const testerAssignmentIds = (grants ?? []).map((row) => row.assignment_id);
  const selection = 'id,release_at,due_at,course_id,mock_assessment_versions!inner(id,version_number,mock_assessments!inner(name,purpose))';
  const [{ data: released, error: releasedError }, { data: testerAssignments, error: testerError }] = await Promise.all([
    profile.role === 'student' && courseIds.length
      ? db.from('mock_assessment_assignments').select(selection).in('course_id', courseIds).lte('release_at', new Date().toISOString()).order('release_at', { ascending: false })
      : { data: [], error: null },
    testerAssignmentIds.length
      ? db.from('mock_assessment_assignments').select(selection).in('id', testerAssignmentIds).order('release_at', { ascending: false })
      : { data: [], error: null },
  ]);
  if (releasedError || testerError) throw releasedError ?? testerError;
  const testerSet = new Set(testerAssignmentIds);
  const assignmentMap = new Map<string, Record<string, unknown>>();
  for (const assignment of [...(released ?? []), ...(testerAssignments ?? [])]) assignmentMap.set(assignment.id, assignment);
  const assignments = [...assignmentMap.values()];
  const assignmentIds = (assignments ?? []).map((row) => row.id);
  const { data: attempts, error: attemptError } = assignmentIds.length
    ? await db.from('mock_attempts').select('id,assignment_id,status,current_section_index,updated_at').eq('student_id', userId).in('assignment_id', assignmentIds)
    : { data: [], error: null };
  if (attemptError) throw attemptError;
  const byAssignment = new Map((attempts ?? []).map((attempt) => [attempt.assignment_id, attempt]));
  return { participantName: profile.full_name ?? 'Tester', role: profile.role, mocks: assignments.map((assignment) => ({ ...assignment, tester_access: testerSet.has(assignment.id as string), attempt: byAssignment.get(assignment.id as string) ?? null })) };
}

export async function loadAttemptState(studentId: string, attemptId: string) {
  const db = createMockAdminClient();
  const { data: attempt, error } = await db.from('mock_attempts')
    .select('id,assignment_id,status,section_order,current_section_index,current_item_id,break_status,break_deadline_at,lock_version,started_at,completed_at,mock_attempt_sections(id,section,sequence_index,status,time_limit_seconds,started_at,deadline_at,submitted_at,review_edit_count)')
    .eq('id', attemptId).eq('student_id', studentId).single();
  if (error) throw error;
  const activeSection = (attempt.mock_attempt_sections ?? []).find((section) => section.sequence_index === attempt.current_section_index) ?? null;
  const [{ data: items, error: itemError }, { data: reviewEdits, error: reviewEditError }] = activeSection
    ? await Promise.all([
      db.from('mock_attempt_items').select('id,display_order,section,bookmarked,time_spent_ms,question_snapshot,stimulus_snapshot,response_config_snapshot,mock_responses(response,response_version,answered_at)').eq('attempt_section_id', activeSection.id).order('display_order'),
      db.from('mock_review_edits').select('attempt_item_id').eq('attempt_section_id', activeSection.id),
    ])
    : [{ data: [], error: null }, { data: [], error: null }];
  if (itemError) throw itemError;
  if (reviewEditError) throw reviewEditError;
  const hydratedItems = await hydrateAttemptMedia(db, (items ?? []) as unknown as MockAttemptItem[]);
  return { attempt, activeSection, items: hydratedItems, reviewEditedItemIds: (reviewEdits ?? []).map((entry) => entry.attempt_item_id), serverNow: new Date().toISOString() };
}
