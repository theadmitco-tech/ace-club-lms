'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import styles from './practice.module.css';

export type ReviewQuestion = { id: string; number: number; comment: string | null; seconds: number | null; updatedAt: string | null };
export type ReviewWorksheet = { key: string; href: string; title: string; sessionTitle: string; section: string; batchId: string; sessionKey: string; itemKey: string; questions: ReviewQuestion[] };

const SUBJECTS: Record<string, string> = { quant: 'Quant', verbal: 'Verbal', di: 'DI' };
const without = <T,>(record: Record<string, T>, key: string) => Object.fromEntries(Object.entries(record).filter(([k]) => k !== key));
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
const day = (value: string) => new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(value));

/** Questions the student marked for review, by worksheet, with a one-tap way to clear each one. */
export function ReviewList({ worksheets }: { worksheets: ReviewWorksheet[] }) {
  const [cleared, setCleared] = useState<Record<string, 'saving' | 'done'>>({});
  const [failed, setFailed] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [lastCleared, setLastCleared] = useState<{ sheet: ReviewWorksheet; question: ReviewQuestion } | null>(null);

  const open = useMemo(() => worksheets.map(sheet => ({ ...sheet, questions: sheet.questions.filter(q => cleared[q.id] !== 'done') })).filter(sheet => sheet.questions.length), [worksheets, cleared]);
  const counts = useMemo(() => Object.fromEntries(Object.keys(SUBJECTS).map(key => [key, open.filter(s => s.section === key).reduce((n, s) => n + s.questions.length, 0)])), [open]);
  const total = Object.values(counts).reduce((n, c) => n + c, 0);
  const shown = filter === 'all' ? open : open.filter(sheet => sheet.section === filter);

  async function save(sheet: ReviewWorksheet, question: ReviewQuestion, status: 'done' | 'review') {
    const { data, error } = await createClient().rpc('update_my_v2_worksheet_log', {
      p_batch_id: sheet.batchId, p_session_key: sheet.sessionKey, p_item_key: sheet.itemKey, p_question_id: question.id,
      p_status: status, p_time_taken_seconds: question.seconds, p_comment: question.comment,
    });
    return !error && !!data;
  }
  async function markDone(sheet: ReviewWorksheet, question: ReviewQuestion) {
    setFailed(null); setCleared(current => ({ ...current, [question.id]: 'saving' }));
    if (await save(sheet, question, 'done')) { setCleared(current => ({ ...current, [question.id]: 'done' })); setLastCleared({ sheet, question }); }
    else { setCleared(current => without(current, question.id)); setFailed(`Question ${question.number} couldn’t be updated. Please try again.`); }
  }
  async function undo() {
    if (!lastCleared) return;
    const { sheet, question } = lastCleared;
    setLastCleared(null);
    if (await save(sheet, question, 'review')) setCleared(current => without(current, question.id));
    else setFailed(`Question ${question.number} couldn’t be put back. It is still marked done.`);
  }

  return <div className={styles.review}>
    <div className={styles.filters} role="group" aria-label="Filter by subject">
      {[['all', 'All', total] as const, ...Object.entries(SUBJECTS).filter(([key]) => counts[key] > 0 || filter === key).map(([key, label]) => [key, label, counts[key]] as const)].map(([key, label, count]) =>
        <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}<span>{count}</span></button>)}
    </div>
    <div className={styles.toastArea} aria-live="polite">
      {lastCleared && <p className={styles.toast}>Question {lastCleared.question.number} marked done. <button type="button" onClick={() => void undo()}>Undo</button></p>}
      {failed && <p className={styles.toastError} role="alert">{failed}</p>}
    </div>
    {!shown.length ? <section className={styles.reviewEmpty}>
      <span aria-hidden="true">✓</span>
      <h2>{worksheets.length ? 'All caught up' : 'Nothing to review yet'}</h2>
      <p>{worksheets.length ? 'Every question you marked for review has been cleared. Nice work.' : 'While working through a worksheet, mark a question “Review” in its log. It will be collected here so you can come back to it.'}</p>
    </section>
      : <ul className={styles.sheets}>{shown.map(sheet => <li key={sheet.key} className={styles.sheet}>
        <header>
          <div><span className={styles.sheetSubject}>{SUBJECTS[sheet.section] ?? 'Course'}</span><h3>{sheet.title}</h3><p>{sheet.sessionTitle}</p></div>
          <Link className={styles.sheetLink} href={sheet.href} prefetch={false}>Open worksheet <span aria-hidden="true">→</span></Link>
        </header>
        <ol className={styles.questions}>{sheet.questions.map(question => <li key={question.id} data-saving={cleared[question.id] === 'saving' || undefined}>
          <span className={styles.qNumber} aria-label={`Question ${question.number}`}>Q{question.number}</span>
          <div className={styles.qBody}>
            {question.comment ? <p className={styles.qNote}>{question.comment}</p> : <p className={styles.qNoNote}>No note added</p>}
            <p className={styles.qMeta}>{[question.seconds !== null ? `Took ${clock(question.seconds)}` : null, question.updatedAt ? `Marked ${day(question.updatedAt)}` : null].filter(Boolean).join(' · ')}</p>
          </div>
          <button type="button" className={styles.qDone} disabled={cleared[question.id] === 'saving'} aria-label={`Mark question ${question.number} of ${sheet.title} done`} onClick={() => void markDone(sheet, question)}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
            {cleared[question.id] === 'saving' ? 'Saving…' : 'Mark done'}
          </button>
        </li>)}</ol>
      </li>)}</ul>}
  </div>;
}
