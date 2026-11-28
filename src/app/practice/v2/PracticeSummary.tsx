import Link from 'next/link';
import styles from './practice.module.css';

export type QuestionState = 'done' | 'review' | null;
export type WorksheetRow = { href: string; title: string; sessionTitle: string; course: string; total: number; done: number; review: number; paused: boolean; cells: QuestionState[]; lastActivity: string | null };

const STATE_NAME = { done: 'done', review: 'to review', open: 'not logged' } as const;

/** A worksheet's questions drawn as an answer sheet, in blocks of five like a printed OMR sheet. */
export function AnswerSheet({ cells }: { cells: QuestionState[] }) {
  const done = cells.filter(c => c === 'done').length, review = cells.filter(c => c === 'review').length;
  const blocks = Array.from({ length: Math.ceil(cells.length / 5) }, (_, b) => cells.slice(b * 5, b * 5 + 5));
  return <span className={styles.sheet} role="img" aria-label={`${done} done, ${review} to review, ${cells.length - done - review} not logged, of ${cells.length} questions`}>
    {blocks.map((block, b) => <span key={b} className={styles.block}>
      {block.map((state, i) => <span key={i} data-state={state ?? 'open'} title={`Question ${b * 5 + i + 1}: ${STATE_NAME[state ?? 'open']}`} />)}
    </span>)}
  </span>;
}

/** Key for the answer-sheet marks, shown once beside the view tabs. */
export function SheetLegend() {
  return <p className={styles.legend} aria-hidden="true"><span><i data-state="done" />Done</span><span><i data-state="review" />To review</span><span><i data-state="open" />Not logged</span></p>;
}

/** The worksheets view: each subject's totals in its heading row, then its worksheets as answer sheets. */
export function PracticeOverview({ groups, several }: { groups: { key: string; label: string; rows: WorksheetRow[] }[]; several: boolean }) {
  // The worksheet touched most recently and not yet finished is where the student picks up.
  const resume = groups.flatMap(g => g.rows).filter(r => !r.paused && r.lastActivity && r.done + r.review < r.total)
    .toSorted((a, b) => Date.parse(b.lastActivity!) - Date.parse(a.lastActivity!))[0]?.href;
  return <>{groups.map(group => {
    const total = group.rows.reduce((n, r) => n + r.total, 0), done = group.rows.reduce((n, r) => n + r.done, 0), review = group.rows.reduce((n, r) => n + r.review, 0);
    const share = (n: number) => `${total ? (n / total) * 100 : 0}%`;
    return <section key={group.key} className={styles.group} aria-labelledby={`practice-${group.key}`}>
      <header className={styles.groupHead}>
        <h2 id={`practice-${group.key}`}>{group.label}</h2>
        <span className={styles.stack} aria-hidden="true"><span data-state="done" style={{ width: share(done) }} /><span data-state="review" style={{ width: share(review) }} /></span>
        <span className={styles.groupCount}><strong>{done + review}</strong> of {total} logged</span>
        <span className={styles.groupReview}>{review ? <Link href="/practice/v2?view=review" prefetch={false}>{review} to review</Link> : 'Nothing to review'}</span>
      </header>
      <ul className={styles.list}>{group.rows.map(row => {
        const started = row.done + row.review > 0, label = started ? 'Continue' : 'Open';
        return <li key={row.href} data-paused={row.paused || undefined}>
          <div className={styles.text}>
            <strong>{row.title}</strong>
            <span>{several ? `${row.sessionTitle}, ${row.course}` : row.sessionTitle}</span>
          </div>
          <div className={styles.answers}>
            {row.paused ? <span className={styles.paused}>Opens again once you send your {group.label} feedback</span>
              : row.total ? <AnswerSheet cells={row.cells} /> : <span className={styles.muted}>No questions to log</span>}
          </div>
          <span className={styles.logged}>{row.paused || !row.total ? '' : `${row.done + row.review}/${row.total}`}</span>
          {row.paused ? <span /> : <Link className={row.href === resume ? styles.resume : styles.open} href={row.href} prefetch={false} aria-label={`${label} ${row.title}`}>{label}</Link>}
        </li>;
      })}</ul>
    </section>;
  })}</>;
}
