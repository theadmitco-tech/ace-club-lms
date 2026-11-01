import Link from 'next/link';
import type { PurchaseHistory as History } from '@/lib/server/v2CourseWorkspace';
import { courseDate, courseMoney, courseNames, purchaseState } from '@/lib/v2CoursePresentation';
import styles from './courses.module.css';

export function PurchaseHistory({ history, page, href, admin = false }: { history: History; page: number; href: string; admin?: boolean }) {
  return <section className={styles.panel} aria-labelledby="purchase-history-heading">
    <h2 id="purchase-history-heading">{admin ? 'Purchase and access records' : 'Purchase history'}</h2>
    <p>Confirmed purchases retain their original price and expiry, including after access ends. All dates are shown in IST.</p>
    {history.status !== 'ready' ? <div role="alert" className={styles.notice}><p>Purchase history could not be loaded. This does not mean there are no purchases.</p><Link href={`${href}?page=${page}`} prefetch={false}>Retry history</Link></div> : <>
      {history.items.length === 0 ? <p className={styles.empty}>{page === 1 ? 'No purchases are recorded here yet.' : 'No more purchases on this page.'}</p> : <ul className={styles.history}>
        {history.items.map((item) => <li key={item.id}>
          <div className={styles.row}><div>{admin && <p>{item.studentName}</p>}<h3>{courseNames(item.products)}</h3></div><span className={`${styles.badge} ${purchaseState(item, history.checkedAt) !== 'Active' ? styles.badgeInactive : ''}`}>{purchaseState(item, history.checkedAt)}</span></div>
          <dl className={styles.facts}><div><dt>Paid</dt><dd>{courseMoney(item.amount_paise)}</dd></div><div><dt>Payment confirmed</dt><dd>{courseDate(item.confirmed_at)}</dd></div><div><dt>Access ends</dt><dd>{courseDate(item.expires_at)}</dd></div></dl>
        </li>)}
      </ul>}
      {(page > 1 || history.hasMore) && <nav className={styles.row} aria-label="Purchase history pages">{page > 1 && <Link href={`${href}?page=${page - 1}`} prefetch={false}>Previous page</Link>}<span>Page {page}</span>{history.hasMore && <Link href={`${href}?page=${page + 1}`} prefetch={false}>Next page</Link>}</nav>}
    </>}
  </section>;
}
