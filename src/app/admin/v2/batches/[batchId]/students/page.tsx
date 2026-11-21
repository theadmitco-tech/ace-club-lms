import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { isV2StudentScheduleEnabled } from '@/lib/server/v2StudentScheduleFeature';
import { listV2EnrollmentOptions } from '@/lib/server/v2Enrollments';
import { listV2BatchDrafts } from '@/lib/server/v2Batches';
import { isV2MeetingBatchId } from '@/lib/v2Meetings';
import { V2_TEMPLATE_PRODUCTS } from '@/lib/v2Templates';
import EnrollmentEditor from './EnrollmentEditor';
import styles from '../batchPage.module.css';

export default async function V2StudentsPage({ params }: { params: Promise<{ batchId: string }> }) {
  if (!isV2StudentScheduleEnabled()) notFound();
  const identity = await requirePortalRole('admin');
  const { batchId } = await params;
  if (!isV2MeetingBatchId(batchId)) notFound();
  const [result, batches] = await Promise.all([listV2EnrollmentOptions(batchId), listV2BatchDrafts()]);
  const batch = batches.status === 'ready' ? batches.drafts.find((row) => row.id === batchId) : null;
  const product = batch ? (batch.productCode === 'full_course' ? 'Full Course' : V2_TEMPLATE_PRODUCTS[batch.productCode].label) : 'course';
  return <div className={styles.page}>
    <Link className={styles.back} href={`/admin/v2/batches?batch=${batchId}`} prefetch={false}>← Back to batch</Link>
    <header className={styles.header}>
      <h1 className="admin-page-title">{batch?.title ?? 'Batch students'}</h1>
      <p className="admin-page-subtitle">Enrolled students see this batch’s schedule. Only students with active {product} access can be enrolled.</p>
    </header>
    {result.status === 'ready' && batch ? <EnrollmentEditor key={`${identity.id}:${batchId}`} batchId={batchId} options={result.options} product={product} />
      : <section className={styles.panel} role="alert"><h2>Students could not be loaded</h2><p className={styles.muted}>Check the batch and reload.</p>
        <Link className={styles.secondaryAction} href={`/admin/v2/batches/${batchId}/students`} prefetch={false}>Reload student list</Link></section>}
  </div>;
}
