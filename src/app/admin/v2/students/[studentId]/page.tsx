import { notFound } from 'next/navigation';
import { AdminDraftLink as Link } from '@/components/AdminDraftNavigation';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { isV2ContentPublishingEnabled } from '@/lib/server/v2ContentPublishing';
import { readAdminStudentAccess } from '@/lib/server/adminStudentAccess';
import type { V2BatchDraft } from '@/lib/v2Batches';
import styles from './studentAccess.module.css';
import { isV2MeetingBatchId } from '@/lib/v2Meetings';
const names:Record<string,string>={full_batch:'Full Course',quant_crash:'Quant',verbal_crash:'Verbal',di_crash:'DI'};
type AccessRecord = { batch_id: string; active: boolean };
const hasLiveClasses = (batch: V2BatchDraft) => batch.events.some(event => event.kind !== 'outline');
function AccessGroup({ title, description, batches, enrollments, registrations, live = false }: {
  title: string; description: string; batches: V2BatchDraft[];
  enrollments: AccessRecord[]; registrations: AccessRecord[]; live?: boolean;
}) {
  return <section className={styles.group} aria-label={title}>
    <h3>{title}</h3><p className={styles.description}>{description}</p>
    {batches.length ? <ul className={styles.list}>{batches.map(batch => {
      const enrolled = enrollments.some(item => item.batch_id === batch.id && item.active);
      const registered = registrations.some(item => item.batch_id === batch.id && item.active);
      return <li key={batch.id}>
        <h4>{batch.title}</h4>
        <div className={styles.statuses}>
          <span className={styles.status} data-active={enrolled}>{enrolled ? 'Enrolled' : 'Not enrolled'}</span>
          {live && <span className={styles.status} data-active={registered}>{registered ? 'Live registered' : 'Not registered for live classes'}</span>}
        </div>
        <div className={styles.actions}>
          <Link href={`/admin/v2/batches/${batch.id}/students`} aria-label={`Manage enrollment: ${batch.title}`}>Manage enrollment<span aria-hidden="true"> →</span></Link>
          {live && <Link href={`/admin/v2/batches/${batch.id}/live`} aria-label={`Manage live registration: ${batch.title}`}>Live registration<span aria-hidden="true"> →</span></Link>}
        </div>
      </li>;
    })}</ul> : <p className={styles.empty}>{live ? 'No live batches are available yet.' : 'No subject libraries are available yet.'}</p>}
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
  return <div><Link href="/admin/v2/students">← Students</Link><p className="workflow-kicker" style={{marginTop:24}}>Student access</p><h1 className="admin-page-title">{profile.data.full_name||'Student'}</h1><p className="admin-page-subtitle">{profile.data.is_active?'Active account':'Inactive account · access unavailable'} · course access and live registration are checked separately.</p>
    {failed&&<p role="alert" className="workflow-error">Some access records could not be loaded. No missing record should be treated as proof of missing access; reload before making changes.</p>}
    <div className={`workflow-grid ${styles.grid}`}><section className="admin-card"><h2>Course access & purchase history</h2>{purchases.error?<p>Purchase records unavailable.</p>:<ul className="workflow-list">{purchases.data?.map(purchase=><li key={purchase.id}><strong>{purchase.v2_product_grants.map(grant=>names[grant.product_code]??'Course').join(' + ')}</strong><p>{purchase.revoked_at?'Revoked':!profile.data!.is_active?'Account inactive':Date.parse(purchase.expires_at)<=checkedAt?'Expired':Date.parse(purchase.confirmed_at)>checkedAt?'Not active yet':'Active access'}</p><small>Confirmed {date(purchase.confirmed_at)} · expires {date(purchase.expires_at)} IST</small></li>)}{!purchases.data?.length&&<li>No V2 purchase is recorded. Existing legacy batch access is separate.</li>}</ul>}<p className="workflow-muted">Enrollment does not renew an expired or revoked purchase. Payment fulfillment remains a separate workflow.</p>{purchases.data?.length===100&&<p>The latest 100 purchases are shown.</p>}</section>
      <section className={`admin-card ${styles.panel}`} aria-labelledby="batch-access-heading">
        <h2 id="batch-access-heading">Libraries & live batches</h2>
        <p className={styles.intro}>Manage learning materials and live-class registration in one place.</p>
        {enrollments.error || registrations.error || batches.status !== 'ready'
          ? <p className={styles.empty}>Batch access could not be loaded. Reload before making changes.</p>
          : <>
            <AccessGroup title="Subject libraries" description="Enrollment opens published learning materials." batches={libraries} enrollments={enrollments.data ?? []} registrations={registrations.data ?? []} />
            <AccessGroup title="Live batches" description="Enroll the student in a batch, then register them for its live classes." batches={liveBatches} enrollments={enrollments.data ?? []} registrations={registrations.data ?? []} live />
            <p className={styles.note}>Active course access is required for materials and private meetings. Enrollment and live registration do not renew course access.</p>
          </>}
      </section></div>
    <details className="workflow-secondary"><summary>More student tools</summary><div className="workflow-actions"><Link href="/admin/progress">Existing batch progress</Link><Link href="/admin/users">Account management</Link></div></details>
  </div>;
}
