import Link from 'next/link';
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
  const result=await readV2LiveOperations(batchId);
  return <div><h1 className="admin-page-title">Live class operations</h1><p className="admin-page-subtitle">Registration, private meeting access and class completion.</p>
    <Link href="/admin/v2/batches" prefetch={false}>Back to batches</Link>{' · '}<Link href={`/admin/v2/batches/${batchId}/students`} prefetch={false}>Batch enrollment</Link>{' · '}<Link href={`/admin/v2/batches/${batchId}/meeting`} prefetch={false}>Meeting configuration</Link>
    {result ? <LiveOperations key={`${identity.id}:${batchId}`} batchId={batchId} registrations={result.registrations} classes={result.classes} />
      : <section className="admin-card" role="alert"><p>Live operations could not be loaded. Check the batch and reload.</p></section>}
  </div>;
}
