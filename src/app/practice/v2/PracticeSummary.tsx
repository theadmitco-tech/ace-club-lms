import Link from 'next/link';
import styles from './practice.module.css';

export type QuestionState = 'done' | 'review' | null;
export type SubjectProgress = { key: string; label: string; done: number; review: number; total: number };

/** A worksheet's questions drawn as an answer sheet: filled for done, amber for review, hollow for not yet logged. */
export function AnswerSheet({ cells, paused = false }: { cells: QuestionState[]; paused?: boolean }) {
  const done = cells.filter(c => c === 'done').length, review = cells.filter(c => c === 'review').length;
  return <span className={styles.sheet} data-paused={paused || undefined} role="img"
    aria-label={`${done} done, ${review} to review, ${cells.length - done - review} not logged, of ${cells.length} questions`}>
    {cells.map((state, index) => <span key={index} data-state={state ?? 'open'} />)}
  </span>;
}

/** Questions logged per subject, as a small table with a stacked bar for each subject. */
export function PracticeSummary({ subjects, reviewView }: { subjects: SubjectProgress[]; reviewView: boolean }) {
  return <table className={styles.subjects}>
    <caption className={styles.srOnly}>Questions logged by subject</caption>
    <thead><tr><th scope="col">Subject</th><th scope="col">Questions</th><th scope="col">Logged</th><th scope="col">To review</th></tr></thead>
    <tbody>{subjects.map(subject => {
      const share = (n: number) => `${subject.total ? (n / subject.total) * 100 : 0}%`;
      return <tr key={subject.key}>
        <th scope="row">{subject.label}</th>
        <td><span className={styles.stack} aria-hidden="true"><span data-state="done" style={{ width: share(subject.done) }} /><span data-state="review" style={{ width: share(subject.review) }} /></span></td>
        <td className={styles.num}>{subject.done + subject.review}<span> of {subject.total}</span></td>
        <td className={styles.num}>{subject.review ? reviewView ? subject.review : <Link href="/practice/v2?view=review" prefetch={false} aria-label={`${subject.review} ${subject.label} questions to review`}>{subject.review}</Link> : <span>None</span>}</td>
      </tr>;
    })}</tbody>
  </table>;
}

export type WorksheetRow = { href: string; title: string; sessionTitle: string; course: string; total: number; done: number; review: number; paused: boolean; cells: QuestionState[] };

/** The worksheets view: subject table, legend, and each subject's worksheets with their answer sheets. */
export function PracticeOverview({ subjects, groups, several }: { subjects: SubjectProgress[]; groups: { key: string; label: string; rows: WorksheetRow[] }[]; several: boolean }) {
  return <>
    <PracticeSummary subjects={subjects} reviewView={false} />
    <p className={styles.legend} aria-hidden="true"><span data-state="done" />Done<span data-state="review" />To review<span data-state="open" />Not logged</p>
    {groups.map(group => <section key={group.key} className={styles.group} aria-labelledby={`practice-${group.key}`}>
      <h2 id={`practice-${group.key}`}>{group.label}</h2>
      <ul className={styles.list}>{group.rows.map(row => {
        const started = row.done + row.review > 0;
        return <li key={row.href} data-paused={row.paused || undefined}>
          <div className={styles.text}>
            <strong>{row.title}</strong>
            <span>{several ? `${row.sessionTitle}, ${row.course}` : row.sessionTitle}</span>
          </div>
          <div className={styles.answers}>
            {row.paused ? <span className={styles.paused}>Opens again once you send your {group.label} feedback</span>
              : row.total ? <AnswerSheet cells={row.cells} /> : <span className={styles.muted}>No questions to log</span>}
          </div>
          <span className={styles.logged}>{row.paused || !row.total ? '' : `${row.done + row.review} / ${row.total}`}</span>
          {row.paused ? <span /> : <Link className={styles.open} href={row.href} prefetch={false} aria-label={`${started ? 'Continue' : 'Open'} ${row.title}`}>{started ? 'Continue' : 'Open'}</Link>}
        </li>;
      })}</ul>
    </section>)}
  </>;
}
