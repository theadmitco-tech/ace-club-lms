import 'server-only';
import { createClient } from '@/utils/supabase/server';
import { isV2MeetingBatchId } from '@/lib/v2Meetings';

export type V2ScheduledClass = { key: string; title: string; section: string; startsAt: string; endsAt: string; completedAt: string | null };

const isClass = (value: unknown): value is V2ScheduledClass => {
  const item = value as Record<string, unknown> | null;
  return !!item && typeof item.key === 'string' && typeof item.title === 'string' && typeof item.section === 'string'
    && typeof item.startsAt === 'string' && typeof item.endsAt === 'string' && (item.completedAt === null || typeof item.completedAt === 'string');
};

/** Live class dates for an enrolled student with active access, with or without a live seat. No join details. */
export async function getMyV2LiveSchedule(batchId: string): Promise<V2ScheduledClass[] | null> {
  if (!isV2MeetingBatchId(batchId)) return null;
  try {
    const client = await createClient();
    const { data, error } = await client.rpc('get_my_v2_live_schedule', { p_batch_id: batchId });
    return error || !Array.isArray(data) || !data.every(isClass) ? null : data;
  } catch { return null; }
}
