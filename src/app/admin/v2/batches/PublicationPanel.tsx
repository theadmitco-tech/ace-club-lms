'use client';
import { CourseSessionsPreview } from '../templates/CourseSessions';

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { readDraftRecovery } from '@/lib/draftRecovery';
import { DraftRecoveryNotice, useDraftRecovery } from '@/components/DraftRecovery';
import { isPublicationWorkspace, type PublicationWorkspace } from '@/lib/v2WorkspaceRecovery';
import { useRouter } from 'next/navigation';
import { useAdminDraftGuard } from '@/components/AdminDraftNavigation';
import type { V2BatchDraft } from '@/lib/v2Batches';
import type { V2Publication, V2PublicationInput, V2PublicationProposal } from '@/lib/v2Publications';
import { V2_TEMPLATE_PRODUCTS, v2CourseDeliveryLabel } from '@/lib/v2Templates';
import { previewBatchPublicationAction, saveBatchPublicationAction } from './actions';
import { courseReadmePosition } from '@/lib/v2CourseReadmes';
import styles from '../templates/templates.module.css';
import batchStyles from './batchWorkspace.module.css';

const time = (value: string | null) => value === null ? 'Unscheduled'
  : new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export default function PublicationPanel({ drafts, publications, ownerId, focused = false, courseMode = false, onBack, meetLinks = null, enrolled = null }: { drafts: V2BatchDraft[]; publications: V2Publication[]; ownerId: string; focused?: boolean; courseMode?: boolean; onBack?: () => void; meetLinks?: string[] | null; enrolled?: number | null }) {
  const router = useRouter();
  const [review, setReview] = useState<{ input: V2PublicationInput; proposal: V2PublicationProposal } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [completionBatchId, setCompletionBatchId] = useState<string | null>(null);
  const busy = useRef(false);
  const recoveryKey = courseMode ? `v2-course-publication:${drafts[0]?.id ?? ''}` : 'v2-publication';
  const recovery = useDraftRecovery<PublicationWorkspace>(ownerId, recoveryKey, isPublicationWorkspace);
  useAdminDraftGuard(pending || review !== null);

  async function preview(batch: V2BatchDraft, action: V2PublicationInput['action']) {
    if (busy.current || review || recovery.recovered) return;
    busy.current = true; setPending(true); setReview(null); setError(''); setMessage(''); setCompletionBatchId(null);
    const input: V2PublicationInput = { batchId: batch.id, batchRevision: batch.revision,
      expectedRevision: publications.find((item) => item.batchId === batch.id)?.revision ?? 0,
      requestId: crypto.randomUUID(), action };
    try {
      const result = await previewBatchPublicationAction(input);
      if (result.status === 'error') setError(result.message);
      else {
        const next = { input, proposal: result.proposal };
        recovery.remember(next);
        setReview(next);
      }
    } catch { setError('The publication preview could not be loaded. Please retry.'); }
    finally { busy.current = false; setPending(false); }
  }

  const autoStarted = useRef(false);
  const startReview = useEffectEvent(() => {
    const batch = drafts[0];
    if (!batch) return;
    const savedPublication = publications.find(item => item.batchId === batch.id);
    if (savedPublication?.state === 'published' && savedPublication.batchRevision === batch.revision) return;
    try {
      const saved = readDraftRecovery(window.sessionStorage, ownerId, recoveryKey);
      if (saved && isPublicationWorkspace(JSON.parse(saved))) return;
    } catch { return; }
    void preview(batch, 'publish');
  });
  useEffect(() => {
    if (!focused || autoStarted.current) return;
    autoStarted.current = true;
    startReview();
  }, [focused]);

  async function confirm() {
    if (!review || busy.current) return;
    busy.current = true; setPending(true); setError(''); setMessage('');
    try {
      const result = await saveBatchPublicationAction(review.input, review.proposal.fingerprint);
      if (result.status === 'error') { setError(result.message); return; }
      recovery.forget();
      setReview(null);
      setMessage(courseMode ? result.document.state === 'published' ? 'Course changes published. Students can now see the updated sessions and reading pages.' : 'Course hidden from students.' : focused ? result.document.state === 'published' ? 'Batch published. Enrolled students with active course access can now see it.' : 'Batch unpublished. It is now hidden from students.' : `Publication revision ${result.document.revision} ${result.document.state}${result.replayed ? ' (previous confirmation recovered)' : ''}.`);
      setCompletionBatchId(result.document.state === 'published' && result.document.events.some((event: V2Publication['events'][number]) => event.kind === 'live') ? result.document.batchId : null);
      router.refresh();
    } catch { setError('Confirmation was interrupted. Retry this same review to recover the submission.'); }
    finally { busy.current = false; setPending(false); }
  }

  if (focused) {
    const selected = drafts[0];
    const published = publications.find(item => item.batchId === selected?.id);
    const reviewedDraft = review && drafts.find(batch => batch.id === review.input.batchId && batch.revision === review.input.batchRevision);
    const document = review?.proposal.document;
    const unpublish = review?.input.action === 'unpublish';
    const unchanged = published?.state === 'published' && published.batchRevision === selected?.revision;
    const liveClasses = document?.events.filter(event => event.kind === 'live') ?? [];
    const cancel = () => { setReview(null); recovery.forget(); setError(''); onBack?.(); };
    const sessions = reviewedDraft?.sessions?.filter(session => session.section !== 'programme') ?? [];
    const linked = meetLinks ? liveClasses.filter(event => meetLinks.includes(event.key)).length : null;
    const missingSession = liveClasses.some(event => !(document?.sessions ?? []).some(session => session.section === event.section));
    const audience = document ? (document.productCode === 'full_course' ? 'Full Course' : V2_TEMPLATE_PRODUCTS[document.productCode].label) : 'course';
    const when = (value: string | null) => value ? { day: new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' }).format(new Date(value)), weekday: new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short' }).format(new Date(value)), time: new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' }).format(new Date(value)) } : null;
    return <section className={`${batchStyles.schedule} ${batchStyles.publishPanel}`} aria-labelledby="publication-heading" aria-busy={pending}>
      <DraftRecoveryNotice available={!!recovery.recovered} unavailable={recovery.unavailable} onRestore={() => {
        if (!recovery.recovered) return;
        setReview(recovery.recovered); recovery.acknowledge();
      }} onDiscard={recovery.forget} />
      <h2 id="publication-heading" className={batchStyles.publishTitle}>{message ? 'Done' : review ? unpublish ? courseMode ? 'Hide this course?' : 'Hide this batch?' : 'Ready to publish?' : unchanged ? courseMode ? 'This course is published' : 'This batch is published' : courseMode ? 'Publish course changes' : 'Publish this batch'}</h2>
      {message ? <>
        <p role="status" className={batchStyles.publishHelp}>{message}</p>
        {!courseMode && completionBatchId && enrolled === 0 && <p className={batchStyles.publishHelp}>Next: enroll students so they can see this schedule.</p>}
        <div className={batchStyles.actions}>
          {onBack && <button type="button" className="btn btn-primary" onClick={onBack}>{courseMode ? 'Back to course content' : 'View schedule'}</button>}
          {!courseMode && completionBatchId && enrolled === 0 && <a className="btn btn-secondary" href={`/admin/v2/batches/${completionBatchId}/students`}>Enroll students</a>}
          {completionBatchId && <a className={batchStyles.textLink} href={`/admin/v2/batches/${completionBatchId}/live`}>Set up class completion</a>}
        </div>
      </> : review && document ? <div className={batchStyles.publishLayout}>
        <div className={batchStyles.publishMain}>
          {!unpublish && !courseMode && <dl className={batchStyles.publishFacts}>
            <div><dt>Live classes</dt><dd>{liveClasses.length}<span> · All times IST</span></dd></div>
            <div><dt>Course sessions</dt><dd>{sessions.length}<span> · no dates needed</span></dd></div>
            <div><dt>Meet links</dt><dd>{linked === null ? '—' : `${linked} of ${liveClasses.length}`}<span>{linked !== null && linked < liveClasses.length ? ' · can be added later' : ''}</span></dd></div>
          </dl>}
          {unpublish && <p className={batchStyles.publishHelp}>Students will no longer see this batch’s schedule or content. Enrollments, purchases and history are kept, and you can publish it again later.</p>}
          {!unpublish && <>
            {!!liveClasses.length && <section aria-labelledby="publish-classes"><h3 id="publish-classes" className={batchStyles.publishSection}>Live classes</h3>
              <ol className={batchStyles.publishTimeline}>{liveClasses.map(event => { const start = when(event.startsAt); return <li key={event.key}>
                <div className={batchStyles.publishWhen}>{start ? <><strong>{start.day}</strong><span>{start.weekday}</span></> : <span>No date</span>}</div>
                <div><strong>{event.title}</strong><span>{V2_TEMPLATE_PRODUCTS[event.section].label}{start ? ` · ${start.time}` : ''}{event.endsAt && start ? `–${when(event.endsAt)!.time}` : ''}</span></div>
              </li>; })}</ol></section>}
            {reviewedDraft && (courseMode ? (reviewedDraft.sessions ?? []) : sessions).length > 0 && <section aria-label={courseMode ? 'Course changes to publish' : 'Included course content'}>
              <h3 className={batchStyles.publishSection}>Course content <span>{(courseMode ? (reviewedDraft.sessions ?? []) : sessions).length} sessions · open one to preview it as a student</span></h3>
              <ul className={batchStyles.contentList}>{(courseMode ? (reviewedDraft.sessions ?? []) : sessions).map(session => <li key={session.key}><details>
                <summary><strong>{session.title || 'Untitled session'}</strong>
                  <span className={batchStyles.contentMeta}>{session.section !== 'programme' && V2_TEMPLATE_PRODUCTS[session.section]?.label}</span>
                  <span className={batchStyles.contentCounts}>{(courseReadmePosition(session.key) ? [['preSessionReads','Reading']] as const : [['preSessionReads','Pre-read'],['recordings','Recording'],['postSessionReads','Post-read'],['materials','Worksheet']] as const).map(([kind,label]) => <span key={kind} data-empty={!session.content[kind].length || undefined}>{label} {session.content[kind].length}</span>)}</span>
                </summary>
                <div className={batchStyles.contentPreview}><CourseSessionsPreview sessions={[session]} /></div>
              </details></li>)}</ul>
            </section>}
          </>}
        </div>
        <aside className={batchStyles.publishAside} aria-label="Confirm publication">
          <p className={batchStyles.publishHelp}>{unpublish ? 'This hides the batch from students.'
            : courseMode ? 'Publishing updates this course for students with access.'
            : published?.state === 'published' ? 'Students currently see the previous version. Publishing replaces it with these saved changes.'
            : `Enrolled students with active ${audience} access will see this schedule once you publish.`}</p>
          {!unpublish && !!liveClasses.length && missingSession && <p className={batchStyles.publishWarn} role="note">A live class has no course session in its subject, so its feedback can’t be linked yet. <a href={`/admin/v2/batches?batch=${review.input.batchId}&outline=1`}>Add a course session</a>. You can still publish.</p>}
          {!reviewedDraft && <p role="alert" className="workflow-error">The saved batch changed. Cancel this review and review it again.</p>}
          <button type="button" className="btn btn-primary" disabled={pending || !reviewedDraft} onClick={confirm}>{pending ? 'Saving…' : unpublish ? courseMode ? 'Hide course' : 'Unpublish batch' : courseMode ? 'Publish course changes' : 'Publish batch'}</button>
          <button type="button" className="btn btn-secondary" disabled={pending} onClick={cancel}>Cancel review</button>
        </aside>
      </div> : <>
        <p className={batchStyles.publishHelp}>{unchanged ? courseMode ? 'Students see the latest saved course content.' : 'Students see the latest saved version. When something changes, edit the schedule and publish again.' : courseMode ? 'Review the saved course changes, then publish when ready.' : 'The saved batch is private until published. Review it once, then publish when ready.'}</p>
        {selected ? <div className={batchStyles.actions}>
          {!unchanged && <button type="button" className="btn btn-primary" disabled={pending || !!recovery.recovered} onClick={() => preview(selected, 'publish')}>{pending ? 'Loading review…' : courseMode ? 'Review course changes' : 'Review batch'}</button>}
          {onBack && <button type="button" className="btn btn-secondary" disabled={pending} onClick={onBack}>{courseMode ? 'Back to course content' : 'Back to schedule'}</button>}
          {!courseMode && published?.state === 'published' && <details className={batchStyles.publishDetails}><summary>Unpublish batch</summary><p className={batchStyles.publishHelp}>Hides this batch from students. Enrollments and purchases are kept.</p><button type="button" className="btn btn-secondary" disabled={pending || !!recovery.recovered} onClick={() => preview(selected, 'unpublish')}>Review unpublish</button></details>}
        </div> : <p>Save a batch before publishing.</p>}
      </>}
      {error && <p role="alert" className="workflow-error">{error}</p>}
    </section>;
  }

  return <section className={styles.card} aria-labelledby="publication-heading" aria-busy={pending}>
    <DraftRecoveryNotice available={!!recovery.recovered} unavailable={recovery.unavailable} onRestore={() => {
      if (!recovery.recovered) return;
      setReview(recovery.recovered); recovery.acknowledge();
    }} onDiscard={recovery.forget} />
    <h2 id="publication-heading">Review batch publication</h2>
    <p>Publish the saved course structure and its optional live schedule. Further draft edits need another review before they replace the published version.</p>
    <p>Published schedules are available to enrolled students with active product access when Student schedules are enabled.</p>
    {!drafts.length && <p>Save a batch draft to review publication.</p>}
    <ul className={styles.list}>{drafts.map((batch) => {
      const published = publications.find((item) => item.batchId === batch.id);
      return <li key={batch.id}>
        <strong>{batch.title}</strong>
        <p>Saved draft {batch.revision} · {published ? `${published.state}, source draft ${published.batchRevision}` : 'Never published'}</p>
        <div className={styles.buttons}>
          <button type="button" className="btn btn-secondary" disabled={pending || !!recovery.recovered || !!review} onClick={() => preview(batch, 'publish')}>Preview publication</button>
          {!courseMode && published?.state === 'published' && <details><summary>More actions</summary><button type="button" className="btn btn-secondary" disabled={pending || !!recovery.recovered || !!review} onClick={() => preview(batch, 'unpublish')}>Review unpublish</button></details>}
        </div>
      </li>;
    })}</ul>
    {review && <section className={styles.fields} aria-labelledby="publication-scope">
      <h3 id="publication-scope">{review.input.action === 'publish' ? 'Publish' : 'Unpublish'}: {review.proposal.document.title}</h3>
      <p>Confirm or cancel this review before starting another.</p>
      <p>Scope: this batch only · {V2_TEMPLATE_PRODUCTS[review.proposal.document.productCode].label} · {review.proposal.document.sections.join(', ')}</p>
      <p>Delivery: {v2CourseDeliveryLabel(review.proposal.document.events)}</p>
      <p>Saved draft {review.input.batchRevision} → publication revision {review.proposal.document.revision}. All times IST.</p>
      {review.input.action === 'publish' && review.proposal.document.events.some(event => event.kind === 'live') && <aside aria-label="Class completion setup">
        <strong>Next step: confirm each class’s feedback session</strong>
        <p>{review.input.expectedRevision > 0
          ? 'Publishing again requires the session links for unfinished classes to be confirmed again, even when only a meeting link changed. Existing links remain in the history.'
          : 'After publishing, link each live class to its feedback session before marking it complete.'} After confirmation, select Set up class completion to continue.</p>
        {review.proposal.document.events.some(event => event.kind === 'live' && !(review.proposal.document.sessions ?? []).some(session => session.section === event.section)) && <p>
          A live-class subject has no course session available for feedback. <a href={`/admin/v2/batches?batch=${review.input.batchId}&outline=1`}>Add a course session</a>, save the draft, then review publication again.
        </p>}
      </aside>}
      <p>{review.proposal.document.liveRegistrationLimit === 8 ? 'Live-course registration limit: 8. Registration enforcement belongs to checkout; no session reservations.' : 'No scheduled live sessions.'}</p>
      {drafts.find((batch) => batch.id===review.input.batchId && batch.revision===review.input.batchRevision)
        ? <CourseSessionsPreview sessions={drafts.find((batch) => batch.id===review.input.batchId && batch.revision===review.input.batchRevision)!.sessions ?? []} />
        : <p role="alert">The course draft changed. Cancel this review and preview the current revision.</p>}
      <ol className={styles.list}>{review.proposal.document.events.map((event) => <li key={event.key}>
        <strong>{event.title || 'Outline placeholder'} · {event.section}</strong>
        <p>{event.kind === 'outline' ? 'Undated outline item' : `${time(event.startsAt)} – ${time(event.endsAt)}`}</p>
        {event.instructor && <p>Instructor: {event.instructor}</p>}
      </li>)}</ol>
      <div className={styles.buttons}>
        <button type="button" className="btn btn-primary" disabled={pending} onClick={confirm}>{pending ? 'Confirming…' : `Confirm ${review.input.action}`}</button>
        <button type="button" className="btn btn-secondary" disabled={pending} onClick={() => { setReview(null); recovery.forget(); }}>Cancel review</button>
      </div>
    </section>}
    <p role="alert" className={styles.error}>{error}</p>
    <p role="status" aria-live="polite">{message}</p>
    {completionBatchId && <div className={styles.fields}>
      <p>The batch is published. Class-to-session links still need confirmation for this publication before unfinished classes can be marked complete.</p>
      <a className="btn btn-secondary" href={`/admin/v2/batches/${completionBatchId}/live?setup=1#class-session-mapping`}>Set up class completion</a>
    </div>}
  </section>;
}
