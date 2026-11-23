'use client';

import Link from 'next/link';
import { courseReadmePosition, withCourseReadmes, pinCourseReadmes } from '@/lib/v2CourseReadmes';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { V2PublishedCourse } from '@/lib/v2StudentDelivery';
import type { V2LearningState, V2LearningObligation, V2FeedbackResponse, V2LearningProgress } from '@/lib/v2Learning';
import type { ContentPlacementView } from '@/lib/v2ContentPublishing';
import { V2CourseSessionView, V2PlacedReadings } from './V2CourseSessionView';
import styles from './v2Learning.module.css';
const sectionName = (value: string) => value === 'di' ? 'DI' : value === 'quant' ? 'Quant' : value === 'verbal' ? 'Verbal' : 'Programme';
const time = (value: string) => new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
async function saveLearning(body: Record<string, unknown>) {
  const response = await fetch('/api/v2/learning', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'The update could not be confirmed.');
  return result;
}
const SCALE = [1, 2, 3, 4, 5] as const;
function RatingScale({ name, label, low, high, value, disabled, onChange }: { name: string; label: string; low: string; high: string; value: string; disabled: boolean; onChange: (value: string) => void }) {
  return <fieldset className={styles.scale} disabled={disabled} role="radiogroup" aria-label={label}>
    <legend>{label}</legend>
    <div className={styles.scaleOptions}>{SCALE.map(option => <label key={option} data-checked={value === String(option) || undefined}>
      <input type="radio" name={name} value={option} required checked={value === String(option)} aria-label={`${option} out of 5`} onChange={() => onChange(String(option))} />
      <span aria-hidden="true">{option}</span>
    </label>)}</div>
    <div className={styles.scaleEnds} aria-hidden="true"><span>{low}</span><span>{high}</span></div>
  </fieldset>;
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
  // Changing an answer starts a new request; retrying an unchanged answer reuses the same one.
  function edit(callback: () => void) { requestId.current = null; callback(); }
  const missed = attendance === 'missed';
  return <form onSubmit={submit} className={styles.feedbackForm} aria-label={`Feedback for ${obligation.sessionTitle}`}>
    <div className={styles.feedbackHead}><h3>How was {obligation.sessionTitle}?</h3><p>{sectionName(obligation.section)} · {obligation.source === 'live' ? 'Live class' : 'Recording'} · takes under a minute</p></div>
    {obligation.source === 'live' && <fieldset className={styles.choice} disabled={busy}><legend>Did you attend the live class?</legend>
      <div>
        <label data-checked={attendance === 'attended' || undefined}><input type="radio" name={`attendance-${obligation.id}`} value="attended" checked={attendance === 'attended'} required onChange={() => edit(() => setAttendance('attended'))} />I attended</label>
        <label data-checked={missed || undefined}><input type="radio" name={`attendance-${obligation.id}`} value="missed" checked={missed} required onChange={() => edit(() => setAttendance('missed'))} />I didn’t attend</label>
      </div>
      {missed && <small>No ratings needed. You can still watch the recording whenever you like.</small>}
    </fieldset>}
    {!missed && <>
      <RatingScale name={`usefulness-${obligation.id}`} label="How useful was this session?" low="Not useful" high="Very useful" value={usefulness} disabled={busy} onChange={value => edit(() => setUsefulness(value))} />
      <RatingScale name={`clarity-${obligation.id}`} label="How clear was this session?" low="Unclear" high="Very clear" value={clarity} disabled={busy} onChange={value => edit(() => setClarity(value))} />
    </>}
    <label className={styles.field}>Anything to add? <span>Optional</span><textarea rows={3} maxLength={4000} disabled={busy} value={comment} onChange={event => edit(() => setComment(event.target.value))} /></label>
    {error && <p role="alert" className={styles.formError}>{error}</p>}
    <button className={styles.primary} type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send feedback'}</button>
  </form>;
}
export function V2LearningWorkspace({ course, learning, initialView = 'recordings', placements = [], preview = false }: { course: V2PublishedCourse; learning: V2LearningState; initialView?: 'recordings' | 'live'; placements?: ContentPlacementView[]; preview?: boolean }) {
  const router = useRouter();
  const courseSessions = course.productCode === 'full_course' ? course.sessions : withCourseReadmes(course.batchId, course.productCode, course.sessions);
  const outlineSessions = pinCourseReadmes([...learning.sessions, ...courseSessions.filter(session => courseReadmePosition(session.key) && !learning.sessions.some(item => item.key === session.key)).map(session => ({ key: session.key, title: session.title, section: session.section, locked: false }))]);
  const initial = outlineSessions.find(s => s.key === learning.lastSessionKey && !s.locked)?.key ?? outlineSessions.find(s => !s.locked)?.key ?? null;
  const [selected, setSelected] = useState<string | null>(initial), [tab, setTab] = useState<'recordings' | 'live'>(initialView);
  const [subject, setSubject] = useState<string>(() => outlineSessions.find(s => s.key === initial)?.section ?? 'quant');
  const subjects = ['quant', 'verbal', 'di', 'programme'].filter(section => outlineSessions.some(session => session.section === section));
  const subjectSessions = outlineSessions.filter(session => session.section === subject);
  const [message, setMessage] = useState(''), [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [focus, setFocus] = useState(false), [largeText, setLargeText] = useState(false);
  const feedbackRef = useRef<HTMLElement>(null);
  const active = courseSessions.find(s => s.key === selected && outlineSessions.some(item => item.key === s.key && item.section === s.section && !item.locked));
  const feedbackSessions = Array.from(new Map(learning.obligations.map(item => [
    `${item.batchId}:${item.sessionKey}`, learning.obligations.find(other => other.batchId === item.batchId && other.sessionKey === item.sessionKey && other.source === 'live') ?? item,
  ])).values());
  const obligation = feedbackSessions.find(o => o.id === feedbackId);
  useEffect(() => {
    if (!focus) return;
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setFocus(false); };
    window.addEventListener('keydown', escape); return () => window.removeEventListener('keydown', escape);
  }, [focus]);
  async function progress(sessionKey: string, itemKey: string | null, state: 'opened' | 'read') {
    if (preview || !learning.sessions.some(session => session.key === sessionKey)) return;
    try {
      await saveLearning({ action: 'progress', batchId: course.batchId, sessionKey, itemKey, state, publicationRevision: learning.publicationRevision });
      router.refresh();
    } catch { setMessage('The learning reminder could not be saved. Course access remains available; progress is not treated as completion.'); }
  }
  const mode = preview ? 'admin-preview' : 'student';
  const learningForSession = (sessionKey: string): V2ResourceLearning => ({ publicationRevision: learning.publicationRevision, feedbackTracking: course.sessions.find(s => s.key === sessionKey)?.section !== 'programme', progress: learning.progress.filter(p => p.sessionKey === sessionKey), onProgress: (itemKey,state) => progress(sessionKey,itemKey,state), onFeedbackDue: () => router.refresh() });
  function select(key: string) {
    if (!outlineSessions.some(s => s.key === key && !s.locked)) return;
    setSubject(outlineSessions.find(s => s.key === key)!.section);
    setSelected(key); setTab('recordings'); setMessage(''); void progress(key, null, 'opened');
  }
  function chooseSubject(section: string) {
    setSubject(section);
    const next = outlineSessions.find(s => s.section === section && s.key === learning.lastSessionKey && !s.locked)
      ?? outlineSessions.find(s => s.section === section && !s.locked);
    setSelected(next?.key ?? null);
    setMessage('');
  }
  function showFeedback(item: V2LearningObligation) {
    const current = feedbackSessions.find(other => other.batchId === item.batchId && other.sessionKey === item.sessionKey) ?? item;
    setFeedbackId(current.id); setFocus(false);
    requestAnimationFrame(() => { feedbackRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }); feedbackRef.current?.focus(); });
  }
  function feedbackSaved() { setFeedbackId(null); setMessage('Thanks, your feedback was sent. Your sessions are opening again.'); router.refresh(); }
  return <div className={`${styles.workspace} ${focus ? styles.focus : ''} ${largeText ? styles.large : ''}`}>
    <div className={styles.toolbar}><div className={styles.tabs} aria-label="Learning routes">
      <button className={tab === 'recordings' ? styles.activeTab : ''} type="button" aria-pressed={tab === 'recordings'} onClick={() => setTab('recordings')}>Recordings & materials</button>
      <button className={tab === 'live' ? styles.activeTab : ''} type="button" aria-pressed={tab === 'live'} onClick={() => setTab('live')}>Live classes</button>
    </div><div className={styles.preferences} role="group" aria-label="Reading preferences"><button type="button" aria-pressed={largeText} onClick={() => setLargeText(!largeText)}><span aria-hidden="true">A</span>Larger text</button><button type="button" aria-pressed={focus} onClick={() => setFocus(!focus)}>{focus ? 'Exit focus' : 'Focus mode'}</button></div></div>
    {preview && <p className={styles.notice}>Read-only Student preview. No progress, feedback or attendance is recorded.</p>}
    {message && <p role="status" className={styles.notice}>{message}</p>}
    {!preview && learning.obligations.length > 0 && <section className={styles.gate} aria-labelledby="feedback-due-heading"><span className={styles.gateIcon} aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg></span><div>
      <h2 id="feedback-due-heading">Quick feedback to continue</h2><p>Other {Array.from(new Set(learning.obligations.map(o => sectionName(o.section)))).join(' and ')} sessions open again once you send it. Your other subjects stay open.</p>
      <ul>{feedbackSessions.map(item => <li key={item.id}><button type="button" onClick={() => showFeedback(item)}>Give feedback for {item.sessionTitle}</button></li>)}</ul>
    </div></section>}
    {!preview && obligation && <section tabIndex={-1} ref={feedbackRef} className={styles.feedbackPanel} aria-label="Required session feedback"><div className={styles.row}><h2 className={styles.visuallyHidden}>Session feedback</h2><button type="button" className={styles.closeFeedback} onClick={() => setFeedbackId(null)}>Close feedback</button></div><FeedbackForm key={obligation.id} obligation={obligation} onSaved={feedbackSaved} /></section>}
    {tab === 'recordings' ? <>
      <V2PlacedReadings sessions={course.sessions} placements={placements} placement="before_course" mode={mode} batchId={course.batchId} learningForSession={learningForSession} />
      {!focus && <div className={styles.subjects} role="group" aria-label="Course subjects">{subjects.map(section => <button key={section} type="button" aria-label={sectionName(section)} aria-pressed={subject === section} onClick={() => chooseSubject(section)}>{sectionName(section)}{learning.obligations.some(o => o.section === section) && <small>Feedback due</small>}</button>)}</div>}
      <div className={styles.layout}>
        <aside className={styles.outline} aria-label="Course outline"><details open><summary><span>{sectionName(subject)} sessions</span><small>{subjectSessions.filter(session => !courseReadmePosition(session.key)).length} · any order</small></summary>
          <ol>{subjectSessions.map(item => { const visited = learning.progress.some(p => p.sessionKey === item.key); return <li key={item.key} className={`${item.locked ? styles.locked : ''} ${item.key === selected ? styles.current : ''}`}>
            <button type="button" disabled={item.locked} aria-current={item.key === selected ? 'step' : undefined} aria-label={`Open ${item.title}`} onClick={() => select(item.key)}><span>{courseReadmePosition(item.key) ? 'Course README' : sectionName(item.section)}</span><strong>{item.title}</strong><small data-status={item.locked ? 'locked' : learning.obligations.some(o => o.batchId === course.batchId && o.sessionKey === item.key) ? 'feedback' : visited ? 'opened' : undefined}>{item.locked ? 'Paused until feedback is sent' : learning.obligations.some(o => o.batchId === course.batchId && o.sessionKey === item.key) ? 'Feedback due' : item.key === learning.lastSessionKey ? 'Last opened' : visited ? 'Opened' : courseReadmePosition(item.key) ? 'Reading page' : ''}</small></button>
          </li>; })}</ol></details>
        </aside>
        <section className={styles.content} aria-label="Selected session">
          {active ? <>
            <V2PlacedReadings sessions={course.sessions.filter(s => s.section === active.section)} placements={placements} placement="area_top" mode={mode} batchId={course.batchId} learningForSession={learningForSession} />
            <V2CourseSessionView session={active} mode={mode} batchId={course.batchId} placements={placements}
              readingEndpoint={preview ? '/api/admin/v2/reading-preview' : `/api/v2/course-reading?batchId=${course.batchId}&sessionKey=${active.key}`}
              learning={preview ? undefined : learningForSession(active.key)} /></>
            : <div className={styles.empty}><h2>{selected ? 'This session is paused' : 'Choose a session to begin'}</h2><p>{selected ? 'Send the feedback that’s due in this subject to open it again. Your other subjects stay open.' : 'Pick any session from the list. They can be taken in any order.'}</p></div>}
        </section>
      </div>
      <V2PlacedReadings sessions={course.sessions} placements={placements} placement="after_course" mode={mode} batchId={course.batchId} learningForSession={learningForSession} />
    </> : <section className={styles.livePanel} aria-labelledby="live-classes-heading"><h2 id="live-classes-heading">Your live classes</h2>
      {!learning.liveRegistered ? <div className={styles.empty}><h3>Live registration is separate</h3><p>Live-session details and meeting links are available to eligible registered students. Recordings and course materials remain available with active course access.</p><Link href="/account/access">Review course access</Link></div>
        : !learning.liveEvents.length ? <div className={styles.empty}><p>No live classes are published for this batch. The recording route is available independently.</p></div>
          : <ol className={styles.liveList}>{learning.liveEvents.map(event => { const locked = event.sessionKey !== null && learning.sessions.some(s => s.key === event.sessionKey && s.locked); const due = learning.obligations.find(o => o.eventKey === event.key && o.batchId === course.batchId); return <li key={event.key}><span className={styles.label}>{sectionName(event.section)} · {event.completedAt ? 'Class completed' : 'Live class'}</span><h3>{event.title}</h3><p>{time(event.startsAt)} – {time(event.endsAt)} IST</p>
            {event.completedAt ? <p>The class has ended. Feedback can also report a missed class; the recording remains optional.</p> : locked ? <p>Complete the pending feedback in this subject before opening another session.</p> : <Link className={styles.primary} href={`/schedule/v2/${course.batchId}/live/${event.key}`} prefetch={false}>Open live class</Link>}
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
