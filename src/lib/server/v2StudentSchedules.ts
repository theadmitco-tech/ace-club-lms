import 'server-only';
import { getPortalIdentity } from '@/lib/server/portalAuthorization';
import { isV2StudentScheduleEnabled } from '@/lib/server/v2StudentScheduleFeature';
import { createClient } from '@/utils/supabase/server';
import { isV2Publication, type V2Publication } from '@/lib/v2Publications';

export async function getMyV2BatchSchedules(): Promise<{ status: 'ready'; schedules: V2Publication[] } | { status: 'unavailable'; schedules: [] }> {
  try {
    if (!isV2StudentScheduleEnabled() || (await getPortalIdentity())?.role !== 'student') return { status: 'unavailable', schedules: [] };
    // Session client only. The database derives identity and rechecks enrollment,
    // entitlement and publication on every request; no cross-request cache.
    const client = await createClient();
    const { data, error } = await client.rpc('get_my_v2_batch_schedules');
    if (!error && Array.isArray(data) && data.every((row) => isV2Publication(row) && row.state === 'published')
      && new Set(data.map((row) => row.batchId)).size === data.length) return { status: 'ready', schedules: data };
  } catch { /* Fail closed without exposing provider details. */ }
  return { status: 'unavailable', schedules: [] };
}
