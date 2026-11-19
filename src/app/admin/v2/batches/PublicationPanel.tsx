'use client';
import { CourseSessionsPreview } from '../templates/CourseSessions';

import { useRef, useState } from 'react';
import { DraftRecoveryNotice, useDraftRecovery } from '@/components/DraftRecovery';
import { isPublicationWorkspace, type PublicationWorkspace } from '@/lib/v2WorkspaceRecovery';
import { useRouter } from 'next/navigation';
import { useAdminDraftGuard } from '@/components/AdminDraftNavigation';
import type { V2BatchDraft } from '@/lib/v2Batches';
import type { V2Publication, V2PublicationInput, V2PublicationProposal } from '@/lib/v2Publications';
import { V2_TEMPLATE_PRODUCTS, v2CourseDeliveryLabel } from '@/lib/v2Templates';
import { previewBatchPublicationAction, saveBatchPublicationAction } from './actions';
import styles from '../templates/templates.module.css';

const time = (value: string | null) => value === null ? 'Unscheduled'
  : new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export default function PublicationPanel({ drafts, publications, ownerId }: { drafts: V2BatchDraft[]; publications: V2Publication[]; ownerId: string }) {
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

  async function confirm() {
    if (!review || busy.current) return;
    busy.current = true; setPending(true); setError(''); setMessage('');
    try {
      const result = await saveBatchPublicationAction(review.input, review.proposal.fingerprint);
      if (result.status === 'error') { setError(result.message); return; }
      recovery.forget();
      setReview(null);
      setMessage(`Publication revision ${result.document.revision} ${result.document.state}${result.replayed ? ' (previous confirmation recovered)' : ''}.`);
      setCompletionBatchId(result.document.state === 'published' && result.document.events.some((event: V2Publication['events'][number]) => event.kind === 'live') ? result.document.batchId : null);
      router.refresh();
    } catch { setError('Confirmation was interrupted. Retry this same review to recover the submission.'); }
    finally { busy.current = false; setPending(false); }
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
