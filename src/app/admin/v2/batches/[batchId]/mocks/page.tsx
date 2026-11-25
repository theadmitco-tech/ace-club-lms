import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { isV2BatchAuthoringEnabled } from '@/lib/server/v2BatchFeature';
import { listV2BatchMocks } from '@/lib/server/v2Mocks';
import { listV2BatchPublications } from '@/lib/server/v2Publications';
import { isV2MeetingBatchId } from '@/lib/v2Meetings';
import MockEditor from './MockEditor';
import styles from '../batchPage.module.css';

export default async function V2BatchMocksPage({ params }: { params: Promise<{ batchId: string }> }) {
  if (!isV2BatchAuthoringEnabled()) notFound();
  await requirePortalRole('admin');
  const { batchId } = await params;
  if (!isV2MeetingBatchId(batchId)) notFound();
  const [mocks, publications] = await Promise.all([listV2BatchMocks(batchId), listV2BatchPublications().catch(() => null)]);
  const title = publications?.status === 'ready' ? publications.publications.find(item => item.batchId === batchId)?.title : undefined;
  return <div className={styles.page}>
    <Link className={styles.back} href={`/admin/v2/batches?batch=${batchId}`} prefetch={false}>← Back to batch</Link>
    <header className={styles.header}>
      <h1 className="admin-page-title">Mocks{title ? ` · ${title}` : ''}</h1>
      <p className="admin-page-subtitle">Schedule this batch’s mock tests. Enrolled students see them on their Mocks page with the date, time, test link and instructions. All times IST.</p>
    </header>
    {mocks ? <MockEditor batchId={batchId} mocks={mocks} />
      : <section className={styles.panel} role="alert"><h2>Mocks could not be loaded</h2><p className={styles.muted}>Check the batch and reload this page.</p></section>}
  </div>;
}
