import { notFound } from 'next/navigation';
import { AdminDraftLink as Link } from '@/components/AdminDraftNavigation';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { isV2ContentPublishingEnabled } from '@/lib/server/v2ContentPublishing';
import { readAdminStudentAccess } from '@/lib/server/adminStudentAccess';
import type { V2BatchDraft } from '@/lib/v2Batches';
import styles from './studentAccess.module.css';
import StudentAccessTabs from './StudentAccessTabs';
import { isV2MeetingBatchId } from '@/lib/v2Meetings';
const names:Record<string,string>={full_batch:'Full Course',quant_crash:'Quant',verbal_crash:'Verbal',di_crash:'DI'};
type AccessRecord = { batch_id: string; active: boolean };
const hasLiveClasses = (batch: V2BatchDraft) => batch.events.some(event => event.kind !== 'outline');
function AccessGroup({ title, batches, enrollments, registrations, live = false }: {
  title: string; batches: V2BatchDraft[];
  enrollments: AccessRecord[]; registrations: AccessRecord[]; live?: boolean;
}) {
  return <section className={styles.group} aria-label={title}>
    <h3 className={styles.srOnly}>{title}</h3>
    {batches.length ? <>
      <div className={styles.columnLabels} data-live={live} aria-hidden="true"><span>{live ? 'Batch' : 'Library'}</span><span>Enrollment</span>{live && <span>Live registration</span>}</div>
      <ul className={styles.list}>{batches.map(batch => {
        const enrolled = enrollments.some(item => item.batch_id === batch.id && item.active);
        const registered = registrations.some(item => item.batch_id === batch.id && item.active);
        return <li key={batch.id} data-live={live}>
          <h4>{batch.title}</h4>
          <div className={styles.accessCell}>
            <span className={styles.status} data-active={enrolled}><span className={styles.srOnly}>Enrollment: </span><span>{enrolled ? 'Enrolled' : 'Not enrolled'}</span></span>
            <Link href={`/admin/v2/batches/${batch.id}/students`} aria-label={`Manage enrollment: ${batch.title}`}>Manage<span aria-hidden="true"> →</span></Link>
          </div>
          {live && <div className={styles.accessCell}>
            <span className={styles.status} data-active={registered}>{registered ? 'Live registered' : 'Not registered for live classes'}</span>
            <Link href={`/admin/v2/batches/${batch.id}/live`} aria-label={`Manage live registration: ${batch.title}`}>Manage<span aria-hidden="true"> →</span></Link>
          </div>}
        </li>;
      })}</ul>
    </> : <p className={styles.empty}>{live ? 'No live batches are available yet.' : 'No subject libraries are available yet.'}</p>}
  </section>;

}
export default async function StudentAccessPage({params}:{params:Promise<{studentId:string}>}) {
  if(!isV2ContentPublishingEnabled())notFound();await requirePortalRole('admin');const {studentId}=await params;if(!isV2MeetingBatchId(studentId))notFound();
  const {profile,purchases,enrollments,registrations,batches,checkedAt}=await readAdminStudentAccess(studentId);
  if(profile.error)return <p role="alert">The student profile could not be loaded. Reload to retry.</p>;if(!profile.data)notFound();
  const failed=!!(purchases.error||enrollments.error||registrations.error)||batches.status!=='ready';
  const availableBatches = batches.status === 'ready' ? batches.drafts : [];
  const subjectOrder: Record<string, number> = { quant: 0, verbal: 1, di: 2 };
  const libraries = availableBatches.filter(batch => batch.productCode !== 'full_course' && !hasLiveClasses(batch))
    .sort((a, b) => (subjectOrder[a.productCode] ?? 3) - (subjectOrder[b.productCode] ?? 3));
  const liveBatches = availableBatches.filter(hasLiveClasses);
  const date=(value:string)=>new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeZone:'Asia/Kolkata'}).format(new Date(value));
  return <div className={styles.workspace}><Link className={styles.back} href="/admin/v2/students">← Students</Link>
    <header className={styles.header}><div><h1 className="admin-page-title">{profile.data.full_name||'Student'}</h1></div><span className={styles.accountStatus} data-active={profile.data.is_active}>{profile.data.is_active?'Active account':'Inactive account · access unavailable'}</span></header>
    {failed&&<p role="alert" className="workflow-error">Some access records could not be loaded. No missing record should be treated as proof of missing access; reload before making changes.</p>}
    <div className={styles.grid}><section className={styles.purchasePanel} aria-labelledby="course-access-heading"><h2 id="course-access-heading" className={styles.srOnly}>Course access</h2>
      {purchases.error ? <p className={styles.empty}>Purchase records unavailable.</p> : <ul className={styles.purchases}>{purchases.data?.map(purchase => {
        const status = purchase.revoked_at ? 'Revoked' : !profile.data!.is_active ? 'Account inactive' : Date.parse(purchase.expires_at) <= checkedAt ? 'Expired' : Date.parse(purchase.confirmed_at) > checkedAt ? 'Not active yet' : 'Active access';
        return <li key={purchase.id}>
          <details className={styles.purchaseDetails}>
            <summary><span className={styles.purchaseIdentity}><strong>{purchase.v2_product_grants.map(grant=>names[grant.product_code]??'Course').join(' + ')}</strong><span className={styles.purchaseStatus} data-active={status === 'Active access'} data-expired={status === 'Expired' || status === 'Revoked'}>{status}</span></span><span className={styles.expiry}>Expires {date(purchase.expires_at)}</span><span className={styles.detailsLabel}>Details<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m6 9 6 6 6-6" /></svg></span></summary>
            <div className={styles.purchaseBody}><p>Confirmed {date(purchase.confirmed_at)}</p><p>Enrollment does not renew an expired or revoked purchase.</p></div>
          </details>
        </li>;
      })}{!purchases.data?.length && <li>No V2 purchase is recorded. Existing legacy batch access is separate.</li>}</ul>}
      {purchases.data?.length===100&&<p className={styles.purchaseNote}>The latest 100 purchases are shown.</p>}</section>
      <section className={styles.panel} aria-labelledby="batch-access-heading">
        <h2 id="batch-access-heading" className={styles.srOnly}>Libraries & live batches</h2>
        {enrollments.error || registrations.error || batches.status !== 'ready'
          ? <p className={styles.empty}>Batch access could not be loaded. Reload before making changes.</p>
          : <StudentAccessTabs
              libraries={<AccessGroup title="Subject libraries" batches={libraries} enrollments={enrollments.data ?? []} registrations={registrations.data ?? []} />}
              live={<AccessGroup title="Live batches" batches={liveBatches} enrollments={enrollments.data ?? []} registrations={registrations.data ?? []} live />}
            />}
      </section></div>
    <details className={styles.moreTools}><summary>More student tools</summary><div className="workflow-actions"><Link href="/admin/progress">Existing batch progress</Link><Link href="/admin/users">Account management</Link></div></details>
  </div>;
}
