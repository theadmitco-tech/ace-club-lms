import 'server-only';
import { readContentWorkspace } from './v2ContentPublishing';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { COURSE_MATERIALS_BUCKET, createProtectedMaterialUrl, getProtectedMaterialPath, isSupportedProtectedMaterialPath } from '@/lib/materialFiles';
import { isV2TemplateAuthoringEnabled } from '@/lib/server/v2TemplateFeature';
import { getPortalIdentity } from '@/lib/server/portalAuthorization';
import { listV2TemplateDrafts } from '@/lib/server/v2Templates';
import { listV2BatchDrafts } from '@/lib/server/v2Batches';
import { getMyV2PublishedCourse } from '@/lib/server/v2StudentDelivery';
import { isV2MeetingBatchId } from '@/lib/v2Meetings';

export function canonicalV2MaterialPath(reference: string): string | null {
  const path = getProtectedMaterialPath(reference);
  return path && isSupportedProtectedMaterialPath(path) && createProtectedMaterialUrl(path) === reference ? path : null;
}
export async function getV2StudentMaterialPath(batchId: unknown, sessionKey: unknown, itemKey: unknown): Promise<string | null> {
  if (!isV2MeetingBatchId(batchId) || !isV2MeetingBatchId(sessionKey) || !isV2MeetingBatchId(itemKey)) return null;
  const course = await getMyV2PublishedCourse(batchId);
  const item = course?.sessions.find((session) => session.key === sessionKey)?.content;
  const resource=item && Object.values(item).flat().find(material=>material.key===itemKey);
  return resource ? canonicalV2MaterialPath(resource.url) : null;
}
export async function getV2AdminMaterialPath(value: unknown): Promise<string | null> {
  try {
    if (!isV2TemplateAuthoringEnabled() || typeof value !== 'string' || !isSupportedProtectedMaterialPath(value)
      || (await getPortalIdentity())?.role !== 'admin') return null;
    const reference = createProtectedMaterialUrl(value);
    const [templates,batches,workspace] = await Promise.all([listV2TemplateDrafts(),listV2BatchDrafts(),readContentWorkspace()]);
    const documents = [...(templates.status === 'ready' ? templates.templates.map((template) => template.document) : []),
      ...(batches.status === 'ready' ? batches.drafts : [])];
    if(workspace?.items.some(i=>!i.deleted&&i.document.url===reference))return value;
    return documents.some((document) => [...(document.sessions ?? []),...document.events]
      .some((session) => session.content?.materials.some((item) => item.url === reference))) ? value : null;
  } catch { return null; }
}

// Signing follows authorization. The upstream token remains on the server;
// each file request rechecks the current course or Admin boundary before streaming.
export async function streamV2Material(path: string, range: string | null): Promise<Response | null> {
  if (!isV2TemplateAuthoringEnabled() || !isSupportedProtectedMaterialPath(path)) return null;
  const origin = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!origin || !key) return null;
  if (range && !/^bytes=\d+-\d*$/.test(range)) return null;
  try {
    const admin = createAdminClient(origin,key,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data,error} = await admin.storage.from(COURSE_MATERIALS_BUCKET).createSignedUrl(path,60);
    if (error || !data?.signedUrl) return null;
    const signed = new URL(data.signedUrl), expected = new URL(origin);
    if (signed.protocol !== 'https:' || signed.origin !== expected.origin
      || decodeURIComponent(signed.pathname) !== `/storage/v1/object/sign/${COURSE_MATERIALS_BUCKET}/${path}`) return null;
    const upstream = await fetch(signed,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(20000),headers:range?{Range:range}:{}});
    if (![200,206].includes(upstream.status) || !upstream.body) return null;
    const headers = new Headers({'Content-Type':'application/pdf','Content-Disposition':'inline; filename="course-material.pdf"',
      'Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});
    for (const name of ['content-length','content-range','accept-ranges']) {
      const value = upstream.headers.get(name); if (value) headers.set(name,value);
    }
    return new Response(upstream.body,{status:upstream.status,headers});
  } catch { return null; }
}
