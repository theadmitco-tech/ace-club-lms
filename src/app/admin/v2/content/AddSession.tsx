'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { AdminDraftLink as Link, useAdminDraftGuard } from '@/components/AdminDraftNavigation';
import { editableV2BatchEvents, type V2BatchInput } from '@/lib/v2Batches';
import { emptyV2SessionContent, isV2ContentUrl, type V2SessionContent } from '@/lib/v2Templates';
import { V2_SESSION_STAGES } from '@/lib/v2SessionPresentation';
import SessionDraftResources from './SessionDraftResources';
import { loadSessionDraftAction } from './session-actions';
import { previewBatchDraftAction, saveBatchDraftAction } from '../batches/actions';
import styles from './content.module.css';

export default function AddSession({ batchId, onClose, onSaved }: { batchId: string; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState<V2SessionContent>(emptyV2SessionContent);
  const [invalidResource, setInvalidResource] = useState<string | null>(null);
  const fieldId = useId(), errorId = useId();
  const input = useRef<HTMLInputElement>(null), heading = useRef<HTMLHeadingElement>(null);
  const [invalid, setInvalid] = useState(false);
  const [pending, setPending] = useState(false), [saved, setSaved] = useState<string | null>(null), [error, setError] = useState(''), [existingDraft, setExistingDraft] = useState(false);
  useEffect(() => { if (saved) heading.current?.focus(); }, [saved]);
  const request = useRef<{ input: V2BatchInput; sessionKey: string; fingerprint?: string } | null>(null);
  const busy = useRef(false);
  const [submitted, setSubmitted] = useState(false);
  const resourceCount = Object.values(content).reduce((count, items) => count + items.length, 0);
  useAdminDraftGuard(!saved && (!!title || resourceCount > 0 || pending));
  async function add() {
    if (busy.current) return;
    const name = title.trim();
    if (!name || name.length > 120) { setInvalid(true); setError('Enter a session name of up to 120 characters.'); input.current?.focus(); return; }
    for (const { kind, title: label } of V2_SESSION_STAGES) {
      for (const item of content[kind]) {
        const field = !item.title.trim() || item.title.trim().length > 120 ? 'title'
          : !isV2ContentUrl(item.url.trim()) || item.url.trim().length > 2048 ? 'url' : null;
        if (field) {
          const id = `${item.key}-${field}`;
          setInvalidResource(id); setInvalid(false);
          setError(field === 'title' ? `${label}: enter a title of up to 120 characters.` : `${label}: enter a valid HTTPS link or stored PDF link.`);
          const control = document.getElementById(id);
          const disclosure = control?.closest('details'); if (disclosure) disclosure.open = true;
          control?.focus(); return;
        }
      }
    }
    busy.current = true; setPending(true); setError(''); setInvalid(false);
    setInvalidResource(null);
    try {
      if (!request.current) {
        const result = await loadSessionDraftAction(batchId);
        if (result.status !== 'ready') { setExistingDraft(result.status === 'pending'); throw new Error(result.message); }
        const draft = result.draft;
        const sessionKey = crypto.randomUUID();
        request.current = { sessionKey, input: {
          id: draft.id, templateId: draft.templateId, templateRevision: draft.templateRevision,
          expectedRevision: draft.revision, requestId: crypto.randomUUID(), title: draft.title,
          startDate: draft.startDate, timeZone: draft.timeZone, events: editableV2BatchEvents(draft.events),
          sessions: [...(draft.sessions ?? []), { key: sessionKey, title: name, section: draft.productCode as 'quant' | 'verbal' | 'di', content: Object.fromEntries(Object.entries(content).map(([kind, items]) => [kind, items.map(item => ({ ...item, title: item.title.trim(), url: item.url.trim() }))])) as V2SessionContent }],
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
      setSaved(request.current.sessionKey); onSaved();
    } catch (error) { setError(error instanceof Error ? error.message : 'Save confirmation was interrupted. Retry to recover the same session.'); }
    finally { busy.current = false; setPending(false); }
  }
  return <section className={styles.inlineEditor} aria-label="Add session" aria-busy={pending}>
    {saved ? <><h3 ref={heading} tabIndex={-1}>Session draft saved</h3><p>“{title.trim()}” is saved privately with {resourceCount} {resourceCount === 1 ? 'resource' : 'resources'}. Existing student content is unchanged.</p>{resourceCount === 0 && <p>No resources have been added. Resources can be prepared in the saved draft before publication.</p>}<Link className={styles.primary} href={`/admin/v2/batches?batch=${batchId}&outline=1&session=${saved}`}>Edit session draft</Link><Link href={`/admin/v2/batches?batch=${batchId}&review=1`}>Review & publish session</Link><button onClick={onClose}>Done</button></> : <form noValidate onSubmit={event => { event.preventDefault(); void add(); }}>
      <h2 className={styles.taskTitle}>Add a session</h2><label htmlFor={fieldId}>New session name<input id={fieldId} ref={input} aria-invalid={invalid || undefined} aria-describedby={error ? errorId : undefined} placeholder="e.g. Ratios and proportions" autoFocus required maxLength={120} value={title} disabled={pending || submitted} onChange={event => { setTitle(event.target.value); setInvalid(false); }} /></label>
      <fieldset disabled={pending || submitted} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}><legend className={styles.visuallyHidden}>Private session resources</legend><SessionDraftResources content={content} invalidField={invalidResource} errorId={errorId} onChange={next => { setContent(next); setInvalidResource(null); setError(''); }} /></fieldset>
      {error && <p id={errorId} role="alert">{error}</p>}
      {existingDraft ? <Link href={`/admin/v2/batches?batch=${batchId}&review=1`}>Review saved draft changes</Link> : <button className={styles.primary} disabled={pending} type="submit">{pending ? 'Saving…' : submitted ? 'Retry saving session' : 'Add session'}</button>}
      <button type="button" disabled={pending} onClick={onClose}>Cancel</button>
    </form>}
  </section>;
}
