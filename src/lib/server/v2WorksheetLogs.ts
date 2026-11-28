import 'server-only';
import { createClient } from '@/utils/supabase/server';
import { isV2MeetingBatchId } from '@/lib/v2Meetings';
import type { StudentQuestionLog } from '@/lib/studentPractice';

export type V2WorksheetLog = { title: string; sessionTitle: string; section: string | null; url: string; questions: StudentQuestionLog[] };

const isQuestion = (value: unknown): value is StudentQuestionLog => {
  const q = value as Record<string, unknown> | null;
  return !!q && typeof q.id === 'string' && Number.isSafeInteger(q.question_number) && [null, 'done', 'review'].includes(q.status as string | null)
    && (q.time_taken_seconds === null || typeof q.time_taken_seconds === 'number') && (q.comment === null || typeof q.comment === 'string')
    && (q.updated_at === null || typeof q.updated_at === 'string');
};

/** The caller's practice log for one V2 worksheet they can open; null when unavailable to them. */
export async function getMyV2WorksheetLog(batchId: string, sessionKey: string, itemKey: string): Promise<V2WorksheetLog | null> {
  if (![batchId, sessionKey, itemKey].every(isV2MeetingBatchId)) return null;
  try {
    const client = await createClient();
    const { data, error } = await client.rpc('get_my_v2_worksheet_log', { p_batch_id: batchId, p_session_key: sessionKey, p_item_key: itemKey });
    const log = data as { title?: unknown; sessionTitle?: unknown; section?: unknown; url?: unknown; questions?: unknown } | null;
    if (error || !log || typeof log.title !== 'string' || typeof log.url !== 'string' || !Array.isArray(log.questions) || !log.questions.every(isQuestion)) return null;
    return { title: log.title, sessionTitle: typeof log.sessionTitle === 'string' ? log.sessionTitle : '', section: typeof log.section === 'string' ? log.section : null, url: log.url, questions: log.questions };
  } catch { return null; }
}
