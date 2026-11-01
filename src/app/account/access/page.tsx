import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { isV2Phase1PreviewEnabled } from '@/lib/server/v2Phase1Feature';
import { getMyV2Access } from '@/lib/server/v2Products';
import { historyPage, loadPurchaseHistory } from '@/lib/server/v2CourseWorkspace';
import { v2ProductDisplayName } from '@/lib/v2Products';
import { courseDate } from '@/lib/v2CoursePresentation';
import { PurchaseHistory } from '@/components/courses/PurchaseHistory';
import { StudentHeader } from '@/components/student/StudentHeader';
import { createClient } from '@/utils/supabase/server';
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
  return <div className="student-page"><StudentHeader studentName={profile.data?.full_name?.trim() || 'Student'} /><main className={styles.main}>
    <div className={styles.intro}><span className={styles.eyebrow}>YOUR COURSES</span><h1>My access</h1><p>See your current course access and the original details of your purchases.</p></div>
    <section className={styles.panel} aria-labelledby="active-access-heading"><div className={styles.row}><h2 id="active-access-heading">Active course access</h2><Link href="/courses/v2" prefetch={false}>Explore courses</Link></div>
      {access === null ? <div role="alert"><p>We couldn’t verify your access. Please retry; this is not a confirmation that your access has ended.</p><Link href="/account/access" prefetch={false}>Retry access check</Link></div> : access.length === 0 ? <div className={styles.empty}><h3>No active Phase 1 course access</h3><p>Existing batch enrollments remain available through your learning dashboard. Contact the programme team if you expected a new course purchase here.</p></div> : <ul className={styles.history}>{access.map((item) => <li key={item.product_code}><div className={styles.row}><h3>{v2ProductDisplayName(item.product_code)}</h3><span className={styles.badge}>Active</span></div><p>Subjects: {item.sections.map((section) => section === 'di' ? 'DI' : section[0].toUpperCase() + section.slice(1)).join(', ')}</p><p>Access ends {courseDate(item.expires_at)}</p></li>)}</ul>}
      <p>Access is checked again when you open protected content. Live-batch enrollment is separate from product access.</p><Link href="/dashboard" prefetch={false}>Return to my learning</Link>
    </section>
    <PurchaseHistory history={history} page={page} href="/account/access" />
  </main></div>;
}
