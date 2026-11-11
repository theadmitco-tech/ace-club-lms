'use client';

import { useRef, useState } from 'react';
import { AdminDraftLink as Link, useAdminDraftGuard } from '@/components/AdminDraftNavigation';
import { editableV2BatchEvents, type V2BatchInput } from '@/lib/v2Batches';
import { loadSessionDraftAction } from './session-actions';
import { previewBatchDraftAction, saveBatchDraftAction } from '../batches/actions';
import styles from './content.module.css';

export default function AddSession({ batchId, onClose }: { batchId: string; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [pending, setPending] = useState(false), [saved, setSaved] = useState(false), [error, setError] = useState(''), [existingDraft, setExistingDraft] = useState(false);
  const request = useRef<{ input: V2BatchInput; fingerprint?: string } | null>(null);
  const busy = useRef(false);
  const [submitted, setSubmitted] = useState(false);
  useAdminDraftGuard(!saved && (!!title || pending));
  async function add() {
    if (busy.current) return;
    const name = title.trim();
    if (!name || name.length > 120) { setError('Enter a session name of up to 120 characters.'); return; }
    busy.current = true; setPending(true); setError('');
    try {
      if (!request.current) {
        const result = await loadSessionDraftAction(batchId);
        if (result.status !== 'ready') { setExistingDraft(result.status === 'pending'); throw new Error(result.message); }
        const draft = result.draft;
        request.current = { input: {
          id: draft.id, templateId: draft.templateId, templateRevision: draft.templateRevision,
          expectedRevision: draft.revision, requestId: crypto.randomUUID(), title: draft.title,
          startDate: draft.startDate, timeZone: draft.timeZone, events: editableV2BatchEvents(draft.events),
          sessions: [...(draft.sessions ?? []), { key: crypto.randomUUID(), title: name, section: draft.productCode as 'quant' | 'verbal' | 'di', content: { preSessionReads: [], recordings: [], postSessionReads: [], materials: [] } }],
        } };
      }
      setSubmitted(true);
      if (!request.current.fingerprint) {
        const preview = await previewBatchDraftAction(request.current.input);
        if (preview.status === 'error') throw new Error(preview.message);
        request.current.fingerprint = preview.proposal.fingerprint;
      }
      if (!request.current.fingerprint) throw new Error('The session could not be reviewed. Retry shortly.');
      const result = await saveBatchDraftAction(request.current.input, request.current.fingerprint);
      if (result.status === 'error') throw new Error(result.message);
      setSaved(true);
    } catch (error) { setError(error instanceof Error ? error.message : 'Save confirmation was interrupted. Retry to recover the same session.'); }
    finally { busy.current = false; setPending(false); }
  }
  return <section className={styles.inlineEditor} aria-label="Add session">
    {saved ? <><h3>Session draft saved</h3><p>“{title.trim()}” is ready for publication. Existing student content stays available.</p><Link className={styles.primary} href={`/admin/v2/batches?batch=${batchId}&review=1`}>Review & publish session</Link><button onClick={onClose}>Done</button></> : <form onSubmit={event => { event.preventDefault(); void add(); }}>
      <label>New session name<input autoFocus required maxLength={120} value={title} disabled={pending || submitted} onChange={event => setTitle(event.target.value)} /></label>
      <p className={styles.muted}>The session starts with empty readings, recording and worksheet sections. It stays private until published.</p>
      {error && <p role="alert">{error}</p>}
      {existingDraft ? <Link href={`/admin/v2/batches?batch=${batchId}&review=1`}>Review saved draft changes</Link> : <button className={styles.primary} disabled={pending} type="submit">{pending ? 'Saving…' : submitted ? 'Retry saving session' : 'Add session'}</button>}
      <button type="button" disabled={pending} onClick={onClose}>Cancel</button>
    </form>}
  </section>;
}
