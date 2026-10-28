'use client';

import { useRef, useState, type FormEvent } from 'react';
import { DraftRecoveryNotice, useDraftRecovery } from '@/components/DraftRecovery';
import { isMeetingWorkspace, type MeetingWorkspace } from '@/lib/v2WorkspaceRecovery';
import { useAdminDraftGuard } from '@/components/AdminDraftNavigation';
import { useRouter } from 'next/navigation';
import { validateV2MeetingInput, type V2MeetingDraft, type V2MeetingInput } from '@/lib/v2Meetings';
import { saveMeetingDraftAction } from './actions';
import styles from '../../../templates/templates.module.css';

export default function MeetingDraftEditor({ draft, ownerId }: { draft: V2MeetingDraft; ownerId: string }) {
  const router = useRouter();
  const [links, setLinks] = useState(draft.links);
  const [revision, setRevision] = useState(draft.revision);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [review, setReview] = useState<V2MeetingInput | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const busy = useRef(false);

  const recovery = useDraftRecovery<MeetingWorkspace>(ownerId, `v2-meeting:${draft.batch.id}`, isMeetingWorkspace);
  useAdminDraftGuard(dirty || pending);

  function restore() {
    const saved = recovery.recovered;
    if (!saved) return;
    if (saved.batchRevision !== draft.batch.revision) {
      setError('The batch schedule changed. Reload current links and review your changes against the latest schedule.');
      return;
    }
    setLinks(saved.links); setRevision(saved.revision); setRequestId(saved.requestId);
    setReview(saved.review); setDirty(true); recovery.acknowledge();
  }

  function reviewChanges(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || !dirty || !requestId) return;
    const input = { batchId: draft.batch.id, batchRevision: draft.batch.revision, expectedRevision: revision, requestId, links };
    const invalid = validateV2MeetingInput(input);
    if (invalid) { setError(invalid); return; }
    recovery.remember({ batchRevision: draft.batch.revision, revision, requestId, links, review: input });
    setReview(structuredClone(input));
    setError('');
  }

  async function save() {
    if (!review || busy.current) return;
    busy.current = true;
    setPending(true);
    setError('');
    try {
      const result = await saveMeetingDraftAction(review);
      if (result.status === 'error') { setError(result.message); return; }
      recovery.forget();
      setRevision(result.receipt.revision);
      setDirty(false);
      setReview(null);
      setRequestId(null);
      setMessage(result.receipt.replayed ? 'Previous save recovered. Reload the latest draft before further edits.' : 'Private meeting draft saved.');
    } catch {
      setError('Save confirmation was interrupted. Confirm the same review again to recover the submission.');
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return <form onSubmit={reviewChanges} className={`${styles.workspace} ${styles.card}`} aria-busy={pending}>
    <DraftRecoveryNotice available={!!recovery.recovered} unavailable={recovery.unavailable} onRestore={restore} onDiscard={recovery.forget} />
    <h2>{draft.batch.title}</h2>
    <p>All times use Asia/Kolkata (IST). Empty links are allowed in a draft. Saving does not publish links or give students access.</p>
    <fieldset className={styles.fields} disabled={pending || !!recovery.recovered}>
      <legend className={styles.legend}>Google Meet links</legend>
      <p id="meeting-format">Use the canonical link, for example https://meet.google.com/abc-defg-hij, without extra parameters.</p>
      {draft.batch.events.filter((event) => event.kind !== 'outline').map((event) => <label htmlFor={`${event.key}-meet`} key={event.key}>
        {event.title} · {event.localDate} at {event.localStartTime} IST
        <input id={`${event.key}-meet`} type="url" className="form-input" maxLength={36} autoComplete="off" spellCheck={false}
          aria-describedby="meeting-format" value={links.find((link) => link.key === event.key)?.url ?? ''}
          onChange={(e) => {
            const nextLinks = links.map((link) => link.key === event.key ? { ...link, url: e.target.value || null } : link);
            const nextRequest = crypto.randomUUID();
            recovery.remember({ batchRevision: draft.batch.revision, revision, requestId: nextRequest, links: nextLinks, review: null });
            setLinks(nextLinks);
            setRequestId(nextRequest); setDirty(true); setReview(null); setError(''); setMessage('');
          }} />
      </label>)}
      <button type="submit" className="btn btn-secondary" disabled={!dirty || pending}>Review meeting changes</button>
    </fieldset>
    {review && <section className={styles.fields} aria-labelledby="meeting-review-heading">
      <h3 id="meeting-review-heading">Review private links</h3>
      <ul className={styles.list}>{review.links.map((link) => <li key={link.key}>
        <strong>{draft.batch.events.find((event) => event.key === link.key)?.title}</strong>
        <p>{link.url ?? 'No meeting link'}</p>
      </li>)}</ul>
      <button type="button" className="btn btn-primary" disabled={pending} onClick={save}>{pending ? 'Saving…' : 'Confirm and save private draft'}</button>
    </section>}
    <p role="alert" className={styles.error}>{error}</p>
    <p role="status" aria-live="polite">{message || (dirty ? 'Unsaved meeting changes' : '')}</p>
    <div className={styles.buttons}>
      <button type="button" className="btn btn-secondary" disabled={pending} onClick={() => window.location.reload()}>Reload current draft</button>
      <button type="button" className="btn btn-secondary" disabled={pending} onClick={() => {
        if (!dirty || window.confirm('Discard unsaved meeting changes?')) router.push('/admin/v2/batches');
      }}>Return to batch drafts</button>
    </div>
  </form>;
}
