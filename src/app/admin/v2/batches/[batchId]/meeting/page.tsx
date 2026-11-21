import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { isV2BatchAuthoringEnabled } from '@/lib/server/v2BatchFeature';
import { readV2MeetingDraft } from '@/lib/server/v2Meetings';
import { listV2BatchPublications } from '@/lib/server/v2Publications';
import { isV2MeetingBatchId } from '@/lib/v2Meetings';
import MeetingDraftEditor from './MeetingDraftEditor';
import styles from '../batchPage.module.css';

export default async function V2MeetingPage({ params }: { params: Promise<{ batchId: string }> }) {
  if (!isV2BatchAuthoringEnabled()) notFound();
  const identity = await requirePortalRole('admin');
  const { batchId } = await params;
  if (!isV2MeetingBatchId(batchId)) notFound();
  const [result, publications] = await Promise.all([readV2MeetingDraft(batchId), listV2BatchPublications().catch(() => null)]);
  const published = publications?.status === 'ready' && publications.publications.some(item => item.batchId === batchId && item.state === 'published');
  return <div className={styles.page}>
    {result.status === 'ready'
      ? <MeetingDraftEditor key={`${identity.id}:${batchId}`} ownerId={identity.id} draft={result.draft} published={published} />
      : <>
        <Link className={styles.back} href={`/admin/v2/batches?batch=${batchId}`} prefetch={false}>← Back to batch</Link>
        <section className={styles.panel} role="alert"><h2>Meet links could not be loaded</h2><p className={styles.muted}>Check the batch and reload this page.</p></section>
      </>}
  </div>;
}
