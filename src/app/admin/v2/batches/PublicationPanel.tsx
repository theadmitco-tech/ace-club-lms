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
import styles from '../templates/templates.module.css';
import batchStyles from './batchWorkspace.module.css';

const time = (value: string | null) => value === null ? 'Unscheduled'
  : new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export default function PublicationPanel({ drafts, publications, ownerId, focused = false, onBack }: { drafts: V2BatchDraft[]; publications: V2Publication[]; ownerId: string; focused?: boolean; onBack?: () => void }) {
  const router = useRouter();
  const [review, setReview] = useState<{ input: V2PublicationInput; proposal: V2PublicationProposal } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [completionBatchId, setCompletionBatchId] = useState<string | null>(null);
  const busy = useRef(false);
  const recovery = useDraftRecovery<PublicationWorkspace>(ownerId, 'v2-publication', isPublicationWorkspace);
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
      const saved = readDraftRecovery(window.sessionStorage, ownerId, 'v2-publication');
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
      setMessage(focused ? result.document.state === 'published' ? 'Batch published. Enrolled students with active course access can now see it.' : 'Batch unpublished. It is now hidden from students.' : `Publication revision ${result.document.revision} ${result.document.state}${result.replayed ? ' (previous confirmation recovered)' : ''}.`);
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
    return <section className={batchStyles.schedule} aria-labelledby="publication-heading" aria-busy={pending}>
      <DraftRecoveryNotice available={!!recovery.recovered} unavailable={recovery.unavailable} onRestore={() => {
        if (!recovery.recovered) return;
        setReview(recovery.recovered); recovery.acknowledge();
      }} onDiscard={recovery.forget} />
      <h2 id="publication-heading" className={batchStyles.publishTitle}>{message ? 'Done' : review ? unpublish ? 'Hide this batch?' : 'Ready to publish?' : unchanged ? 'This batch is published' : 'Publish this batch'}</h2>
      {message ? <>
        <p role="status" className={batchStyles.publishHelp}>{message}</p>
        {completionBatchId && <p className={batchStyles.publishHelp}>Before marking a class complete, check its linked course session in Class completion.</p>}
        <div className={batchStyles.actions}>
          {onBack && <button type="button" className="btn btn-primary" onClick={onBack}>View schedule</button>}
          {completionBatchId && <a className="btn btn-secondary" href={`/admin/v2/batches/${completionBatchId}/live?setup=1#class-session-mapping`}>Set up class completion</a>}
        </div>
      </> : review && document ? <>
        <p className={batchStyles.publishHelp}>{unpublish ? 'This hides the batch’s course and live schedule from students. The saved batch can be published again later.' : 'Check the dates and times below. Publishing makes this batch available to enrolled students with active course access.'}</p>
        <div className={batchStyles.publishSummary}><strong>{document.title}</strong><span>{document.sections.map(section => V2_TEMPLATE_PRODUCTS[section].label).join(' · ')}{liveClasses.length ? ` · ${liveClasses.length} live ${liveClasses.length === 1 ? 'class' : 'classes'} · All times IST` : ''}</span></div>
        {!unpublish && <>
          <ol className={batchStyles.publishClasses}>{liveClasses.map(event => <li key={event.key}>
            <div><strong>{event.title}</strong>{event.instructor && <span>{event.instructor}</span>}</div>
            <span>{event.startsAt ? new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(event.startsAt)) : 'Date to be set'}{event.endsAt && ` – ${new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' }).format(new Date(event.endsAt))}`}</span>
          </li>)}</ol>
          {reviewedDraft && <details className={batchStyles.publishDetails}><summary>Included course content</summary><CourseSessionsPreview sessions={reviewedDraft.sessions ?? []} /></details>}
          {!!liveClasses.length && <aside className={batchStyles.publishNote} aria-label="Class completion setup">
            {liveClasses.some(event => !(document.sessions ?? []).some(session => session.section === event.section))
              ? <p>A course session is missing for class feedback. <a href={`/admin/v2/batches?batch=${review.input.batchId}&outline=1`}>Add a course session</a> before setting up class completion.</p>
              : <p>After publishing, {review.input.expectedRevision > 0 ? 'recheck' : 'choose'} the linked course session for each unfinished class in <strong>Class completion</strong>. This connects student feedback to the right lesson.</p>}
          </aside>}
        </>}
        {!reviewedDraft && <p role="alert" className="workflow-error">The saved batch changed. Cancel this review and review it again.</p>}
        <div className={batchStyles.footer}>
          <button type="button" className="btn btn-secondary" disabled={pending} onClick={cancel}>Cancel review</button>
          <button type="button" className="btn btn-primary" disabled={pending || !reviewedDraft} onClick={confirm}>{pending ? 'Saving…' : unpublish ? 'Unpublish batch' : 'Publish batch'}</button>
        </div>
      </> : <>
        <p className={batchStyles.publishHelp}>{unchanged ? 'Students see the latest saved version. Edit the schedule when something changes.' : 'The saved batch is private until published. Review it once, then publish when ready.'}</p>
        {selected ? <div className={batchStyles.actions}>
          {!unchanged && <button type="button" className="btn btn-primary" disabled={pending || !!recovery.recovered} onClick={() => preview(selected, 'publish')}>{pending ? 'Loading review…' : 'Review batch'}</button>}
          {onBack && <button type="button" className="btn btn-secondary" disabled={pending} onClick={onBack}>Back to schedule</button>}
          {published?.state === 'published' && <details className={batchStyles.publishDetails}><summary>Unpublish batch</summary><p className={batchStyles.publishHelp}>Hide this batch from students. A confirmation is required.</p><button type="button" className="btn btn-secondary" disabled={pending || !!recovery.recovered} onClick={() => preview(selected, 'unpublish')}>Review unpublish</button></details>}
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
          {published?.state === 'published' && <details><summary>More actions</summary><button type="button" className="btn btn-secondary" disabled={pending || !!recovery.recovered || !!review} onClick={() => preview(batch, 'unpublish')}>Review unpublish</button></details>}
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
