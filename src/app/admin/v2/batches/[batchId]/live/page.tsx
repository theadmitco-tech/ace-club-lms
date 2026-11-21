import Link from 'next/link';
import { isV2LearningEnabled } from '@/lib/server/v2LearningFeature';
import { readV2LiveMappings } from '@/lib/server/v2Learning';
import { listV2BatchPublications } from '@/lib/server/v2Publications';
import { notFound } from 'next/navigation';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { isV2StudentScheduleEnabled } from '@/lib/server/v2StudentScheduleFeature';
import { readV2LiveOperations } from '@/lib/server/v2StudentDelivery';
import { isV2MeetingBatchId } from '@/lib/v2Meetings';
import LiveOperations from './LiveOperations';
import styles from './live.module.css';

export default async function LiveOperationsPage({params}:{params:Promise<{batchId:string}>}) {
  if (!isV2StudentScheduleEnabled()) notFound();
  const identity = await requirePortalRole('admin');
  const {batchId}=await params;
  if (!isV2MeetingBatchId(batchId)) notFound();
  const learningEnabled = isV2LearningEnabled();
  const [result, mappings, publications] = await Promise.all([readV2LiveOperations(batchId), learningEnabled ? readV2LiveMappings(batchId) : Promise.resolve(null), listV2BatchPublications()]);
  const publication = publications.status === 'ready' ? publications.publications.find(item => item.batchId === batchId && item.state === 'published') : undefined;
  return <div className={styles.page}>
    <Link className={styles.back} href={`/admin/v2/batches?batch=${batchId}`} prefetch={false}>← Back to batch</Link>
    <header className={styles.header}>
      <h1 className="admin-page-title">{publication?.title ?? 'Live classes'}</h1>
      <p className="admin-page-subtitle">Register live attendees, then mark each class complete after it ends. All times IST.</p>
    </header>
    {result ? <LiveOperations key={`${identity.id}:${batchId}`} batchId={batchId} registrations={result.registrations} classes={result.classes}
      learningEnabled={learningEnabled} mappings={mappings ?? []} mappingsAvailable={!learningEnabled || !!mappings} publication={publication} seatLimit={publication?.liveRegistrationLimit ?? 8} />
      : <section className={styles.panel} role="alert"><h2>Live classes could not be loaded</h2><p>Check the batch and reload this page.</p></section>}
  </div>;
}
