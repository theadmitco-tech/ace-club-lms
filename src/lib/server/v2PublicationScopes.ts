import 'server-only';
import { getPortalIdentity } from '@/lib/server/portalAuthorization';
import { isV2BatchAuthoringEnabled } from '@/lib/server/v2BatchFeature';
import { createClient } from '@/utils/supabase/server';
import { isPublicationScopeInput, isPublicationScopeReview, type PublicationScopeReview } from '@/lib/v2PublicationScopes';
import { isV2Publication, isV2PublicationFingerprint, type V2Publication } from '@/lib/v2Publications';

type Failure = { status: 'error'; message: string };
const failure = (code?: string): Failure => ({ status: 'error', message: code === '40001'
  ? 'The publication scope changed. Cancel this review and review the current scope.'
  : code === '22023' ? 'The selected offerings need saved batches and valid live schedules.'
  : 'Publication could not be confirmed. Retry the same review or reload the latest scope.' });
export async function previewPublicationScope(input: unknown): Promise<Failure | { status: 'success'; review: PublicationScopeReview }> {
  try {
    if (!isV2BatchAuthoringEnabled() || (await getPortalIdentity())?.role !== 'admin' || !isPublicationScopeInput(input)) return failure();
    const client = await createClient();
    const { data, error } = await client.rpc('preview_v2_publication_scope', { p_request: input });
    if (error || !isPublicationScopeReview(data,input)) return failure(error?.code);
    return { status: 'success', review: data };
  } catch { return failure(); }
}
export async function savePublicationScope(input: unknown, fingerprint: unknown): Promise<Failure | { status: 'success'; documents: V2Publication[]; replayed: boolean }> {
  try {
    if (!isV2BatchAuthoringEnabled() || (await getPortalIdentity())?.role !== 'admin'
      || !isPublicationScopeInput(input) || !isV2PublicationFingerprint(fingerprint)) return failure();
    const client = await createClient();
    const { data, error } = await client.rpc('save_v2_publication_scope', { p_request: input, p_fingerprint: fingerprint });
    if (error || !Array.isArray(data?.documents) || !data.documents.length || !data.documents.every(isV2Publication)
      || typeof data.replayed !== 'boolean' || data.documents.length > 100
      || new Set(data.documents.map((document: V2Publication) => document.batchId)).size !== data.documents.length
      || !data.documents.every((document: V2Publication) => input.productCodes.includes(document.productCode)
        && document.state === (input.action === 'publish' ? 'published' : 'unpublished'))) return failure(error?.code);
    return { status: 'success', documents: data.documents, replayed: data.replayed };
  } catch { return failure(); }
}
