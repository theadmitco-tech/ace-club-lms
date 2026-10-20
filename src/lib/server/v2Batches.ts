import 'server-only';

import { getPortalIdentity } from '@/lib/server/portalAuthorization';
import { isV2BatchAuthoringEnabled } from '@/lib/server/v2BatchFeature';
import { createClient } from '@/utils/supabase/server';
import { isV2BatchDraft, isV2BatchProposal, validateV2BatchInput,
  type V2BatchDraft, type V2BatchInput, type V2BatchPreviewResult, type V2BatchSaveResult } from '@/lib/v2Batches';

type BatchListResult = { status: 'ready'; drafts: V2BatchDraft[] }
  | { status: 'disabled' | 'forbidden' | 'unavailable'; drafts: [] };

const failure = 'The schedule could not be confirmed. Retry the same operation or reload the latest drafts.';
function message(code?: string) {
  if (code === '40001') return 'The batch or template changed. Reload the latest drafts and review the schedule again.';
  if (code === '22023') return 'Review the schedule fields and saved template. Event identities and the template start date must be preserved when editing.';
  return failure;
}
function matches(draft: V2BatchDraft, input: V2BatchInput) {
  return draft.id === input.id && draft.templateId === input.templateId && draft.templateRevision === input.templateRevision
    && draft.revision === input.expectedRevision + 1 && draft.title === input.title && draft.startDate === input.startDate
    && draft.timeZone === input.timeZone
    && (input.events === null || (draft.events.length === input.events.length && input.events.every((event) => {
      const saved = draft.events.find((candidate) => candidate.key === event.key);
      return saved && (saved.kind ?? 'live') === (event.kind ?? 'live') && saved.localDate === event.localDate && saved.localStartTime === event.localStartTime
        && saved.durationMinutes === event.durationMinutes && saved.instructor === event.instructor && saved.capacity === event.capacity;
    })));
}

export async function listV2BatchDrafts(): Promise<BatchListResult> {
  if (!isV2BatchAuthoringEnabled()) return { status: 'disabled', drafts: [] };
  try {
    if ((await getPortalIdentity())?.role !== 'admin') return { status: 'forbidden', drafts: [] };
    const client = await createClient();
    const { data, error } = await client.rpc('list_v2_batch_drafts');
    if (error || !Array.isArray(data) || !data.every(isV2BatchDraft)) return { status: 'unavailable', drafts: [] };
    return { status: 'ready', drafts: data };
  } catch {
    return { status: 'unavailable', drafts: [] };
  }
}

export async function previewV2BatchDraft(value: unknown): Promise<V2BatchPreviewResult> {
  if (!isV2BatchAuthoringEnabled()) return { status: 'error', message: 'Batch authoring is unavailable.' };
  try {
    if ((await getPortalIdentity())?.role !== 'admin') return { status: 'error', message: 'Active Admin access is required.' };
    const invalid = validateV2BatchInput(value);
    if (invalid) return { status: 'error', message: invalid };
    const input = value as V2BatchInput;
    const client = await createClient();
    const { data, error } = await client.rpc('preview_v2_batch_draft', { p_request: input });
    if (error || !isV2BatchProposal(data) || !matches(data.draft, input)) return { status: 'error', message: message(error?.code) };
    return { status: 'success', proposal: data };
  } catch {
    return { status: 'error', message: failure };
  }
}

export async function saveV2BatchDraft(value: unknown, fingerprint: unknown): Promise<V2BatchSaveResult> {
  if (!isV2BatchAuthoringEnabled()) return { status: 'error', message: 'Batch authoring is unavailable.' };
  try {
    if ((await getPortalIdentity())?.role !== 'admin') return { status: 'error', message: 'Active Admin access is required.' };
    const invalid = validateV2BatchInput(value);
    if (invalid) return { status: 'error', message: invalid };
    if (typeof fingerprint !== 'string' || !/^[0-9a-f]{32}$/.test(fingerprint)) return { status: 'error', message: 'Review the schedule before saving.' };
    const input = value as V2BatchInput;
    const client = await createClient();
    const { data, error } = await client.rpc('save_v2_batch_draft', { p_request: input, p_fingerprint: fingerprint });
    if (error || !data || !isV2BatchDraft(data.draft) || !matches(data.draft, input) || typeof data.replayed !== 'boolean') {
      return { status: 'error', message: message(error?.code) };
    }
    return { status: 'success', draft: data.draft, replayed: data.replayed };
  } catch {
    return { status: 'error', message: failure };
  }
}
