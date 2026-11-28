import Link from 'next/link';
import styles from './practice.module.css';

/** The student's practice in one plain sentence, with a hairline bar for questions logged. */
export function PracticeSummary({ worksheets, started, done, review, questions, reviewView }: { worksheets: number; started: number; done: number; review: number; questions: number; reviewView: boolean }) {
  const logged = done + review;
  const percent = questions ? Math.round((logged / questions) * 100) : 0;
  return <section className={styles.summary} aria-label="Your practice so far">
    <p>
      You’ve started <strong>{started} of {worksheets}</strong> worksheet{worksheets === 1 ? '' : 's'} and logged <strong>{logged} of {questions}</strong> questions.
      {review > 0 && <> {reviewView ? <><strong>{review}</strong> {review === 1 ? 'is' : 'are'} marked for review.</>
        : <Link href="/practice/v2?view=review" prefetch={false}>{review} {review === 1 ? 'is' : 'are'} waiting for review</Link>}{reviewView ? '' : '.'}</>}
    </p>
    <div className={styles.track} role="img" aria-label={`${percent}% of questions logged`}><span style={{ width: `${percent}%` }} /></div>
  </section>;
}
