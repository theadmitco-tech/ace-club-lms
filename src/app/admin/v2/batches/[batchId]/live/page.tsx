import Link from 'next/link';
import { isV2LearningEnabled } from '@/lib/server/v2LearningFeature';
import { readV2LiveMappings } from '@/lib/server/v2Learning';
import { listV2BatchPublications } from '@/lib/server/v2Publications';
import LiveSessionMappings from './LiveSessionMappings';
import { notFound } from 'next/navigation';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { isV2StudentScheduleEnabled } from '@/lib/server/v2StudentScheduleFeature';
import { readV2LiveOperations } from '@/lib/server/v2StudentDelivery';
import { isV2MeetingBatchId } from '@/lib/v2Meetings';
import LiveOperations from './LiveOperations';

export default async function LiveOperationsPage({params}:{params:Promise<{batchId:string}>}) {
  if (!isV2StudentScheduleEnabled()) notFound();
  const identity = await requirePortalRole('admin');
  const {batchId}=await params;
  if (!isV2MeetingBatchId(batchId)) notFound();
  const learningEnabled = isV2LearningEnabled();
  const [result, mappings, publications] = await Promise.all([readV2LiveOperations(batchId), learningEnabled ? readV2LiveMappings(batchId) : Promise.resolve(null), learningEnabled ? listV2BatchPublications() : Promise.resolve(null)]);
  const publication = publications?.publications.find(item => item.batchId === batchId && item.state === 'published');
  return <div><h1 className="admin-page-title">Live class operations</h1><p className="admin-page-subtitle">Registration, private meeting access and class completion.</p>
    <Link href="/admin/v2/batches" prefetch={false}>Back to batches</Link>{' · '}<Link href={`/admin/v2/batches/${batchId}/students`} prefetch={false}>Batch enrollment</Link>{' · '}<Link href={`/admin/v2/batches/${batchId}/meeting`} prefetch={false}>Meeting configuration</Link>
    {learningEnabled && (publication && mappings ? <LiveSessionMappings publication={publication} mappings={mappings} /> : <section className="admin-card" role="alert"><p>Published session mappings could not be loaded. Completion remains unavailable.</p></section>)}
    {result ? <LiveOperations key={`${identity.id}:${batchId}`} batchId={batchId} registrations={result.registrations} classes={result.classes} learningEnabled={learningEnabled} mappings={mappings ?? []} />
      : <section className="admin-card" role="alert"><p>Live operations could not be loaded. Check the batch and reload.</p></section>}
  </div>;
}
