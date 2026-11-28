'use client';

import Link from 'next/link';
import { googleCalendarLink, siteLink } from '@/lib/calendarLink';
import { FeedbackTip } from './FeedbackTip';
import { courseReadmePosition, withCourseReadmes, pinCourseReadmes } from '@/lib/v2CourseReadmes';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { V2PublishedCourse } from '@/lib/v2StudentDelivery';
import type { V2LearningState, V2LearningObligation, V2FeedbackResponse, V2LearningProgress, V2ScheduledClass } from '@/lib/v2Learning';
import type { ContentPlacementView } from '@/lib/v2ContentPublishing';
import { V2CourseSessionView, V2PlacedReadings } from './V2CourseSessionView';
import styles from './v2Learning.module.css';
const sectionName = (value: string) => value === 'di' ? 'DI' : value === 'quant' ? 'Quant' : value === 'verbal' ? 'Verbal' : 'Programme';
const dayLabel = (value: string) => new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' }).format(new Date(value));
const weekdayLabel = (value: string) => new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short' }).format(new Date(value));
const clockLabel = (value: string) => new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
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
/** A subject outside this course: either another enrolled course to switch to, or one the student hasn't bought. */
export type V2OtherSubject = { section: 'quant' | 'verbal' | 'di'; href: string | null };
/**
 * `navigation="header"`: the student header drives the subject and view through the URL, so the
 * in-page tabs and subject switch are hidden. `inline` keeps them (Admin preview, fixtures).
 */
