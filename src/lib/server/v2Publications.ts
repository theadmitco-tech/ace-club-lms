import 'server-only';
import { getPortalIdentity } from '@/lib/server/portalAuthorization';
import { isV2BatchAuthoringEnabled } from '@/lib/server/v2BatchFeature';
import { createClient } from '@/utils/supabase/server';
import { isV2Publication, isV2PublicationFingerprint, isV2PublicationInput, publicationMatchesInput,
  type V2Publication, type V2PublicationPreview, type V2PublicationSave } from '@/lib/v2Publications';

const failure = 'Publication could not be confirmed. Retry the same review or reload the latest batch.';
const errorMessage = (code?: string) => code === '40001'
  ? 'The draft or publication changed. Reload and review it again.'
  : code === '22023' ? 'Review the batch, publication state and exact live-session schedule.' : failure;

export async function listV2BatchPublications(): Promise<{ status: 'ready'; publications: V2Publication[] } | { status: 'unavailable'; publications: [] }> {
  try {
    if (!isV2BatchAuthoringEnabled() || (await getPortalIdentity())?.role !== 'admin') return { status: 'unavailable', publications: [] };
    const client = await createClient();
    const { data, error } = await client.rpc('list_v2_batch_publications');
    if (!error && Array.isArray(data) && data.every(isV2Publication)
      && new Set(data.map((item) => item.batchId)).size === data.length) return { status: 'ready', publications: data };
  } catch {
    // Provider diagnostics are excluded from the client response.
  }
  return { status: 'unavailable', publications: [] };
}

export async function previewV2BatchPublication(input: unknown): Promise<V2PublicationPreview> {
  try {
    if (!isV2BatchAuthoringEnabled() || (await getPortalIdentity())?.role !== 'admin') return { status: 'error', message: 'Active Admin authoring access is required.' };
    if (!isV2PublicationInput(input)) return { status: 'error', message: 'Invalid publication request.' };
    const client = await createClient();
    const { data, error } = await client.rpc('preview_v2_batch_publication', { p_request: input });
    if (error || !data || !isV2Publication(data.document) || !publicationMatchesInput(data.document, input)
      || !isV2PublicationFingerprint(data.fingerprint)) return { status: 'error', message: errorMessage(error?.code) };
    return { status: 'success', proposal: { document: data.document, fingerprint: data.fingerprint } };
  } catch {
    return { status: 'error', message: failure };
  }
}

export async function saveV2BatchPublication(input: unknown, fingerprint: unknown): Promise<V2PublicationSave> {
  try {
    if (!isV2BatchAuthoringEnabled() || (await getPortalIdentity())?.role !== 'admin') return { status: 'error', message: 'Active Admin authoring access is required.' };
    if (!isV2PublicationInput(input) || !isV2PublicationFingerprint(fingerprint)) return { status: 'error', message: 'Review publication before confirmation.' };
    const client = await createClient();
    const { data, error } = await client.rpc('save_v2_batch_publication', { p_request: input, p_fingerprint: fingerprint });
    if (error || !data || !isV2Publication(data.document) || !publicationMatchesInput(data.document, input)
      || typeof data.replayed !== 'boolean') return { status: 'error', message: errorMessage(error?.code) };
    return { status: 'success', document: data.document, replayed: data.replayed };
  } catch {
    return { status: 'error', message: failure };
  }
}
