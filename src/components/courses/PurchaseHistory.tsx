import Link from 'next/link';
import type { PurchaseHistory as History } from '@/lib/server/v2CourseWorkspace';
import { courseDay, courseMoney, courseNames, purchaseState } from '@/lib/v2CoursePresentation';
import styles from './courses.module.css';

export function PurchaseHistory({ history, page, href, admin = false }: { history: History; page: number; href: string; admin?: boolean }) {
  return <section className={styles.panel} aria-labelledby="purchase-history-heading">
    <h2 id="purchase-history-heading">{admin ? 'Purchase and access records' : 'Purchase history'}</h2>
    <p>Every confirmed purchase stays listed here with its price and dates, even after access ends.</p>
    {history.status !== 'ready' ? <div role="alert" className={styles.notice}><p>Purchase history could not be loaded. This does not mean there are no purchases.</p><Link href={`${href}?page=${page}`} prefetch={false}>Retry history</Link></div> : <>
      {history.items.length === 0 ? <p className={styles.empty}>{page === 1 ? 'No purchases are recorded here yet.' : 'No more purchases on this page.'}</p> : <ul className={styles.history}>
        {history.items.map((item) => <li key={item.id}>
          <div className={styles.row}><div>{admin && <p>{item.studentName}</p>}<h3>{courseNames(item.products)}</h3></div><span className={`${styles.badge} ${purchaseState(item, history.checkedAt) !== 'Active' ? styles.badgeInactive : ''}`}>{purchaseState(item, history.checkedAt)}</span></div>
          <p className={styles.historyLine}>{courseMoney(item.amount_paise)}<span aria-hidden="true"> · </span>Paid {courseDay(item.confirmed_at)}{purchaseState(item, history.checkedAt) === 'Revoked' ? null : <><span aria-hidden="true"> · </span>{purchaseState(item, history.checkedAt) === 'Expired' ? 'Ended' : 'Ends'} {courseDay(item.expires_at)}</>}</p>
        </li>)}
      </ul>}
      {(page > 1 || history.hasMore) && <nav className={styles.row} aria-label="Purchase history pages">{page > 1 && <Link href={`${href}?page=${page - 1}`} prefetch={false}>Previous page</Link>}<span>Page {page}</span>{history.hasMore && <Link href={`${href}?page=${page + 1}`} prefetch={false}>Next page</Link>}</nav>}
    </>}
  </section>;
}
