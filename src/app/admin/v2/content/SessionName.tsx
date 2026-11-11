'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useAdminDraftGuard } from '@/components/AdminDraftNavigation';
import type { ContentDocument, ContentWorkspace, ContentScope } from '@/lib/v2ContentPublishing';
import styles from './content.module.css';

class NameConflictError extends Error {}

async function operation(action: string, input: object) {
  const response = await fetch('/api/admin/v2/content', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, input }) });
  const result = await response.json();
  if (response.status === 409) throw new NameConflictError('The course changed. Close and reopen the name editor to review the latest version.');
  if (!response.ok) throw new Error(result.error || 'The name could not be confirmed.');
  return result;
}
export default function SessionName({ batchId, sessionKey, title, workspace, onClose, onUpdated }: {
  batchId: string; sessionKey: string; title: string; workspace: ContentWorkspace;
  onClose: () => void; onUpdated: (workspace: ContentWorkspace) => void;
}) {
  const existing = workspace.items.filter(item => !item.deleted && item.document.kind === 'heading' && item.document.targets.some(target => target.batchId === batchId && target.sessionKey === sessionKey));
  const fieldId = useId(), errorId = useId();
  const input = useRef<HTMLInputElement>(null), reviewButton = useRef<HTMLButtonElement>(null);
  const [invalid, setInvalid] = useState(false);
  const [name, setName] = useState(existing[0]?.document.title ?? title);
  const [pending, setPending] = useState(false), [error, setError] = useState(''), [scope, setScope] = useState<ContentScope | null>(null);
  useEffect(() => { if (scope) reviewButton.current?.focus(); }, [scope]);
  const request = useRef<{ id: string; requestId: string; revision: number; document: ContentDocument; savedRevision?: number } | null>(null);
  const confirmation = useRef<string | null>(null), busy = useRef(false);
  const [submitted, setSubmitted] = useState(false), [conflict, setConflict] = useState(false);
  useAdminDraftGuard(submitted || name !== (existing[0]?.document.title ?? title));
  async function handleError(error: unknown, fallback: string) {
    setError(error instanceof Error ? error.message : fallback);
    if (error instanceof NameConflictError) {
      setConflict(true);
      try { onUpdated(await operation('workspace', {}) as ContentWorkspace); } catch { setError('The course changed. Reload the page before renaming.'); }
    }
  }
  async function review() {
    if (busy.current || conflict) return;
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 120) { setInvalid(true); setError('Enter a session name of up to 120 characters.'); input.current?.focus(); return; }
    if (existing.length > 1) { setError('Several name changes target this session. The course changes need review before renaming.'); return; }
    busy.current = true; setPending(true); setError(''); setInvalid(false);
    try {
      const course = workspace.courses.find(item => item.batchId === batchId);
      if (!course) throw new Error('Reload the course before renaming.');
      request.current ??= { id: existing[0]?.id ?? crypto.randomUUID(), requestId: crypto.randomUUID(), revision: existing[0]?.draft_revision ?? 0,
        document: { title: trimmed, kind: 'heading', url: null, targets: existing[0]?.document.targets.map(target => ({ ...target, publicationRevision: workspace.courses.find(item => item.batchId === target.batchId)?.publicationRevision ?? target.publicationRevision })) ?? [{ batchId, sessionKey, publicationRevision: course.publicationRevision, placement: 'session', anchorKey: null, replaceKey: null, order: 100 }] } };
      setSubmitted(true);
      if (!request.current.savedRevision) {
        const saved = await operation('save', request.current);
        request.current.savedRevision = saved.revision;
      }
      onUpdated(await operation('workspace', {}) as ContentWorkspace);
      setScope(await operation('scope', { id: request.current.id, revision: request.current.savedRevision, action: 'publish' }));
      confirmation.current ??= crypto.randomUUID();
    } catch (error) { await handleError(error, 'Confirmation was interrupted. Retry the same name change.'); }
    finally { busy.current = false; setPending(false); }
  }
  async function publish() {
    if (!scope || busy.current || conflict) return;
    busy.current = true; setPending(true); setError(''); setInvalid(false);
    try {
      await operation('confirm', { ...scope, requestId: confirmation.current });
      const current = await operation('workspace', {}) as ContentWorkspace;
      onUpdated(current); onClose();
    } catch (error) { await handleError(error, 'Confirmation was interrupted. Retry the same publication.'); }
    finally { busy.current = false; setPending(false); }
  }
  return <form className={styles.inlineEditor} aria-label="Rename session" aria-busy={pending} noValidate onSubmit={event => { event.preventDefault(); void (scope ? publish() : review()); }}>
    <label htmlFor={fieldId}>Session name<input id={fieldId} ref={input} aria-invalid={invalid || undefined} aria-describedby={error ? errorId : undefined} autoFocus value={name} maxLength={120} required disabled={pending || submitted} onChange={event => { setName(event.target.value); setInvalid(false); }} onKeyDown={event => { if (event.key === 'Escape' && !pending) { event.preventDefault(); onClose(); } }} /></label>
    {scope ? <><p>The new name will appear in:</p><ul>{scope.targets.map((target, index) => <li key={index}>{target.courseTitle} · {target.sessionTitle}</li>)}</ul></> : <p className={styles.muted}>The name is reviewed here before it changes for students.</p>}
    {error && <p id={errorId} role="alert">{error}</p>}
    <button ref={reviewButton} type="submit" className={styles.primary} disabled={pending || conflict}>{pending ? 'Saving…' : scope ? 'Publish name' : submitted ? 'Retry name review' : 'Review name'}</button>
    {scope && !conflict && <button type="button" disabled={pending} onClick={() => { request.current = null; confirmation.current = null; setScope(null); setSubmitted(false); setError(''); requestAnimationFrame(() => input.current?.focus()); }}>Edit name</button>}
    <button type="button" disabled={pending} onClick={onClose}>{submitted ? 'Close — keep name draft' : 'Cancel'}</button>
    {submitted && !scope && <p className={styles.muted}>A submitted name draft may exist. Retrying uses the same request.</p>}
  </form>;
}
