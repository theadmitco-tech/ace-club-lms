import Link from 'next/link';
import type { SalesBatch } from '@/lib/v2Checkout';
import { courseNames } from '@/lib/v2CoursePresentation';
import styles from './courses.module.css';
const ist = (date: string) => new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date));
export function SalesOutlines({ batches, availability }: { batches: SalesBatch[]; availability: { batchId: string; placesRemaining: number }[] }) {
  return <section className={styles.panel} aria-labelledby="published-courses"><h2 id="published-courses">Explore the published curriculum</h2>
    <p>Six months of course access from verified payment. Live registration is included when a place is available; each batch has eight places.</p>
    {!batches.length && <p>No published courses are currently open for registration.</p>}
    {batches.map(batch => <article key={batch.batchId} className={styles.offering}>
      <h3>{courseNames([batch.entitlementProductCode])} · {batch.title}</h3>
      <p>{batch.sessions.length} sessions · {batch.events.length ? `${availability.find(a => a.batchId === batch.batchId)?.placesRemaining ?? 0} live places available` : 'Recording library — no live schedule published'}</p>
      <details><summary>Course outline and schedule</summary><ol>{batch.sessions.map(s => <li key={s.key}>{s.title}</li>)}</ol>
        {batch.events.length > 0 && <ul>{batch.events.map(e => <li key={e.key}>{e.title} · {ist(e.startsAt)} IST</li>)}</ul>}
      </details>
      <Link href="/courses/v2/checkout" className={styles.button}>Choose a package</Link>
    </article>)}
  </section>;
}
