import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { isV2StudentScheduleEnabled } from '@/lib/server/v2StudentScheduleFeature';
import { listV2EnrollmentOptions } from '@/lib/server/v2Enrollments';
import { listV2BatchDrafts } from '@/lib/server/v2Batches';
import { isV2MeetingBatchId } from '@/lib/v2Meetings';
import EnrollmentEditor from './EnrollmentEditor';

export default async function V2StudentsPage({ params }: { params: Promise<{ batchId: string }> }) {
  if (!isV2StudentScheduleEnabled()) notFound();
  const identity = await requirePortalRole('admin');
  const { batchId } = await params;
  if (!isV2MeetingBatchId(batchId)) notFound();
  const [result, batches] = await Promise.all([listV2EnrollmentOptions(batchId), listV2BatchDrafts()]);
  const batch = batches.status === 'ready' ? batches.drafts.find((row) => row.id === batchId) : null;
  return <div><h1 className="admin-page-title">{batch?.title ?? 'Batch students'}</h1>
    <Link href="/admin/v2/batches" prefetch={false}>Back to batches</Link>
    {result.status === 'ready' && batch ? <EnrollmentEditor key={`${identity.id}:${batchId}`} batchId={batchId} options={result.options} />
      : <div className="admin-card" role="alert"><p>Students could not be loaded. Check the batch and reload.</p>
        <Link href={`/admin/v2/batches/${batchId}/students`} prefetch={false}>Reload student list</Link></div>}
  </div>;
}
