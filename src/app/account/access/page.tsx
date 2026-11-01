import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { isV2Phase1PreviewEnabled } from '@/lib/server/v2Phase1Feature';
import { getMyV2Access } from '@/lib/server/v2Products';
import { historyPage, loadPurchaseHistory } from '@/lib/server/v2CourseWorkspace';
import { v2ProductDisplayName } from '@/lib/v2Products';
import { courseDate, courseNames, purchaseState } from '@/lib/v2CoursePresentation';
import { PurchaseHistory } from '@/components/courses/PurchaseHistory';
import { StudentHeader } from '@/components/student/StudentHeader';
import { createClient } from '@/utils/supabase/server';
import previewStyles from '@/components/student/studentPreview.module.css';
import styles from '@/components/courses/courses.module.css';
import '@/app/dashboard/dashboard.css';

export const dynamic = 'force-dynamic';
export default async function MyAccessPage({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }) {
  if (!isV2Phase1PreviewEnabled()) notFound();
  const identity = await requirePortalRole('student');
  const page = historyPage((await searchParams).page);
  const supabase = await createClient();
  const [access, history, profile] = await Promise.all([
    getMyV2Access().catch(() => null), loadPurchaseHistory('student', page),
    supabase.from('profiles').select('full_name').eq('id', identity.id).maybeSingle(),
  ]);
  const expiredPurchases = history.status === 'ready' ? history.items.filter((item) => purchaseState(item, history.checkedAt) === 'Expired') : [];
  return <div className={`student-page ${previewStyles.preview}`}><StudentHeader studentName={profile.data?.full_name?.trim() || 'Student'} /><main className={styles.main}>
    <div className={styles.intro}><span className={styles.eyebrow}>YOUR COURSES</span><h1>My access</h1><p>Your subjects, access dates and purchase history, together in one place.</p></div>
    {access !== null && access.length === 0 && expiredPurchases.length > 0 && <section className={styles.expiryNotice} aria-labelledby="expiry-heading"><span className={styles.eyebrow}>MEMBERSHIP ACCESS</span><h2 id="expiry-heading">An earlier course purchase has expired</h2><p>{courseNames(expiredPurchases[0].products)} access ended {courseDate(expiredPurchases[0].expires_at)}.</p><p>Expired purchases no longer provide product access. Your purchase history is preserved below. Existing batch enrollments keep their own access rules.</p></section>}
    <section className={styles.panel} aria-labelledby="active-access-heading"><div className={styles.row}><h2 id="active-access-heading">Active course access</h2><div className={styles.row}><Link href="/courses/v2" prefetch={false}>Explore courses</Link><Link href="/account/access/upgrade" prefetch={false}>Upgrade options</Link></div></div>
      {access === null ? <div role="alert"><p>We couldn’t verify your access. Please retry; this is not a confirmation that your access has ended.</p><Link href="/account/access" prefetch={false}>Retry access check</Link></div> : access.length === 0 ? <div className={styles.empty}><h3>No active course purchase</h3><p>Existing batch enrollments remain available through your learning dashboard. Contact the programme team if you expected a new course purchase here.</p></div> : <ul className={styles.accessGrid}>{access.map((item) => <li className={styles.accessCard} key={item.product_code}><div className={styles.row}><h3>{v2ProductDisplayName(item.product_code)}</h3><span className={styles.badge}>Active</span></div><p className={styles.accessSubject}>Subjects: {item.sections.map((section) => section === 'di' ? 'DI' : section[0].toUpperCase() + section.slice(1)).join(', ')}</p><p>Access ends {courseDate(item.expires_at)}</p></li>)}</ul>}
      <p>Access is checked again when you open protected content. Live-batch enrollment is separate from product access.</p><Link href="/dashboard" prefetch={false}>Return to my learning</Link>
    </section>
    <PurchaseHistory history={history} page={page} href="/account/access" />
  </main></div>;
}
