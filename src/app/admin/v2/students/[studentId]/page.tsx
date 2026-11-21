import { notFound } from 'next/navigation';
import { AdminDraftLink as Link } from '@/components/AdminDraftNavigation';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { isV2ContentPublishingEnabled } from '@/lib/server/v2ContentPublishing';
import { readAdminStudentAccess } from '@/lib/server/adminStudentAccess';
import type { V2BatchDraft } from '@/lib/v2Batches';
import styles from './studentAccess.module.css';
import { isV2MeetingBatchId } from '@/lib/v2Meetings';

const names: Record<string, string> = { full_batch: 'Full Course', quant_crash: 'Quant', verbal_crash: 'Verbal', di_crash: 'DI' };
const isLive = (batch: V2BatchDraft) => batch.events.some(event => event.kind !== 'outline');
const date = (value: string) => new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'Asia/Kolkata' }).format(new Date(value));

export default async function StudentAccessPage({ params }: { params: Promise<{ studentId: string }> }) {
  if (!isV2ContentPublishingEnabled()) notFound(); await requirePortalRole('admin');
  const { studentId } = await params; if (!isV2MeetingBatchId(studentId)) notFound();
  const { profile, purchases, enrollments, registrations, batches, checkedAt } = await readAdminStudentAccess(studentId);
  if (profile.error) return <p role="alert">The student profile could not be loaded. Reload to retry.</p>;
  if (!profile.data) notFound();
  const student = profile.data as { full_name: string | null; email?: string | null; is_active: boolean };
  const batchError = !!(enrollments.error || registrations.error) || batches.status !== 'ready';
  // The combined Full Course library is retired; Full Course content lives in the three subject libraries.
  const all = batches.status === 'ready' ? batches.drafts.filter(batch => isLive(batch) || batch.productCode !== 'full_course') : [];
  const enrolledIds = new Set((enrollments.data ?? []).filter(item => item.active).map(item => item.batch_id));
  const seatIds = new Set((registrations.data ?? []).filter(item => item.active).map(item => item.batch_id));
  const order = (batch: V2BatchDraft) => (isLive(batch) ? 0 : 1) * 10 + ({ full_course: 0, quant: 1, verbal: 2, di: 3 }[batch.productCode] ?? 4);
  const enrolled = all.filter(batch => enrolledIds.has(batch.id)).sort((a, b) => order(a) - order(b));
  const others = all.filter(batch => !enrolledIds.has(batch.id)).sort((a, b) => order(a) - order(b));

  return <div className={styles.workspace}>
    <Link className={styles.back} href="/admin/v2/students">← Students</Link>
    <header className={styles.header}>
      <div><h1 className="admin-page-title">{student.full_name || 'Student'}</h1>{student.email && <p className={styles.email}>{student.email}</p>}</div>
      <span className={styles.accountStatus} data-active={student.is_active}>{student.is_active ? 'Active account' : 'Inactive account · access unavailable'}</span>
    </header>
    {(purchases.error || batchError) && <p role="alert" className="workflow-error">Some access records could not be loaded. Don’t treat a missing item as missing access; reload before making changes.</p>}

    <section className={styles.card} aria-labelledby="course-access-heading">
      <h2 id="course-access-heading">Course access</h2>
      {purchases.error ? <p className={styles.empty}>Purchase records unavailable.</p> : !purchases.data?.length
        ? <p className={styles.empty}>No purchase recorded. Access from the older batch system is managed separately.</p>
        : <ul className={styles.purchaseList}>{purchases.data.map(purchase => {
          const status = purchase.revoked_at ? 'Revoked' : !student.is_active ? 'Account inactive' : Date.parse(purchase.expires_at) <= checkedAt ? 'Expired' : Date.parse(purchase.confirmed_at) > checkedAt ? 'Not active yet' : 'Active access';
          return <li key={purchase.id}>
            <strong>{purchase.v2_product_grants.map(grant => names[grant.product_code] ?? 'Course').join(' + ')}</strong>
            <span className={styles.purchaseStatus} data-active={status === 'Active access'} data-expired={status === 'Expired' || status === 'Revoked'}>{status}</span>
            <span className={styles.purchaseDates}>Confirmed {date(purchase.confirmed_at)} · Expires {date(purchase.expires_at)}</span>
          </li>;
        })}</ul>}
      {purchases.data?.length === 100 && <p className={styles.purchaseNote}>The latest 100 purchases are shown.</p>}
      <p className={styles.hint}>Access lasts six months from payment. Enrolling in a batch doesn’t renew it.</p>
    </section>

    <section className={styles.card} aria-labelledby="batch-access-heading">
      <h2 id="batch-access-heading">Batches</h2>
      {batchError ? <p className={styles.empty}>Batch access could not be loaded. Reload before making changes.</p> : <>
        {enrolled.length ? <ul className={styles.batchList}>{enrolled.map(batch => {
          const live = isLive(batch);
          return <li key={batch.id}>
            <div className={styles.batchMain}><strong>{batch.title}</strong><span>{live ? 'Live batch' : 'Course library'} · Sees the schedule{live ? (seatIds.has(batch.id) ? ' · Live seat' : ' · No live seat') : ''}</span></div>
            <div className={styles.batchActions}>
              <Link href={`/admin/v2/batches/${batch.id}/students`} aria-label={`Manage enrollment: ${batch.title}`}>Enrollment</Link>
              {live && <Link href={`/admin/v2/batches/${batch.id}/live`} aria-label={`Manage live registration: ${batch.title}`}>Live seat</Link>}
            </div>
          </li>;
        })}</ul> : <p className={styles.empty}>Not enrolled in any batch yet.</p>}
        {!!others.length && <details className={styles.others}><summary>Other batches ({others.length})</summary>
          <ul className={styles.batchList}>{others.map(batch => <li key={batch.id}>
            <div className={styles.batchMain}><strong>{batch.title}</strong><span>{isLive(batch) ? 'Live batch' : 'Course library'} · Not enrolled</span></div>
            <div className={styles.batchActions}><Link href={`/admin/v2/batches/${batch.id}/students`} aria-label={`Manage enrollment: ${batch.title}`}>Enroll</Link></div>
          </li>)}</ul></details>}
      </>}
    </section>
  </div>;
}