export function V2LearningWorkspace({ course, learning, initialView = 'recordings', placements = [], preview = false, otherSubjects = [], navigation = 'inline', initialSubject, initialSession, feedbackFormUrls, liveSchedule }: { course: V2PublishedCourse; learning: V2LearningState; initialView?: 'recordings' | 'live'; placements?: ContentPlacementView[]; preview?: boolean; otherSubjects?: V2OtherSubject[]; navigation?: 'inline' | 'header'; initialSubject?: string; initialSession?: string; feedbackFormUrls?: Record<string, string>; liveSchedule?: V2ScheduledClass[] | null }) {
  const headerNavigation = navigation === 'header' && !preview;
  const router = useRouter();
  // The fixed reading pages before and after the course appear only once they have something to read.
  const courseSessions = (course.productCode === 'full_course' ? course.sessions : withCourseReadmes(course.batchId, course.productCode, course.sessions))
    .filter(session => !courseReadmePosition(session.key) || Object.values(session.content).some(items => items.length > 0));
  // Students see subject sessions only; non-subject schedule items (breaks and similar) are not shown.
  const outlineSessions = pinCourseReadmes([...learning.sessions, ...courseSessions.filter(session => courseReadmePosition(session.key) && !learning.sessions.some(item => item.key === session.key)).map(session => ({ key: session.key, title: session.title, section: session.section, locked: false }))]).filter(session => session.section !== 'programme');
  const subjects = ['quant', 'verbal', 'di'].filter(section => outlineSessions.some(session => session.section === section));
  // A subject requested through the header: open a specific session, else the last opened one in that subject.
  const requested = initialSubject && subjects.includes(initialSubject) ? initialSubject : null;
  const initial = requested
    ? (outlineSessions.find(s => s.key === initialSession && s.section === requested && !s.locked)
      ?? outlineSessions.find(s => s.key === learning.lastSessionKey && s.section === requested && !s.locked)
      ?? outlineSessions.find(s => s.section === requested && !s.locked))?.key ?? null
    : outlineSessions.find(s => s.key === learning.lastSessionKey && !s.locked)?.key ?? outlineSessions.find(s => !s.locked)?.key ?? null;
  const [selected, setSelected] = useState<string | null>(initial), [tab, setTab] = useState<'recordings' | 'live'>(initialView);
  const [subject, setSubject] = useState<string>(() => requested ?? outlineSessions.find(s => s.key === initial)?.section ?? subjects[0] ?? 'quant');
  const subjectSessions = outlineSessions.filter(session => session.section === subject);
  const [message, setMessage] = useState(''), [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [lockedSubject, setLockedSubject] = useState<string | null>(() => initialSubject && !subjects.includes(initialSubject) && otherSubjects.some(item => item.section === initialSubject && !item.href) ? initialSubject : null);
  // Captured once per page load; live-class states are recalculated when the page refreshes.
  const [now] = useState(() => Date.now());
  const upcoming = learning.liveEvents.filter(event => !event.completedAt && Date.parse(event.endsAt) > now).toSorted((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const past = learning.liveEvents.filter(event => !upcoming.includes(event)).toSorted((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));
  const feedbackRef = useRef<HTMLElement>(null);
  const active = courseSessions.find(s => s.key === selected && outlineSessions.some(item => item.key === s.key && item.section === s.section && !item.locked));
  const feedbackSessions = Array.from(new Map(learning.obligations.map(item => [
    `${item.batchId}:${item.sessionKey}`, learning.obligations.find(other => other.batchId === item.batchId && other.sessionKey === item.sessionKey && other.source === 'live') ?? item,
  ])).values());
  const obligation = feedbackSessions.find(o => o.id === feedbackId);
  // Tally feedback is confirmed by its webhook; after the form reports a submission, refresh until the obligation clears.
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const stillPending = !!confirmingId && learning.obligations.some(o => o.id === confirmingId);
  useEffect(() => {
    if (!feedbackFormUrls || !feedbackId) return;
    const submitted = (event: MessageEvent) => {
      if (event.origin !== 'https://tally.so' || typeof event.data !== 'string' || !event.data.includes('Tally.FormSubmitted')) return;
      setConfirmingId(feedbackId);
    };
    window.addEventListener('message', submitted);
    return () => window.removeEventListener('message', submitted);
  }, [feedbackFormUrls, feedbackId]);
  useEffect(() => {
    if (!stillPending) return;
    let checks = 0;
    const timer = window.setInterval(() => { checks += 1; router.refresh(); if (checks >= 20) window.clearInterval(timer); }, 3000);
    return () => window.clearInterval(timer);
  }, [stillPending, router]);
  async function progress(sessionKey: string, itemKey: string | null, state: 'opened' | 'read') {
    if (preview || !learning.sessions.some(session => session.key === sessionKey)) return;
    try {
      await saveLearning({ action: 'progress', batchId: course.batchId, sessionKey, itemKey, state, publicationRevision: learning.publicationRevision });
      router.refresh();
    } catch { setMessage('The learning reminder could not be saved. Course access remains available; progress is not treated as completion.'); }
  }
  const mode = preview ? 'admin-preview' : 'student';
  const learningForSession = (sessionKey: string): V2ResourceLearning => ({ publicationRevision: learning.publicationRevision, feedbackTracking: course.sessions.find(s => s.key === sessionKey)?.section !== 'programme', progress: learning.progress.filter(p => p.sessionKey === sessionKey), onProgress: (itemKey,state) => progress(sessionKey,itemKey,state), onFeedbackDue: () => router.refresh(), feedbackDue: learning.obligations.some(o => o.batchId === course.batchId && o.sessionKey === sessionKey) });
  function select(key: string) {
    if (!outlineSessions.some(s => s.key === key && !s.locked)) return;
    const section = outlineSessions.find(s => s.key === key)!.section;
    // From Live classes or another subject, go through the URL so the header stays in step.
    if (headerNavigation && (section !== subject || tab !== 'recordings')) { router.push(`?subject=${section}&session=${key}`); return; }
    setSubject(outlineSessions.find(s => s.key === key)!.section);
    setSelected(key); setTab('recordings'); setMessage(''); void progress(key, null, 'opened');
  }
  function chooseSubject(section: string) {
    setSubject(section); setLockedSubject(null);
    const next = outlineSessions.find(s => s.section === section && s.key === learning.lastSessionKey && !s.locked)
      ?? outlineSessions.find(s => s.section === section && !s.locked);
    setSelected(next?.key ?? null);
    setMessage('');
  }
  function showFeedback(item: V2LearningObligation) {
    const current = feedbackSessions.find(other => other.batchId === item.batchId && other.sessionKey === item.sessionKey) ?? item;
    setFeedbackId(current.id);
    requestAnimationFrame(() => { feedbackRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }); feedbackRef.current?.focus(); });
  }
  function feedbackSaved() { setFeedbackId(null); setMessage('Thanks, your feedback was sent. Your sessions are opening again.'); router.refresh(); }
  // Feedback is asked for only on the subject it belongs to; other subjects stay undisturbed.
  const subjectDue = feedbackSessions.filter(item => item.section === subject).sort((a, b) => Number(b.batchId === course.batchId) - Number(a.batchId === course.batchId));
  // Progress at a glance for the open subject (course reading pages aren't counted).
  const teachingSessions = subjectSessions.filter(session => !courseReadmePosition(session.key));
  const openedCount = teachingSessions.filter(session => learning.progress.some(p => p.sessionKey === session.key)).length;
  return <div className={styles.workspace}>
    {!headerNavigation && <div className={styles.toolbar}><div className={styles.tabs} aria-label="Learning routes">
      <button className={tab === 'recordings' ? styles.activeTab : ''} type="button" aria-pressed={tab === 'recordings'} onClick={() => setTab('recordings')}>Recordings & materials</button>
      <button className={tab === 'live' ? styles.activeTab : ''} type="button" aria-pressed={tab === 'live'} onClick={() => setTab('live')}>Live classes</button>
      {!preview && <Link href="/mocks" prefetch={false}>Mocks</Link>}
    </div></div>}
    {preview && <p className={styles.notice}>Read-only Student preview. No progress, feedback or attendance is recorded.</p>}
    {message && <p role="status" className={styles.notice}>{message}</p>}
    {headerNavigation && !learning.obligations.length && <FeedbackTip />}
    {!preview && tab === 'recordings' && !lockedSubject && !obligation && subjectDue.length > 0 && <section className={styles.gate} aria-labelledby="feedback-due-heading">
      <span className={styles.gateIcon} aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01"/></svg></span>
      <div className={styles.gateBody}>
        <p className={styles.gateEyebrow}>{sectionName(subject)} · Feedback needed</p>
        <h2 id="feedback-due-heading">{subjectDue.length > 1 ? `${subjectDue.length} sessions need quick feedback` : <>How was {subjectDue[0].sessionTitle}?</>}</h2>
        <p>It takes under a minute. Your other {sectionName(subject)} sessions open again once it’s sent.</p>
      </div>
      <ul className={styles.gateActions}>{subjectDue.map(item => <li key={item.id}><button type="button" aria-label={`Give feedback for ${item.sessionTitle}`} onClick={() => showFeedback(item)}>{subjectDue.length > 1 ? item.sessionTitle : 'Give feedback'}</button></li>)}</ul>
    </section>}
    {!preview && obligation && <section tabIndex={-1} ref={feedbackRef} className={styles.feedbackPanel} aria-label="Required session feedback"><div className={styles.row}><h2 className={styles.visuallyHidden}>Session feedback</h2><button type="button" className={styles.closeFeedback} onClick={() => setFeedbackId(null)}>Close feedback</button></div>{feedbackFormUrls?.[obligation.id]
      ? confirmingId === obligation.id ? <div className={styles.confirming} role="status"><h3>Thanks, we’re confirming your feedback…</h3><p>This usually takes a few seconds, and your sessions open again on their own. There’s no need to fill the form again.</p><button type="button" className={styles.secondary} onClick={() => router.refresh()}>Check again</button></div>
        : <iframe className={styles.tallyFrame} src={feedbackFormUrls[obligation.id]} title={`Feedback for ${obligation.sessionTitle}`} loading="lazy" />
      : <FeedbackForm key={obligation.id} obligation={obligation} onSaved={feedbackSaved} />}</section>}
    {confirmingId && !stillPending && <p role="status" className={styles.notice}>Thanks, your feedback was received. Your sessions are open again.</p>}
    {tab === 'recordings' ? <>
      <V2PlacedReadings sessions={course.sessions} placements={placements} placement="before_course" mode={mode} batchId={course.batchId} learningForSession={learningForSession} />
      {!headerNavigation && <div className={styles.subjects} role="group" aria-label="Course subjects">{subjects.map(section => <button key={section} type="button" aria-label={sectionName(section)} aria-pressed={!lockedSubject && subject === section} onClick={() => chooseSubject(section)}>{sectionName(section)}{learning.obligations.some(o => o.section === section) && <small>Feedback due</small>}</button>)}
        {!preview && otherSubjects.filter(item => !subjects.includes(item.section)).map(item => item.href
          ? <Link key={item.section} href={item.href} prefetch={false}>{sectionName(item.section)}</Link>
          : <button key={item.section} type="button" className={styles.lockedSubject} aria-pressed={lockedSubject === item.section} aria-label={`${sectionName(item.section)}, not in your package`} onClick={() => setLockedSubject(item.section)}><span aria-hidden="true">🔒</span>{sectionName(item.section)}</button>)}</div>}
      {lockedSubject ? <section className={styles.upsell} aria-labelledby="locked-subject-heading"><span className={styles.gateIcon} aria-hidden="true">🔒</span><div>
        <h2 id="locked-subject-heading">{sectionName(lockedSubject)} isn’t in your package yet</h2>
        <p>Add it to get every {sectionName(lockedSubject)} session, recording and worksheet. You pay only the price difference, and your access end date stays the same.</p>
        <div className={styles.row}><Link className={styles.primary} href="/account/access/upgrade" prefetch={false}>See upgrade options</Link>{headerNavigation ? <Link className={styles.secondary} href={`?subject=${subject}`}>Back to {sectionName(subject)}</Link> : <button type="button" className={styles.secondary} onClick={() => setLockedSubject(null)}>Back to {sectionName(subject)}</button>}</div>
      </div></section> : <>
      <div className={styles.layout}>
        <aside className={styles.outline} aria-label="Course outline"><details open><summary><span>{sectionName(subject)} sessions</span><small>{openedCount} of {teachingSessions.length} opened</small></summary>
          <ol>{subjectSessions.map(item => { const visited = learning.progress.some(p => p.sessionKey === item.key); const readme = courseReadmePosition(item.key); return <li key={item.key} className={`${item.locked ? styles.locked : ''} ${item.key === selected ? styles.current : ''}`} data-readme={readme ?? undefined} data-last={item.key === learning.lastSessionKey && !item.locked && !readme || undefined}>
            <button type="button" disabled={item.locked} aria-current={item.key === selected ? 'step' : undefined} aria-label={`Open ${item.title}`} onClick={() => select(item.key)}><span>{readme ? <><svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M3 5h6a3 3 0 0 1 3 3v12a2.5 2.5 0 0 0-2.5-2.5H3z M21 5h-6a3 3 0 0 0-3 3v12a2.5 2.5 0 0 1 2.5-2.5H21z" /></svg>{readme === 'before' ? 'Start here' : 'When you finish'}</> : sectionName(item.section)}</span><strong>{item.title}</strong><small data-status={item.locked ? 'locked' : learning.obligations.some(o => o.batchId === course.batchId && o.sessionKey === item.key) ? 'feedback' : visited ? 'opened' : undefined}>{item.locked ? 'Paused until feedback is sent' : learning.obligations.some(o => o.batchId === course.batchId && o.sessionKey === item.key) ? 'Feedback due' : item.key === learning.lastSessionKey ? 'Last opened' : visited ? 'Opened' : readme === 'before' ? 'Read this before your first session' : readme ? 'Read this once you’ve finished' : ''}</small></button>
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
      </>}
    </> : <section className={styles.livePanel} aria-labelledby="live-classes-heading"><h2 id="live-classes-heading">Your live classes</h2>
      {!learning.liveRegistered ? liveSchedule?.length ? <ScheduleOnly classes={liveSchedule} now={now} />
        : <div className={styles.empty}><h3>You don’t have a live seat</h3><p>Live classes are optional. Every session’s recording and materials stay open to you. Each batch has eight live seats; the programme team can tell you if one is available.</p><Link href="/account/access">Check my access</Link></div>
        : !learning.liveEvents.length ? <div className={styles.empty}><h3>No live classes yet</h3><p>Class dates appear here once they’re published. Recordings and materials are open meanwhile.</p></div>
        : <>
          {upcoming.length > 0 && <><h3 className={styles.liveGroup}>Coming up</h3><ol className={styles.liveList}>{upcoming.map(event => <LiveRow key={event.key} event={event} learning={learning} batchId={course.batchId} now={now} onFeedback={showFeedback} onMaterials={select} hasMaterials={key => outlineSessions.some(item => item.key === key)} />)}</ol></>}
          {past.length > 0 && <><h3 className={styles.liveGroup}>Past classes</h3><ol className={styles.liveList}>{past.map(event => <LiveRow key={event.key} event={event} learning={learning} batchId={course.batchId} now={now} onFeedback={showFeedback} onMaterials={select} hasMaterials={key => outlineSessions.some(item => item.key === key)} />)}</ol></>}
        </>}
    </section>}
  </div>;
}
/** The batch's class dates for a student without a live seat: when classes are, without join details. */
function ScheduleOnly({ classes, now }: { classes: V2ScheduledClass[]; now: number }) {
  const coming = classes.filter(item => !item.completedAt && Date.parse(item.endsAt) > now).toSorted((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const done = classes.filter(item => !coming.includes(item)).toSorted((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));
  const row = (item: V2ScheduledClass, upcoming: boolean) => {
    const calendar = upcoming ? googleCalendarLink({ title: `Ace Club live class: ${item.title}`, startsAt: item.startsAt, endsAt: item.endsAt }) : null;
    return <li key={item.key} className={styles.liveRow}>
      <div className={styles.liveDate}><strong>{dayLabel(item.startsAt)}</strong><span>{weekdayLabel(item.startsAt)}</span></div>
      <div className={styles.liveInfo}><span className={styles.label}>{[item.section !== 'programme' ? sectionName(item.section) : '', item.completedAt ? 'Completed' : ''].filter(Boolean).join(' · ') || 'Live class'}</span><h3>{item.title}</h3><p>{clockLabel(item.startsAt)}–{clockLabel(item.endsAt)} IST</p></div>
      <div className={styles.liveActions}>{calendar && <a className={styles.calendarLink} href={calendar} target="_blank" rel="noreferrer">Add to calendar <span aria-hidden="true">↗</span></a>}</div>
    </li>;
  };
  return <>
    <p className={styles.scheduleNote}>Here’s when your batch’s live classes happen. Joining needs a live seat; each class’s recording is added to its session afterwards.</p>
    {coming.length > 0 && <><h3 className={styles.liveGroup}>Coming up</h3><ol className={styles.liveList}>{coming.map(item => row(item, true))}</ol></>}
    {done.length > 0 && <><h3 className={styles.liveGroup}>Past classes</h3><ol className={styles.liveList}>{done.map(item => row(item, false))}</ol></>}
  </>;
}
/** One live class: date, time and the single action that fits its state. */
function LiveRow({ event, learning, batchId, now, onFeedback, onMaterials, hasMaterials }: { event: V2LearningState['liveEvents'][number]; learning: V2LearningState; batchId: string; now: number; onFeedback: (item: V2LearningObligation) => void; onMaterials: (sessionKey: string) => void; hasMaterials: (sessionKey: string) => boolean }) {
  const locked = event.sessionKey !== null && learning.sessions.some(s => s.key === event.sessionKey && s.locked);
  const due = learning.obligations.find(o => o.eventKey === event.key && o.batchId === batchId);
  const joinable = !event.completedAt && Date.parse(event.startsAt) - 15 * 60000 <= now && Date.parse(event.endsAt) > now;
  const calendar = !event.completedAt && Date.parse(event.startsAt) > now
    ? googleCalendarLink({ title: `Ace Club live class: ${event.title}`, startsAt: event.startsAt, endsAt: event.endsAt, details: `Join from your course: ${siteLink(`/schedule/v2/${batchId}/live/${event.key}`)}` }) : null;
  return <li className={styles.liveRow} data-now={joinable || undefined}>
    <div className={styles.liveDate}><strong>{dayLabel(event.startsAt)}</strong><span>{weekdayLabel(event.startsAt)}</span></div>
    <div className={styles.liveInfo}><span className={styles.label}>{[event.section !== 'programme' ? sectionName(event.section) : '', joinable ? 'On now' : event.completedAt ? 'Completed' : ''].filter(Boolean).join(' · ') || 'Live class'}</span><h3>{event.title}</h3><p>{clockLabel(event.startsAt)}–{clockLabel(event.endsAt)} IST</p>
      {locked && !event.completedAt && <p className={styles.liveNote}>Send the feedback that’s due in {sectionName(event.section)} to open this class.</p>}</div>
    <div className={styles.liveActions}>
      {!event.completedAt && !locked && <Link className={joinable ? styles.primary : styles.secondary} href={`/schedule/v2/${batchId}/live/${event.key}`} prefetch={false}>{joinable ? 'Join class' : 'Class details'}</Link>}
      {due && <button className={styles.primary} type="button" onClick={() => onFeedback(due)}>Give feedback or report a missed class</button>}
      {calendar && <a className={styles.calendarLink} href={calendar} target="_blank" rel="noreferrer">Add to calendar <span aria-hidden="true">↗</span></a>}
      {event.sessionKey && !locked && hasMaterials(event.sessionKey) && <button className={styles.secondary} type="button" onClick={() => onMaterials(event.sessionKey!)}>Session materials</button>}
    </div>
  </li>;
}
export type V2ResourceLearning = {
  publicationRevision: number; feedbackTracking?: boolean; progress: V2LearningProgress[];
  onProgress: (itemKey: string, state: 'opened' | 'read') => Promise<void>;
  onFeedbackDue: () => void;
  /** Feedback is owed for this session, for example after a live class, even if no recording exists yet. */
  feedbackDue?: boolean;
};
