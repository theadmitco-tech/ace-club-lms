import 'server-only';
import { createClient } from '@/utils/supabase/server';
import { getPortalIdentity } from './portalAuthorization';
import { isV2LearningEnabled } from './v2LearningFeature';
import { isV2MeetingBatchId } from '@/lib/v2Meetings';
import { isV2LearningState, isV2ProgressInput, isV2FeedbackInput, isV2RecordingInput, isV2WatchSample } from '@/lib/v2Learning';

export async function getMyV2LearningState(batchId: unknown) {
  try {
    if (!isV2LearningEnabled() || !isV2MeetingBatchId(batchId) || (await getPortalIdentity())?.role !== 'student') return null;
    const { data, error } = await (await createClient()).rpc('get_my_v2_learning_state', { p_batch_id: batchId });
    return !error && isV2LearningState(data) && data.batchId === batchId ? data : null;
  } catch { return null; }
}
export async function markV2LearningProgress(input: unknown) {
  try {
    if (!isV2LearningEnabled() || !isV2ProgressInput(input) || (await getPortalIdentity())?.role !== 'student') return false;
    const { data, error } = await (await createClient()).rpc('mark_v2_learning_progress', {
      p_batch_id: input.batchId, p_session_key: input.sessionKey, p_item_key: input.itemKey,
      p_state: input.state, p_publication_revision: input.publicationRevision,
    });
    return !error && data?.saved === true;
  } catch { return false; }
}
export async function submitV2SessionFeedback(input: unknown) {
  try {
    if (!isV2LearningEnabled() || !isV2FeedbackInput(input) || (await getPortalIdentity())?.role !== 'student') return null;
    const { data, error } = await (await createClient()).rpc('submit_v2_session_feedback', {
      p_obligation_id: input.obligationId, p_request_id: input.requestId, p_response: input.response,
    });
    return !error && data?.submitted === true && typeof data.replayed === 'boolean' ? { submitted: true, replayed: data.replayed } : null;
  } catch { return null; }
}

export async function beginV2RecordingWatch(input: unknown) {
  try {
    if (!isV2LearningEnabled() || !isV2RecordingInput(input) || (await getPortalIdentity())?.role !== 'student') return null;
    const { data, error } = await (await createClient()).rpc('begin_v2_recording_watch', {
      p_batch_id: input.batchId, p_session_key: input.sessionKey, p_recording_key: input.recordingKey, p_publication_revision: input.publicationRevision,
    });
    return !error && isV2MeetingBatchId(data?.watchId) && data.thresholdPercent === 80 && typeof data.due === 'boolean'
      && typeof data.watchedSeconds === 'number' && Number.isFinite(data.watchedSeconds) && data.watchedSeconds >= 0
      && (data.durationSeconds === null || Number.isInteger(data.durationSeconds) && data.durationSeconds > 0 && data.durationSeconds <= 43200)
      ? { watchId: data.watchId, thresholdPercent: 80, watchedSeconds: data.watchedSeconds, durationSeconds: data.durationSeconds, due: data.due } : null;
  } catch { return null; }
}
export async function recordV2RecordingSample(input: unknown) {
  try {
    if (!isV2LearningEnabled() || !isV2WatchSample(input) || (await getPortalIdentity())?.role !== 'student') return null;
    const { data, error } = await (await createClient()).rpc('record_v2_recording_sample', {
      p_watch_id: input.watchId, p_request_id: input.requestId, p_position_seconds: input.positionSeconds, p_duration_seconds: input.durationSeconds, p_playing: input.playing,
    });
    return !error && data?.thresholdPercent === 80 && typeof data.due === 'boolean' && typeof data.watchedSeconds === 'number' && Number.isFinite(data.watchedSeconds) && data.watchedSeconds >= 0
      ? { thresholdPercent: 80, watchedSeconds: data.watchedSeconds, due: data.due } : null;
  } catch { return null; }
}
export async function reportV2RecordingWatched(input: unknown) {
  try {
    if (!isV2LearningEnabled() || !isV2RecordingInput(input) || (await getPortalIdentity())?.role !== 'student') return null;
    const { data, error } = await (await createClient()).rpc('report_v2_recording_watched', {
      p_batch_id: input.batchId, p_session_key: input.sessionKey, p_recording_key: input.recordingKey, p_publication_revision: input.publicationRevision,
    });
    return !error && typeof data?.due === 'boolean' && isV2MeetingBatchId(data.obligationId) ? { due: data.due, obligationId: data.obligationId } : null;
  } catch { return null; }
}

export async function readV2LiveMappings(batchId: unknown) {
  try {
    if (!isV2LearningEnabled() || !isV2MeetingBatchId(batchId) || (await getPortalIdentity())?.role !== 'admin') return null;
    const { data, error } = await (await createClient()).rpc('list_v2_live_session_mappings', { p_batch_id: batchId });
    return !error && Array.isArray(data) && data.every(item => item && isV2MeetingBatchId(item.eventKey) && isV2MeetingBatchId(item.sessionKey)
      && Number.isInteger(item.publicationRevision) && item.publicationRevision > 0) ? data as { eventKey: string; sessionKey: string; publicationRevision: number }[] : null;
  } catch { return null; }
}
export async function setV2LiveMapping(input: { batchId: string; eventKey: string; sessionKey: string; publicationRevision: number }) {
  const failure = { status: 'error' as const, message: 'The live class mapping could not be confirmed. Reload the published course before retrying.' };
  try {
    if (!isV2LearningEnabled() || !input || !isV2MeetingBatchId(input.batchId) || !isV2MeetingBatchId(input.eventKey) || !isV2MeetingBatchId(input.sessionKey)
      || !Number.isInteger(input.publicationRevision) || input.publicationRevision < 1 || (await getPortalIdentity())?.role !== 'admin') return failure;
    const { data, error } = await (await createClient()).rpc('set_v2_live_session_mapping', {
      p_batch_id: input.batchId, p_event_key: input.eventKey, p_session_key: input.sessionKey, p_publication_revision: input.publicationRevision,
    });
    return !error && data?.saved === true && typeof data.replayed === 'boolean' ? { status: 'success' as const } : failure;
  } catch { return failure; }
}
