import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { isV2BatchAuthoringEnabled } from '@/lib/server/v2BatchFeature';
import { readV2MeetingDraft } from '@/lib/server/v2Meetings';
import { isV2MeetingBatchId } from '@/lib/v2Meetings';
import MeetingDraftEditor from './MeetingDraftEditor';

export default async function V2MeetingPage({ params }: { params: Promise<{ batchId: string }> }) {
  if (!isV2BatchAuthoringEnabled()) notFound();
  const identity = await requirePortalRole('admin');
  const { batchId } = await params;
  if (!isV2MeetingBatchId(batchId)) notFound();
  const result = await readV2MeetingDraft(batchId);
  return <div>
    <h1 className="admin-page-title">Private meeting drafts</h1>
    <Link href={`/admin/v2/batches/${batchId}/live`} prefetch={false}>Live registrations and class completion</Link>
    <p className="admin-page-subtitle">Save Google Meet links for a batch. Drafts remain Admin-only until the matching batch revision is published. Published links are available only to eligible live registrants.</p>
    {result.status === 'ready'
      ? <MeetingDraftEditor key={`${identity.id}:${batchId}`} ownerId={identity.id} draft={result.draft} />
      : <div className="admin-card" role="alert">
        <p>Meeting drafts could not be loaded. Check the current batch, staging setup and Admin access before retrying.</p>
        <Link href="/admin/v2/batches" prefetch={false}>Return to batch drafts</Link>
      </div>}
  </div>;
}
