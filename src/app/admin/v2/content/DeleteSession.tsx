'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { AdminDraftLink as Link, useAdminDraftGuard } from '@/components/AdminDraftNavigation';
import type { V2BatchInput } from '@/lib/v2Batches';
import type { V2SessionContentKind } from '@/lib/v2Templates';
import { deletedResourceInput, deletedSessionInput } from '@/lib/v2SessionDeletion';
import { loadSessionDraftAction } from './session-actions';
import { previewBatchDraftAction, saveBatchDraftAction } from '../batches/actions';
import styles from './content.module.css';

export default function DeleteSession({ batchId, sessionKey, title, sessionKeys, resource, onClose, onSaved }: {
  batchId: string; sessionKey: string; title: string; sessionKeys: string[]; resource?: { kind: V2SessionContentKind; key: string }; onClose: () => void; onSaved: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null), cancel = useRef<HTMLButtonElement>(null), heading = useRef<HTMLHeadingElement>(null);
  const request = useRef<{ input: V2BatchInput; fingerprint?: string } | null>(null), busy = useRef(false);
  const [pending, setPending] = useState(false), [submitted, setSubmitted] = useState(false), [saved, setSaved] = useState(false);
  const [error, setError] = useState(''), [existingDraft, setExistingDraft] = useState(false);
  const titleId = useId(), descriptionId = useId();
  useAdminDraftGuard(!saved && submitted);
  useEffect(() => { const element = dialog.current; element?.showModal(); cancel.current?.focus(); return () => element?.close(); }, []);
  useEffect(() => { if (saved) heading.current?.focus(); }, [saved]);
  async function save() {
    if (busy.current || saved) return;
    busy.current = true; setPending(true); setError('');
    try {
      if (!request.current) {
        const result = await loadSessionDraftAction(batchId);
        if (result.status !== 'ready') { setExistingDraft(result.status === 'pending'); throw new Error(result.message); }
        request.current = { input: resource ? deletedResourceInput(result.draft, sessionKeys, sessionKey, resource, crypto.randomUUID()) : deletedSessionInput(result.draft, sessionKeys, sessionKey, crypto.randomUUID()) };
      }
      setSubmitted(true);
      if (!request.current.fingerprint) {
        const result = await previewBatchDraftAction(request.current.input);
        if (result.status === 'error') throw new Error(result.message);
        request.current.fingerprint = result.proposal.fingerprint;
      }
      const result = await saveBatchDraftAction(request.current.input, request.current.fingerprint!);
      if (result.status === 'error') throw new Error(result.message);
      setSaved(true); onSaved();
    } catch (error) { setError(error instanceof Error ? error.message : 'Confirmation was interrupted. Retry to confirm the same deletion draft.'); }
    finally { busy.current = false; setPending(false); }
  }
  return <dialog ref={dialog} className={`${styles.locationDialog} ${styles.deleteDialog}`} aria-labelledby={titleId} aria-describedby={descriptionId} aria-busy={pending}
    onCancel={event => { event.preventDefault(); if (!busy.current) onClose(); }}>
    <div className={styles.deleteBody}>
      <h2 id={titleId} ref={heading} tabIndex={-1}>{saved ? 'Deletion saved as a draft' : resource ? 'Delete this resource?' : 'Delete this session?'}</h2>
      <p className={styles.deleteSessionTitle}>{title}</p>
      <p id={descriptionId}>{saved ? 'Students still see the published content. Review and publish the draft to remove it.' : resource ? 'This removes the resource from this session when the course draft is published.' : 'This removes the session and its resources from this course when the draft is published.'}</p>
      {!saved && <p className={styles.muted}>{resource ? 'The stored file and resources in other sessions are kept.' : 'Stored files, other courses and live-class schedules are kept. Existing learning history is retained. Live-session mappings may need review after publishing.'}</p>}
      {error && <p role="alert" className={styles.inlineError}>{error}</p>}
    </div>
    <footer className={styles.locationDialogActions}>
      <button type="button" ref={cancel} disabled={pending} onClick={onClose}>{saved ? 'Done' : submitted ? 'Close' : 'Cancel'}</button>
      {saved ? <Link className={styles.primary} href={`/admin/v2/content/course/${batchId}`}>Review & publish deletion</Link>
        : existingDraft ? <Link href={`/admin/v2/content/course/${batchId}`}>Review saved draft changes</Link>
        : <button type="button" className={styles.deleteConfirm} disabled={pending} onClick={() => void save()}>{pending ? 'Saving…' : submitted ? 'Retry saving deletion' : resource ? 'Delete resource' : 'Delete session'}</button>}
    </footer>
  </dialog>;
}
