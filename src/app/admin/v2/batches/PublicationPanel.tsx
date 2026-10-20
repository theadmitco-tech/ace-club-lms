'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminDraftGuard } from '@/components/AdminDraftNavigation';
import type { V2BatchDraft } from '@/lib/v2Batches';
import type { V2Publication, V2PublicationInput, V2PublicationProposal } from '@/lib/v2Publications';
import { V2_TEMPLATE_PRODUCTS } from '@/lib/v2Templates';
import { previewBatchPublicationAction, saveBatchPublicationAction } from './actions';
import styles from '../templates/templates.module.css';

const time = (value: string | null) => value === null ? 'Unscheduled'
  : new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export default function PublicationPanel({ drafts, publications }: { drafts: V2BatchDraft[]; publications: V2Publication[] }) {
  const router = useRouter();
  const [review, setReview] = useState<{ input: V2PublicationInput; proposal: V2PublicationProposal } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const busy = useRef(false);
  useAdminDraftGuard(pending || review !== null);

  async function preview(batch: V2BatchDraft, action: V2PublicationInput['action']) {
    if (busy.current) return;
    busy.current = true; setPending(true); setReview(null); setError(''); setMessage('');
    const input: V2PublicationInput = { batchId: batch.id, batchRevision: batch.revision,
      expectedRevision: publications.find((item) => item.batchId === batch.id)?.revision ?? 0,
      requestId: crypto.randomUUID(), action };
    try {
      const result = await previewBatchPublicationAction(input);
      if (result.status === 'error') setError(result.message);
      else setReview({ input, proposal: result.proposal });
    } catch { setError('The publication preview could not be loaded. Please retry.'); }
    finally { busy.current = false; setPending(false); }
  }

  async function confirm() {
    if (!review || busy.current) return;
    busy.current = true; setPending(true); setError(''); setMessage('');
    try {
      const result = await saveBatchPublicationAction(review.input, review.proposal.fingerprint);
      if (result.status === 'error') { setError(result.message); return; }
      setReview(null);
      setMessage(`Publication revision ${result.document.revision} ${result.document.state}${result.replayed ? ' (previous confirmation recovered)' : ''}.`);
      router.refresh();
    } catch { setError('Confirmation was interrupted. Retry this same review to recover the submission.'); }
    finally { busy.current = false; setPending(false); }
  }

  return <section className={styles.card} aria-labelledby="publication-heading" aria-busy={pending}>
    <h2 id="publication-heading">Review batch publication</h2>
    <p>Publish a saved outline and schedule. Further draft edits need another review before they replace the published version.</p>
    <p>Student delivery is awaiting the batch-access decision. This action does not open registration, publish meeting links, or change purchased access.</p>
    {!drafts.length && <p>Save a batch draft to review publication.</p>}
    <ul className={styles.list}>{drafts.map((batch) => {
      const published = publications.find((item) => item.batchId === batch.id);
      return <li key={batch.id}>
        <strong>{batch.title}</strong>
        <p>Saved draft {batch.revision} · {published ? `${published.state}, source draft ${published.batchRevision}` : 'Never published'}</p>
        <div className={styles.buttons}>
          <button type="button" className="btn btn-secondary" disabled={pending} onClick={() => preview(batch, 'publish')}>Preview publication</button>
          {published?.state === 'published' && <button type="button" className="btn btn-secondary" disabled={pending} onClick={() => preview(batch, 'unpublish')}>Review unpublish</button>}
        </div>
      </li>;
    })}</ul>
    {review && <section className={styles.fields} aria-labelledby="publication-scope">
      <h3 id="publication-scope">{review.input.action === 'publish' ? 'Publish' : 'Unpublish'}: {review.proposal.document.title}</h3>
      <p>Scope: this batch only · {V2_TEMPLATE_PRODUCTS[review.proposal.document.productCode].label} · {review.proposal.document.sections.join(', ')}</p>
      <p>Saved draft {review.input.batchRevision} → publication revision {review.proposal.document.revision}. All times IST.</p>
      <p>{review.proposal.document.liveRegistrationLimit === 8 ? 'Live-course registration limit: 8. Registration enforcement belongs to checkout; no session reservations.' : 'No scheduled live sessions.'}</p>
      <ol className={styles.list}>{review.proposal.document.events.map((event) => <li key={event.key}>
        <strong>{event.title || 'Outline placeholder'} · {event.section}</strong>
        <p>{event.kind === 'outline' ? 'Undated outline item' : `${time(event.startsAt)} – ${time(event.endsAt)}`}</p>
        {event.instructor && <p>Instructor: {event.instructor}</p>}
      </li>)}</ol>
      <div className={styles.buttons}>
        <button type="button" className="btn btn-primary" disabled={pending} onClick={confirm}>{pending ? 'Confirming…' : `Confirm ${review.input.action}`}</button>
        <button type="button" className="btn btn-secondary" disabled={pending} onClick={() => setReview(null)}>Cancel review</button>
      </div>
    </section>}
    <p role="alert" className={styles.error}>{error}</p>
    <p role="status" aria-live="polite">{message}</p>
  </section>;
}
