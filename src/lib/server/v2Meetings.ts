import 'server-only';

import { getPortalIdentity } from '@/lib/server/portalAuthorization';
import { isV2BatchAuthoringEnabled } from '@/lib/server/v2BatchFeature';
import { createClient } from '@/utils/supabase/server';
import { isV2MeetingBatchId, isV2MeetingDraft, isV2MeetingReceipt, validateV2MeetingInput,
  type V2MeetingDraft, type V2MeetingInput, type V2MeetingSaveResult } from '@/lib/v2Meetings';

type ReadResult = { status: 'ready'; draft: V2MeetingDraft } | { status: 'disabled' | 'forbidden' | 'unavailable' };
const failure = 'Meeting details could not be saved. Retry the same submission or reload the current draft.';

export async function readV2MeetingDraft(batchId: unknown): Promise<ReadResult> {
  if (!isV2BatchAuthoringEnabled()) return { status: 'disabled' };
  try {
    if ((await getPortalIdentity())?.role !== 'admin') return { status: 'forbidden' };
    if (!isV2MeetingBatchId(batchId)) return { status: 'unavailable' };
    const client = await createClient();
    const { data, error } = await client.rpc('read_v2_meeting_draft', { p_batch_id: batchId });
    if (error || !isV2MeetingDraft(data) || data.batch.id !== batchId) return { status: 'unavailable' };
    return { status: 'ready', draft: data };
  } catch {
    return { status: 'unavailable' };
  }
}

export async function saveV2MeetingDraft(value: unknown): Promise<V2MeetingSaveResult> {
  if (!isV2BatchAuthoringEnabled()) return { status: 'error', message: 'Meeting draft authoring is unavailable.' };
  try {
    if ((await getPortalIdentity())?.role !== 'admin') return { status: 'error', message: 'Active Admin access is required.' };
    const invalid = validateV2MeetingInput(value);
    if (invalid) return { status: 'error', message: invalid };
    const input = value as V2MeetingInput;
    const client = await createClient();
    const { data, error } = await client.rpc('save_v2_meeting_draft', { p_request: input });
    if (error) return { status: 'error', message: error.code === '40001'
      ? 'The schedule or meeting draft changed. Reload the latest version before editing.'
      : error.code === '22023' ? 'Review the meeting links and event identities, then reload if needed.' : failure };
    if (!isV2MeetingReceipt(data) || data.batchId !== input.batchId || data.batchRevision !== input.batchRevision
      || data.revision !== input.expectedRevision + 1) return { status: 'error', message: failure };
    return { status: 'success', receipt: data };
  } catch {
    return { status: 'error', message: failure };
  }
}
