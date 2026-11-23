import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { isV2Phase1PreviewEnabled } from '@/lib/server/v2Phase1Feature';
import { getMyV2Access } from '@/lib/server/v2Products';
import { historyPage, loadPurchaseHistory } from '@/lib/server/v2CourseWorkspace';
import { v2ProductDisplayName } from '@/lib/v2Products';
import { courseDay, courseNames, purchaseState } from '@/lib/v2CoursePresentation';
import { requestTime } from '@/lib/server/studentProfile';
import page from './myAccess.module.css';
import { PurchaseHistory } from '@/components/courses/PurchaseHistory';
import { StudentHeader } from '@/components/student/StudentHeader';
import { createClient } from '@/utils/supabase/server';
import previewStyles from '@/components/student/studentPreview.module.css';
import '@/app/dashboard/dashboard.css';

export const dynamic = 'force-dynamic';
export default async function MyAccessPage({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }) {
  if (!isV2Phase1PreviewEnabled()) notFound();
  const identity = await requirePortalRole('student');
  const pageNumber = historyPage((await searchParams).page);
  const supabase = await createClient();
  const [access, history, profile] = await Promise.all([
    getMyV2Access().catch(() => null), loadPurchaseHistory('student', pageNumber),
    supabase.from('profiles').select('full_name').eq('id', identity.id).maybeSingle(),
  ]);
  const expiredPurchases = history.status === 'ready' ? history.items.filter((item) => purchaseState(item, history.checkedAt) === 'Expired') : [];
  const now = requestTime();
  const owned = new Set((access ?? []).flatMap(item => item.sections));
  const fullCourse = (access ?? []).some(item => item.product_code === 'full_batch');
  const missing = (['quant', 'verbal', 'di'] as const).filter(section => !owned.has(section)).map(section => section === 'di' ? 'DI' : section[0].toUpperCase() + section.slice(1));
  const daysLeft = (value: string) => Math.max(0, Math.ceil((Date.parse(value) - now) / 86400000));
  return <div className={`student-page ${previewStyles.preview}`}><StudentHeader studentName={profile.data?.full_name?.trim() || 'Student'} /><main className={page.main}>
    <header className={page.intro}><h1>My access</h1><p>What you’ve bought and how long it lasts.</p></header>
    {access !== null && access.length === 0 && expiredPurchases.length > 0 && <section className={page.notice} aria-labelledby="expiry-heading"><h2 id="expiry-heading">An earlier course purchase has expired</h2><p>{courseNames(expiredPurchases[0].products)} access ended {courseDay(expiredPurchases[0].expires_at)}. Its details stay in your purchase history below.</p></section>}
    <section className={page.panel} aria-labelledby="active-access-heading">
      <h2 id="active-access-heading" className={page.sectionTitle}>Active course access</h2>
      {access === null ? <div role="alert" className={page.alert}><p>We couldn’t check your access just now. This doesn’t mean it has ended.</p><Link href="/account/access" prefetch={false}>Retry access check</Link></div>
        : access.length === 0 ? <div className={page.empty}><h3>No active course purchase</h3><p>When you buy a course, it appears here with its end date. Contact the programme team if you expected to see one.</p><Link className={page.primary} href="/courses/v2" prefetch={false}>Explore courses</Link></div>
        : <ul className={page.cards}>{access.map(item => { const left = daysLeft(item.expires_at); const ending = left <= 30; return <li key={item.product_code} data-ending={ending || undefined}>
          <div className={page.cardHead}><h3>{v2ProductDisplayName(item.product_code)}</h3><span className={page.badge} data-tone={ending ? 'warn' : undefined}>{ending ? `${left} ${left === 1 ? 'day' : 'days'} left` : 'Active'}</span></div>
          {item.sections.length > 1 && <p className={page.includes}>Includes {item.sections.map(section => section === 'di' ? 'DI' : section[0].toUpperCase() + section.slice(1)).join(', ').replace(/, ([^,]*)$/, ' and $1')}</p>}
          <p className={page.until}>Until <strong>{courseDay(item.expires_at)}</strong>{!ending && <span> · {left} days left</span>}</p>
        </li>; })}</ul>}
      {!!access?.length && <Link className={page.primary} href="/schedule/v2" prefetch={false}>Go to my learning</Link>}
    </section>
    {!!access?.length && !fullCourse && missing.length > 0 && <section className={page.upgrade} aria-labelledby="upgrade-heading">
      <div><h2 id="upgrade-heading">Add {missing.join(' or ')}</h2><p>Add more subjects to your package. You pay only the price difference, and your access end date stays the same.</p></div>
      <Link className={page.secondary} href="/account/access/upgrade" prefetch={false}>See upgrade options</Link>
    </section>}
    <PurchaseHistory history={history} page={pageNumber} href="/account/access" />
  </main></div>;
}
