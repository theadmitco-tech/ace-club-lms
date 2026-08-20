import 'server-only';

import type { BatchProposalInput } from '@/lib/batchSchedule';
import { validateBatchProposalInput } from '@/lib/batchSchedule';
import { createClient } from '@/utils/supabase/server';

export type ConfirmBatchResult = {
  courseId: string;
  scheduleRevision: number;
  sessions?: number;
  materials?: number;
  replayed: boolean;
};

export async function confirmTemplateBatch(raw: BatchProposalInput) {
  const input = validateBatchProposalInput(raw);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('confirm_template_batch_v2', {
    p_name: input.name,
    p_template_id: input.templateId,
    p_expected_revision_id: input.expectedRevisionId,
    p_start_date: input.startDate,
    p_publication_state: input.publicationState,
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) throw new Error(error.message);
  return data as ConfirmBatchResult;
}

export async function shiftBatchSchedule(courseId: string, sessionId: string, days: number, expectedRevision: number) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('shift_batch_schedule', {
    p_course_id: courseId,
    p_selected_session_id: sessionId,
    p_days: days,
    p_expected_schedule_revision: expectedRevision,
  });
  if (error) throw new Error(error.message);
  return data as { scheduleRevision: number; events: Array<{ id: string; title: string; before: string; after: string }> };
}

export async function cancelBatchEvent(courseId: string, sessionId: string, reason: string, expectedRevision: number) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('cancel_batch_event', {
    p_course_id: courseId,
    p_session_id: sessionId,
    p_reason: reason,
    p_expected_schedule_revision: expectedRevision,
  });
  if (error) throw new Error(error.message);
  return data as { scheduleRevision: number; sessionId: string };
}

export async function reorderBatchEvents(courseId: string, sessionIds: string[], expectedRevision: number) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('reorder_batch_events', {
    p_course_id: courseId,
    p_ordered_session_ids: sessionIds,
    p_expected_schedule_revision: expectedRevision,
  });
  if (error) throw new Error(error.message);
  return data as { scheduleRevision: number; events: number };
}

export type SaveBatchEventInput = {
  courseId: string; sessionId: string | null; expectedRevision: number; title: string;
  eventType: string; sectionKey: string; startsAt: string; durationMinutes: number;
  instructor: string; venue: string; reportingTime: string; instructions: string; isPublished: boolean;
};

export async function saveBatchEvent(input: SaveBatchEventInput) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('save_batch_event', {
    p_course_id: input.courseId, p_session_id: input.sessionId,
    p_expected_schedule_revision: input.expectedRevision, p_title: input.title,
    p_event_type: input.eventType, p_section_key: input.sectionKey, p_starts_at: input.startsAt,
    p_duration_minutes: input.durationMinutes, p_instructor: input.instructor, p_venue: input.venue,
    p_reporting_time: input.reportingTime || null, p_instructions: input.instructions,
    p_is_published: input.isPublished,
  });
  if (error) throw new Error(error.message);
  return data as { scheduleRevision: number; sessionId: string };
}
