import { notFound } from 'next/navigation';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { isV2ContentPublishingEnabled } from '@/lib/server/v2ContentPublishing';
import { listV2BatchDrafts } from '@/lib/server/v2Batches';
import { listV2BatchPublications } from '@/lib/server/v2Publications';
import CourseDraftReview from './CourseDraftReview';
export default async function CourseReviewPage({params,searchParams}:{params:Promise<{batchId:string}>;searchParams:Promise<{edit?:string;session?:string}>}) {
  if(!isV2ContentPublishingEnabled())notFound();
  const identity=await requirePortalRole('admin');
  const [{batchId},query,drafts,publications]=await Promise.all([params,searchParams,listV2BatchDrafts(),listV2BatchPublications()]);
  if(drafts.status!=='ready'||publications.status!=='ready')return <p role="alert">Course review could not be loaded. Reload to retry.</p>;
  const draft=drafts.drafts.find(item=>item.id===batchId);
  if(!draft||!['quant','verbal','di'].includes(draft.productCode)||draft.events.some(event=>event.kind==='live'))notFound();
  return <CourseDraftReview key={`${batchId}:${draft.revision}`} draft={draft} publications={publications.publications.filter(item=>item.batchId===batchId)} ownerId={identity.id} editing={query.edit==='1'} sessionKey={query.session}/>;
}
