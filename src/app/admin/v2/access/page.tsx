import { AdminDraftLink as Link } from '@/components/AdminDraftNavigation';
import { notFound } from 'next/navigation';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { isV2Phase1PreviewEnabled } from '@/lib/server/v2Phase1Feature';
import { historyPage, loadCourseCatalogue, loadPurchaseHistory } from '@/lib/server/v2CourseWorkspace';
import { courseMoney } from '@/lib/v2CoursePresentation';
import { PurchaseHistory } from '@/components/courses/PurchaseHistory';
import styles from '@/components/courses/courses.module.css';

export const dynamic = 'force-dynamic';
export default async function AdminCourseAccessPage({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }) {
  if (!isV2Phase1PreviewEnabled()) notFound();
  await requirePortalRole('admin');
  const page = historyPage((await searchParams).page);
  const [catalogue, history] = await Promise.all([loadCourseCatalogue(), loadPurchaseHistory('admin', page)]);
  return <div><h1 className="admin-page-title">Products &amp; access</h1><p className="admin-page-subtitle">Review current course prices and confirmed purchase records. Access changes only through the verified payment process.</p>
    <section className={styles.panel}><div className={styles.row}><h2>Course catalogue</h2><Link href="/courses/v2" prefetch={false}>Open catalogue and package prices</Link></div>
      {catalogue === null ? <p role="alert">The catalogue could not be loaded. Reload this page to retry.</p> : catalogue.length === 0 ? <p>No offerings are currently open for selection.</p> : <ul className={styles.history}>{catalogue.map((product) => <li key={product.code}><div className={styles.row}><h3>{product.name}</h3><strong>{product.amountPaise === null ? 'Price unavailable' : courseMoney(product.amountPaise)}</strong></div><p>{product.sections.join(' · ').toUpperCase()} · Six calendar months from confirmed payment</p></li>)}</ul>}
      <p>Catalogue availability does not revoke existing access. Historical purchase prices and expiry dates are preserved.</p>
    </section><PurchaseHistory history={history} page={page} href="/admin/v2/access" admin />
  </div>;
}
