import Link from 'next/link';
import type { SalesBatch } from '@/lib/v2Checkout';
import { courseNames } from '@/lib/v2CoursePresentation';
import styles from './catalogue.module.css';
const ist = (date: string) => new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date));
export function SalesOutlines({ batches, availability, renderedAt }: { batches: SalesBatch[]; availability: { batchId: string; placesRemaining: number }[]; renderedAt: number }) {
  return <section className={styles.batches} aria-labelledby="published-courses">
    <h2 id="published-courses">Published schedule</h2>
    <p>Class dates for every open batch. Each batch has eight live seats, included at no extra cost while seats last.</p>
    {!batches.length ? <p className={styles.muted}>No batches are open for registration right now.</p> : <ul>{batches.map(batch => {
      const upcoming = batch.events.some(event => Date.parse(event.endsAt) > renderedAt);
      const seats = availability.find(a => a.batchId === batch.batchId)?.placesRemaining ?? 0;
      return <li key={batch.batchId}>
        <div className={styles.batchHead}><span className={styles.subject}>{courseNames([batch.entitlementProductCode])}</span><h3>{batch.title}</h3></div>
        <p>{batch.sessions.length} sessions · {upcoming ? (seats ? `${seats} of 8 live seats left` : 'Live seats full · recordings included') : 'Recording library — no upcoming live classes'}</p>
        <details open={batch.events.length > 0 && batches.length <= 4}><summary>Course outline and class dates</summary><ol>{batch.sessions.map(s => <li key={s.key}>{s.title}</li>)}</ol>
          {batch.events.length > 0 && <ul>{batch.events.map(e => <li key={e.key}>{e.title} · {ist(e.startsAt)} IST</li>)}</ul>}
        </details>
      </li>;
    })}</ul>}
    {batches.length > 0 && <Link href="/courses/v2/checkout" className={styles.primary}>Register</Link>}
  </section>;
}
