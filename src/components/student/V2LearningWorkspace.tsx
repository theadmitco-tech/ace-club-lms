'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { V2PublishedCourse } from '@/lib/v2StudentDelivery';
import type { V2LearningState, V2LearningObligation, V2FeedbackResponse, V2LearningProgress } from '@/lib/v2Learning';
import { V2CourseSessionView } from './V2CourseSessionView';
import styles from './v2Learning.module.css';
const sectionName = (value: string) => value === 'di' ? 'DI' : value === 'quant' ? 'Quant' : value === 'verbal' ? 'Verbal' : 'Programme';
const time = (value: string) => new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
async function saveLearning(body: Record<string, unknown>) {
  const response = await fetch('/api/v2/learning', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'The update could not be confirmed.');
  return result;
}
function FeedbackForm({ obligation, onSaved }: { obligation: V2LearningObligation; onSaved: () => void }) {
  const [usefulness, setUsefulness] = useState(''), [clarity, setClarity] = useState(''), [comment, setComment] = useState('');
  const [attendance, setAttendance] = useState<V2FeedbackResponse['attendance'] | ''>(obligation.source === 'recording' ? 'recording' : '');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const requestId = useRef<string | null>(null);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); requestId.current ??= crypto.randomUUID();
    try {
      const result = await saveLearning({ action: 'feedback', obligationId: obligation.id, requestId: requestId.current,
        response: { usefulness: attendance === 'missed' ? null : Number(usefulness), clarity: attendance === 'missed' ? null : Number(clarity), comment, attendance } });
      if (result.submitted !== true) throw new Error('Feedback confirmation is pending.');
      onSaved();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Feedback confirmation is pending.'); }
    finally { setBusy(false); }
  }
  function edit(callback: () => void) { requestId.current = null; callback(); }
  return <form onSubmit={submit} className={styles.feedbackForm} aria-label={`Feedback for ${obligation.sessionTitle}`}>
    <h3>{obligation.sessionTitle}</h3><p>{sectionName(obligation.section)} · {obligation.source === 'live' ? 'Completed live class' : 'Recording feedback'}</p>
    {obligation.source === 'live' && <fieldset disabled={busy}><legend>Did you attend this live class?</legend>
      <label><input type="radio" name={`attendance-${obligation.id}`} value="attended" checked={attendance === 'attended'} required onChange={() => edit(() => setAttendance('attended'))} />I attended</label>
      <label><input type="radio" name={`attendance-${obligation.id}`} value="missed" checked={attendance === 'missed'} required onChange={() => edit(() => setAttendance('missed'))} />I didn’t attend</label>
      <small>This is a self-report, not verified attendance. A missed class does not remove recording access.</small>
    </fieldset>}
    {attendance !== 'missed' && (['usefulness', 'clarity'] as const).map(field => <label className={styles.field} key={field}>
      {field === 'usefulness' ? 'How useful was this session?' : 'How clear was this session?'}
      <select required disabled={busy} value={field === 'usefulness' ? usefulness : clarity} onChange={event => edit(() => (field === 'usefulness' ? setUsefulness : setClarity)(event.target.value))}>
        <option value="">Choose a rating</option>{[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value} — {value === 1 ? 'Low' : value === 5 ? 'High' : 'Moderate'}</option>)}
      </select>
    </label>)}
    <label className={styles.field}>Anything to add? <span>Optional</span><textarea rows={3} maxLength={4000} disabled={busy} value={comment} onChange={event => edit(() => setComment(event.target.value))} /></label>
    {error && <p role="alert">{error}</p>}
    <button className={styles.primary} type="submit" disabled={busy}>{busy ? 'Confirming feedback…' : 'Send feedback'}</button>
    <small>Other pending feedback in the same subject remains due. The section unlocks after all applicable responses are confirmed.</small>
  </form>;
}
export function V2LearningWorkspace({ course, learning, initialView = 'recordings' }: { course: V2PublishedCourse; learning: V2LearningState; initialView?: 'recordings' | 'live' }) {
  const router = useRouter();
  const initial = learning.sessions.find(s => s.key === learning.lastSessionKey && !s.locked)?.key ?? learning.sessions.find(s => !s.locked)?.key ?? null;
  const [selected, setSelected] = useState<string | null>(initial), [tab, setTab] = useState<'recordings' | 'live'>(initialView);
  const [message, setMessage] = useState(''), [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [focus, setFocus] = useState(false), [largeText, setLargeText] = useState(false);
  const feedbackRef = useRef<HTMLElement>(null);
  const active = course.sessions.find(s => s.key === selected && learning.sessions.some(item => item.key === s.key && item.section === s.section && !item.locked));
  const feedbackSessions = Array.from(new Map(learning.obligations.map(item => [
    `${item.batchId}:${item.sessionKey}`, learning.obligations.find(other => other.batchId === item.batchId && other.sessionKey === item.sessionKey && other.source === 'live') ?? item,
  ])).values());
  const obligation = feedbackSessions.find(o => o.id === feedbackId);
  const last = learning.sessions.find(s => s.key === learning.lastSessionKey && !s.locked);
  useEffect(() => {
    if (!focus) return;
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setFocus(false); };
    window.addEventListener('keydown', escape); return () => window.removeEventListener('keydown', escape);
  }, [focus]);
  async function progress(sessionKey: string, itemKey: string | null, state: 'opened' | 'read') {
    try {
      await saveLearning({ action: 'progress', batchId: course.batchId, sessionKey, itemKey, state, publicationRevision: learning.publicationRevision });
      router.refresh();
    } catch { setMessage('The learning reminder could not be saved. Course access remains available; progress is not treated as completion.'); }
  }
  function select(key: string) {
    if (!learning.sessions.some(s => s.key === key && !s.locked)) return;
    setSelected(key); setTab('recordings'); setMessage(''); void progress(key, null, 'opened');
  }
  function showFeedback(item: V2LearningObligation) {
    const current = feedbackSessions.find(other => other.batchId === item.batchId && other.sessionKey === item.sessionKey) ?? item;
    setFeedbackId(current.id); setFocus(false);
    requestAnimationFrame(() => { feedbackRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }); feedbackRef.current?.focus(); });
  }
  function feedbackSaved() { setFeedbackId(null); setMessage('Feedback confirmed. The latest subject access is being loaded.'); router.refresh(); }
  return <div className={`${styles.workspace} ${focus ? styles.focus : ''} ${largeText ? styles.large : ''}`}>
    <div className={styles.toolbar}><div className={styles.tabs} aria-label="Learning routes">
      <button className={tab === 'recordings' ? styles.activeTab : ''} type="button" aria-pressed={tab === 'recordings'} onClick={() => setTab('recordings')}>Recordings & materials</button>
      <button className={tab === 'live' ? styles.activeTab : ''} type="button" aria-pressed={tab === 'live'} onClick={() => setTab('live')}>Live classes</button>
    </div><div className={styles.preferences}><button type="button" aria-pressed={largeText} onClick={() => setLargeText(!largeText)}>Larger text</button><button type="button" aria-pressed={focus} onClick={() => setFocus(!focus)}>{focus ? 'Exit focus' : 'Focus mode'}</button></div></div>
    {message && <p role="status" className={styles.notice}>{message}</p>}
    {learning.obligations.length > 0 && <section className={styles.gate} aria-labelledby="feedback-due-heading"><span className={styles.gateIcon} aria-hidden="true">↗</span><div>
      <h2 id="feedback-due-heading">A quick reflection before the next session</h2><p>Feedback is due in {Array.from(new Set(learning.obligations.map(o => sectionName(o.section)))).join(', ')}. Current feedback sessions remain open; other purchased subjects are available.</p>
      <ul>{feedbackSessions.map(item => <li key={item.id}><button type="button" onClick={() => showFeedback(item)}>Give feedback for {item.sessionTitle}</button></li>)}</ul>
    </div></section>}
    {obligation && <section tabIndex={-1} ref={feedbackRef} className={styles.feedbackPanel} aria-label="Required session feedback"><div className={styles.row}><h2>Session feedback</h2><button type="button" onClick={() => setFeedbackId(null)}>Close feedback</button></div><FeedbackForm key={obligation.id} obligation={obligation} onSaved={feedbackSaved} /></section>}
    {tab === 'recordings' ? <>
      {!focus && last && <section className={styles.resume}><div><span>● LAST OPENED SESSION</span><h2>Pick up where you left off</h2><p>{last.title}</p><small>A learning reminder, not a completion or attendance record.</small></div><button type="button" className={styles.primary} onClick={() => select(last.key)}>Resume session</button></section>}
      <div className={styles.layout}>
        <aside className={styles.outline} aria-label="Course outline"><h2>Course outline</h2><p>Choose any available session, in any order.</p>
          <ol>{learning.sessions.map(item => { const visited = learning.progress.some(p => p.sessionKey === item.key); return <li key={item.key} className={`${item.locked ? styles.locked : ''} ${item.key === selected ? styles.current : ''}`}>
            <button type="button" disabled={item.locked} aria-current={item.key === selected ? 'step' : undefined} aria-label={`Open ${item.title}`} onClick={() => select(item.key)}><span>{sectionName(item.section)}</span><strong>{item.title}</strong><small>{item.locked ? 'Feedback due in this subject' : learning.obligations.some(o => o.batchId === course.batchId && o.sessionKey === item.key) ? 'Current feedback session · accessible' : visited ? 'Previously opened' : 'Ready to explore'}</small></button>
          </li>; })}</ol>
        </aside>
        <section className={styles.content} aria-label="Selected session">
          {active ? <V2CourseSessionView session={active} mode="student" batchId={course.batchId}
            readingEndpoint={`/api/v2/course-reading?batchId=${course.batchId}&sessionKey=${active.key}`}
            learning={{ publicationRevision: learning.publicationRevision, feedbackTracking: active.section !== 'programme', progress: learning.progress.filter(p => p.sessionKey === active.key),
              onProgress: (itemKey, state) => progress(active.key, itemKey, state), onFeedbackDue: () => router.refresh() }} />
            : <div className={styles.empty}><h2>{selected ? 'This session is currently locked' : 'Choose a session to begin'}</h2><p>{selected ? 'Complete the pending feedback for this subject. The current feedback session and other entitled subjects remain available.' : 'The outline is always available. Published resources appear when an accessible session is selected.'}</p></div>}
        </section>
      </div>
    </> : <section className={styles.livePanel} aria-labelledby="live-classes-heading"><h2 id="live-classes-heading">Your live classes</h2>
      {!learning.liveRegistered ? <div className={styles.empty}><h3>Live registration is separate</h3><p>Live-session details and meeting links are available to eligible registered students. Recordings and course materials remain available with active course access.</p><Link href="/account/access">Review course access</Link></div>
        : !learning.liveEvents.length ? <div className={styles.empty}><p>No live classes are published for this batch. The recording route is available independently.</p></div>
          : <ol className={styles.liveList}>{learning.liveEvents.map(event => { const locked = event.sessionKey !== null && learning.sessions.some(s => s.key === event.sessionKey && s.locked); const due = learning.obligations.find(o => o.eventKey === event.key && o.batchId === course.batchId); return <li key={event.key}><span className={styles.label}>{sectionName(event.section)} · {event.completedAt ? 'Class completed' : 'Live class'}</span><h3>{event.title}</h3><p>{time(event.startsAt)} – {time(event.endsAt)} IST</p>
            {event.completedAt ? <p>Watching the recording is optional. A missed class can be reported through its feedback without claiming attendance.</p> : locked ? <p>Complete the pending feedback in this subject before opening another session.</p> : <Link className={styles.primary} href={`/schedule/v2/${course.batchId}/live/${event.key}`} prefetch={false}>Open live class</Link>}
            {due && <button className={styles.secondary} type="button" onClick={() => showFeedback(due)}>Give feedback or report a missed class</button>}
            {event.sessionKey && !locked && <button className={styles.secondary} type="button" onClick={() => select(event.sessionKey!)}>Open session materials</button>}
          </li>; })}</ol>}
    </section>}
  </div>;
}
export type V2ResourceLearning = {
  publicationRevision: number; feedbackTracking?: boolean; progress: V2LearningProgress[];
  onProgress: (itemKey: string, state: 'opened' | 'read') => Promise<void>;
  onFeedbackDue: () => void;
};
