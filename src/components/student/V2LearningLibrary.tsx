import Link from 'next/link';
import type { V2Publication } from '@/lib/v2Publications';
import type { V2LearningState } from '@/lib/v2Learning';
import { V2_TEMPLATE_PRODUCTS } from '@/lib/v2Templates';
import styles from './v2Learning.module.css';
export function V2LearningLibrary({ batches }: { batches: { publication: V2Publication; learning: V2LearningState | null }[] }) {
  return <div className={styles.workspace}><header className="student-intro"><div><span className="student-eyebrow">Your learning library</span><h1>Make room for your next idea.</h1><p>Explore recordings at your own pace, join registered live classes, or combine both.</p></div></header>
    {!batches.length ? <section className={styles.empty}><h2>No active published courses yet</h2><p>A course appears here when access is active, enrollment is confirmed and its content is published. Expired purchases remain in My access.</p><div className={styles.row}><Link className={styles.primary} href="/account/access">Review access and expiry</Link><Link href="/courses/v2">Explore courses</Link></div></section> : <div className={styles.library}>{batches.map(({ publication: batch, learning }) => {
      const last = learning?.sessions.find(s => s.key === learning.lastSessionKey && !s.locked);
      return <article key={batch.batchId} className={styles.libraryCard}><span className={styles.label}>{V2_TEMPLATE_PRODUCTS[batch.productCode].label}</span><h2>{batch.title}</h2><p>{batch.sessions?.length ?? 0} published sessions · recordings and materials</p>
        {learning ? <>{last && <p className={styles.notice}><strong>Pick up where you left off</strong><br />{last.title}</p>}{learning.obligations.length > 0 && <p>Feedback is due in this learning journey. Current feedback sessions stay accessible.</p>}<div className={styles.row}><Link className={styles.primary} href={`/schedule/v2/${batch.batchId}`} prefetch={false}>{last ? 'Continue learning' : 'Explore sessions'}</Link>{learning.liveRegistered && <Link href={`/schedule/v2/${batch.batchId}?view=live`} prefetch={false}>Live classes</Link>}</div></> : <p role="alert">Learning status could not be verified. Reload the library before opening protected content.</p>}
      </article>;
    })}</div>}
    <section className={styles.notice}><p>Session order is flexible. A pending feedback response only restricts its subject; live attendance is optional. The <Link href="/dashboard">existing dashboard and mocks</Link> remain available.</p></section>
  </div>;
}
