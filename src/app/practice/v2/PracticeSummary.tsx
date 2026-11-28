import Link from 'next/link';
import styles from './practice.module.css';

const RING = 2 * Math.PI * 34;

/** The student's practice at a glance: overall progress, worksheets started, questions done and to review. */
export function PracticeSummary({ worksheets, started, done, review, questions, reviewView }: { worksheets: number; started: number; done: number; review: number; questions: number; reviewView: boolean }) {
  const logged = done + review;
  const percent = questions ? Math.round((logged / questions) * 100) : 0;
  return <section className={styles.summary} aria-label="Your practice so far">
    <div className={styles.overall}>
      <svg className={styles.ring} viewBox="0 0 80 80" aria-hidden="true">
        <circle cx="40" cy="40" r="34" className={styles.ringTrack} />
        <circle cx="40" cy="40" r="34" className={styles.ringValue} strokeDasharray={RING} strokeDashoffset={RING * (1 - percent / 100)} />
      </svg>
      <div><strong>{percent}%</strong><span>{questions ? `${logged} of ${questions} questions logged` : 'No questions to log yet'}</span></div>
    </div>
    <div className={styles.stat}>
      <span className={styles.statLabel}>Worksheets started</span>
      <strong>{started}<small> / {worksheets}</small></strong>
      <span className={styles.miniBar} aria-hidden="true"><span style={{ width: `${worksheets ? Math.round((started / worksheets) * 100) : 0}%` }} /></span>
    </div>
    <div className={styles.stat}>
      <span className={styles.statLabel}><span className={styles.dotDone} aria-hidden="true">✓</span>Questions done</span>
      <strong>{done}</strong>
      <span className={styles.statHint}>{done ? 'Solved and logged' : 'Mark questions Done as you go'}</span>
    </div>
    <div className={`${styles.stat} ${styles.statReview}`} data-empty={!review || undefined}>
      <span className={styles.statLabel}><span className={styles.dotReview} aria-hidden="true"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></svg></span>To review</span>
      <strong>{review}</strong>
      {review > 0 && !reviewView ? <Link className={styles.statLink} href="/practice/v2?view=review" prefetch={false}>Review now <span aria-hidden="true">→</span></Link>
        : <span className={styles.statHint}>{review ? 'Listed below' : 'Nothing waiting'}</span>}
    </div>
  </section>;
}
