import 'server-only';
import { createClient } from '@/utils/supabase/server';
import { getPortalIdentity } from './portalAuthorization';
import { isV2LearningEnabled } from './v2LearningFeature';
import { isV2MeetingBatchId } from '@/lib/v2Meetings';
import { isV2PublishedCourse, type V2PublishedCourse } from '@/lib/v2StudentDelivery';
import { validContentDocument, validContentPlacements, type ContentWorkspace, type ContentPlacementView } from '@/lib/v2ContentPublishing';
export function isV2ContentPublishingEnabled() { return isV2LearningEnabled() && process.env.V2_CONTENT_PUBLISHING_ENABLED === 'true'; }
export async function contentOperation(action: string, input: Record<string, unknown>) {
  if (!isV2ContentPublishingEnabled() || (await getPortalIdentity())?.role !== 'admin') throw new Error('Active Admin content access required.');
  const revision = Number.isInteger(input.revision) && Number(input.revision) >= 0 && Number(input.revision) <= 2147483645;
  const id = isV2MeetingBatchId(input.id);
  let name: string, args: Record<string, unknown>;
  if (action === 'workspace') { name='list_v2_content_workspace';args={}; }
  else if (action === 'save' && id && revision && isV2MeetingBatchId(input.requestId) && validContentDocument(input.document)) {
    name='save_v2_content_item';args={p_id:input.id,p_expected_revision:input.revision,p_request_id:input.requestId,p_document:input.document};
  } else if (action === 'scope' && id && revision && ['publish','unpublish','delete'].includes(String(input.action))) {
    name='v2_content_scope';args={p_id:input.id,p_revision:input.revision,p_action:input.action};
  } else if (action === 'confirm' && id && revision && isV2MeetingBatchId(input.requestId) && typeof input.fingerprint==='string' && /^[a-f0-9]{64}$/.test(input.fingerprint) && ['publish','unpublish','delete'].includes(String(input.action))) {
    name='publish_v2_content_item';args={p_id:input.id,p_revision:input.revision,p_action:input.action,p_request_id:input.requestId,p_fingerprint:input.fingerprint};
  } else throw new Error('The content request is invalid.');
  const {data,error}=await (await createClient()).rpc(name,args);
  if(error || !data) throw new Error(error?.code==='40001' ? 'The content or course scope changed. Reload and review again.' : 'The action could not be confirmed. Check the source, current course scope and Admin access.');
  return data;
}
export async function readContentWorkspace(): Promise<ContentWorkspace | null> {
  try { const data=await contentOperation('workspace',{});return Array.isArray(data.items) && Array.isArray(data.courses) ? data as ContentWorkspace : null; } catch { return null; }
}
export async function readContentPreview(batchId: string,itemId: string | null,revision: number | null) {
  try {
    if (!isV2ContentPublishingEnabled() || (await getPortalIdentity())?.role !== 'admin' || !isV2MeetingBatchId(batchId)
      || itemId!==null && (!isV2MeetingBatchId(itemId)||!Number.isInteger(revision)||Number(revision)<1)) return null;
    const {data,error}=await (await createClient()).rpc('read_v2_content_preview',{p_batch_id:batchId,p_item_id:itemId,p_revision:revision});
    return !error && data && isV2PublishedCourse(data.course) && validContentPlacements(data.placements) ? {course:data.course as V2PublishedCourse,placements:data.placements as ContentPlacementView[]} : null;
  } catch { return null; }
}
export async function readMyContentPlacements(batchId: string) {
  if (!isV2ContentPublishingEnabled()) return [];
  if ((await getPortalIdentity())?.role!=='student') return [];
  const {data,error}=await (await createClient()).rpc('get_my_v2_content_placements',{p_batch_id:batchId});
  return !error && validContentPlacements(data) ? data : null;
}
