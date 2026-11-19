'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { useAdminDraftGuard } from '@/components/AdminDraftNavigation';
import { resourceRows, resourceOrderDocuments, type ResourceRow } from '@/lib/adminResourceRows';
import { CONTENT_PLACEMENTS, type ContentCourse, type ContentDocument, type ContentItem, type ContentScope, type ContentWorkspace } from '@/lib/v2ContentPublishing';
import type { V2CourseSession, V2SessionContentKind } from '@/lib/v2Templates';
import DeleteSession from './DeleteSession';
import styles from './content.module.css';

class ResourceConflict extends Error {}
async function operation(action: string, input: object) {
  const response = await fetch('/api/admin/v2/content', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, input }) });
  const value = await response.json();
  if (response.status === 409) throw new ResourceConflict('This resource changed in another tab. Close this panel, reload the page and review the latest version.');
  if (!response.ok) throw new Error(value.error || 'The update could not be confirmed. Retry the same request.');
  return value;
}
type Change = { id: string; requestId: string; revision: number; document: ContentDocument; savedRevision?: number; scope?: ContentScope; confirmId: string; started?: boolean; confirmed?: boolean };
function workspaceVersion(workspace: ContentWorkspace) {
  return JSON.stringify({ items: [...workspace.items].sort((a, b) => a.id.localeCompare(b.id)).map(item => [item.id, item.draft_revision, item.published_revision, item.visible, item.deleted, item.publication_version]), courses: [...workspace.courses].sort((a, b) => a.batchId.localeCompare(b.batchId)).map(course => [course.batchId, course.publicationRevision]) });
}
export default function ResourceList({ workspace, course, session, kind, title, disabled, onActive, onUpdated, onEdit, onOriginal, onDraftSaved }: {
  workspace: ContentWorkspace; course: ContentCourse; session: V2CourseSession; kind: V2SessionContentKind; title: string; disabled: boolean;
  onActive: (active: boolean) => void; onUpdated: (workspace: ContentWorkspace) => void;
  onEdit: (item: ContentItem) => void; onOriginal: (key: string) => void; onDraftSaved: () => void;
}) {
  const container = useRef<HTMLDivElement>(null), positions = useRef(new Map<string, number>());
  const rows = resourceRows(workspace, course, session, kind);
  const [ordered, setOrdered] = useState<ResourceRow[] | null>(null), [removing, setRemoving] = useState<ResourceRow | null>(null);
  const [reviewing, setReviewing] = useState(false), [pending, setPending] = useState(false), [error, setError] = useState(''), [conflict, setConflict] = useState(false);
  const [partial, setPartial] = useState(false);
  const [submitted, setSubmitted] = useState(false), [message, setMessage] = useState('');
  const [scopes, setScopes] = useState<ContentScope[]>([]);
  const requests = useRef<Change[] | null>(null), busy = useRef(false), trigger = useRef<HTMLElement | null>(null);
  const expected = useRef<ContentWorkspace | null>(null);
  const [dragging, setDragging] = useState<string | null>(null), [over, setOver] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null), cancel = useRef<HTMLButtonElement>(null), titleId = useId();
  useAdminDraftGuard(ordered !== null || submitted || pending);
  useEffect(() => {
    if (!reviewing && !(removing?.item)) return;
    const element = dialog.current; element?.showModal(); cancel.current?.focus();
    return () => element?.close();
  }, [reviewing, removing]);
  useLayoutEffect(() => {
    for (const row of container.current?.querySelectorAll<HTMLElement>('[data-resource-key]') ?? []) {
      const old = positions.current.get(row.dataset.resourceKey!);
      const top = row.getBoundingClientRect().top;
      if (old !== undefined && old !== top && !matchMedia('(prefers-reduced-motion: reduce)').matches) row.animate([{ transform: `translateY(${old - top}px)` }, { transform: 'translateY(0)' }], { duration: 160, easing: 'ease-out' });
      positions.current.set(row.dataset.resourceKey!, top);
    }
  }, [ordered]);
  function close() {
    if (busy.current) return;
    setOrdered(null); setRemoving(null); setReviewing(false); setSubmitted(false); setScopes([]); setPartial(false); setError(''); setConflict(false); requests.current = null; onActive(false);
    requestAnimationFrame(() => (trigger.current?.isConnected ? trigger.current : container.current)?.focus({ preventScroll: true }));
  }
  async function task(run: () => Promise<void>) {
    if (busy.current || conflict) return;
    busy.current = true; setPending(true); setError('');
    try { await run(); } catch (e) { setPartial(requests.current?.some(change => change.confirmed) ?? false); setError(e instanceof Error ? e.message : 'The update could not be confirmed.'); if (e instanceof ResourceConflict) setConflict(true); }
    finally { busy.current = false; setPending(false); }
  }
  function startOrder(button: HTMLElement) {
    trigger.current = button; setOrdered(rows); setMessage('Drag resources into the preferred order.'); onActive(true);
  }
  function move(index: number, delta: number) {
    if (!ordered || submitted) return;
    const next = [...ordered], destination = index + delta;
    [next[index], next[destination]] = [next[destination], next[index]];
    setOrdered(next); setMessage(`${ordered[index].title} moved to position ${destination + 1}.`);
  }
  async function prepareOrder() {
    await task(async () => {
      if (!ordered) return;
      requests.current ??= resourceOrderDocuments(ordered, kind).map(({ row, document }) => ({ id: row.item?.id ?? crypto.randomUUID(), requestId: crypto.randomUUID(), revision: row.item?.draft_revision ?? 0, document, confirmId: crypto.randomUUID() }));
      if (!requests.current.length) { setMessage('The resource order is unchanged.'); return; }
      setSubmitted(true);
      for (const change of requests.current) {
        if (change.savedRevision === undefined) change.savedRevision = (await operation('save', { id: change.id, requestId: change.requestId, revision: change.revision, document: change.document })).revision;
      }
      expected.current = await operation('workspace', {});
      for (const change of requests.current) change.scope = await operation('scope', { id: change.id, revision: change.savedRevision, action: 'publish' });
      onUpdated(structuredClone(expected.current!));
      setScopes(requests.current.map(change => change.scope!)); setReviewing(true);
    });
  }
  async function prepareDelete(row: ResourceRow, button: HTMLElement) {
    trigger.current = button; setRemoving(row); onActive(true); setMessage('');
    if (!row.item) return;
    await task(async () => {
      const scope = await operation('scope', { id: row.item!.id, revision: row.item!.draft_revision, action: 'delete' });
      requests.current = [{ id: row.item!.id, requestId: crypto.randomUUID(), revision: row.item!.draft_revision, document: row.item!.document, scope, confirmId: crypto.randomUUID() }];
      expected.current = await operation('workspace', {});
      setScopes([scope]);
    });
  }
  async function confirm() {
    await task(async () => {
      if (!requests.current?.length || requests.current.some(change => !change.scope)) return;
      for (const change of requests.current) {
        if (!change.confirmed) {
          if (!change.started) {
            const fresh: ContentScope = await operation('scope', { id: change.id, revision: change.scope!.revision, action: change.scope!.action });
            const current: ContentWorkspace = await operation('workspace', {});
            if (!expected.current || workspaceVersion(current) !== workspaceVersion(expected.current) || JSON.stringify(fresh.targets) !== JSON.stringify(change.scope!.targets)) throw new ResourceConflict('Content changed since review. Close this panel and reload before confirming.');
            change.scope = fresh; change.started = true;
          }
          await operation('confirm', { ...change.scope!, requestId: change.confirmId }); change.confirmed = true;
          const head = expected.current!.items.find(item => item.id === change.id)!;
          head.publication_version += 1; head.visible = change.scope!.action === 'publish'; head.deleted = change.scope!.action === 'delete';
          if (head.visible) head.published_revision = change.scope!.revision;
        }
      }
      onUpdated(await operation('workspace', {}));
      setMessage(removing ? 'Resource deleted.' : 'Resource order published.');
      busy.current = false; close();
    });
  }
  const shown = ordered ?? rows;
  const sameLocation = (a: ResourceRow, b: ResourceRow | undefined) => b && a.target.placement === b.target.placement && a.target.anchorKey === b.target.anchorKey;
  const changed = ordered?.some((row, index) => row.key !== rows[index]?.key) ?? false;
  return <div ref={container} tabIndex={-1} className={styles.resourceList} aria-label={`${title} resources`}>

    <span id={`${titleId}-drag-help`} className={styles.visuallyHidden}>Drag the row to reorder. Keyboard: focus the row and use the up or down arrow.</span>
    {shown.map((row, index) => <div key={row.key} className={styles.resourceRow} data-resource-key={row.key} data-ordering={ordered ? 'true' : undefined} data-drop={over === row.key || undefined}
      draggable={!pending && !submitted && (!disabled || !!ordered)} tabIndex={0} role="group" aria-label={`Move ${row.title}`} aria-describedby={`${titleId}-drag-help`}
      onDragStart={event => { if ((event.target as HTMLElement).closest('button')) { event.preventDefault(); return; } if (!ordered) startOrder(event.currentTarget); setDragging(row.key); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', row.key); event.dataTransfer.setDragImage(event.currentTarget, 24, 20); }}
      onDragEnd={() => { setDragging(null); setOver(null); }}
      onKeyDown={event => { if (event.target !== event.currentTarget || pending || submitted || (disabled && !ordered) || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return; event.preventDefault(); const delta = event.key === 'ArrowUp' ? -1 : 1; if (!sameLocation(row, shown[index + delta])) return; if (!ordered) { startOrder(event.currentTarget); const next = [...shown]; [next[index], next[index + delta]] = [next[index + delta], next[index]]; setOrdered(next); } else move(index, delta); }}
      onDragOver={event => { if (!dragging || pending || submitted || !sameLocation(row, shown.find(item => item.key === dragging))) return; event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setOver(row.key); }}
      onDrop={event => { event.preventDefault(); if (!dragging || pending || submitted) return; const source = shown.findIndex(item => item.key === dragging); if (source < 0 || !sameLocation(row, shown[source])) return; const next = [...shown]; next.splice(index, 0, next.splice(source, 1)[0]); setOrdered(next); setMessage(`${next[index].title} moved to position ${index + 1}.`); setDragging(null); setOver(null); }}>

      <span className={styles.resourcePosition} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
      <span className={styles.resourceDetails}>{row.title}<small>{row.item ? row.item.visible ? row.item.published_revision === row.item.draft_revision ? 'Published resource' : 'Published · draft changes' : 'Saved draft' : 'Published'}{row.target.placement !== 'session' ? ` · ${CONTENT_PLACEMENTS[row.target.placement]}` : ''}</small></span>
      <div className={styles.resourceActions}>
        {!ordered && <><button className={styles.textButton} disabled={disabled} onClick={() => row.item ? onEdit(row.item) : onOriginal(row.key)}>Edit<span className={styles.visuallyHidden}> {row.title}</span></button><button className={styles.deleteTrigger} disabled={disabled} onClick={event => void prepareDelete(row, event.currentTarget)} aria-label={`Delete ${row.title}`}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg>Delete</button></>}
      </div>
    </div>)}
    {!rows.length && <p className={styles.muted}>No {title.toLowerCase()} added yet.</p>}
    {ordered && <div className={styles.resourceOrderFooter}><span>{submitted ? 'Order draft saved or pending confirmation.' : 'Arrange the list, then review before publishing.'}</span><button disabled={pending} onClick={close}>{submitted ? 'Close — keep drafts' : 'Cancel'}</button><button disabled={pending || submitted || !changed} onClick={() => { setOrdered(rows); setMessage('Moves undone.'); }}>Undo changes</button><button className={styles.primary} disabled={pending || conflict || (!changed && !submitted)} onClick={() => void prepareOrder()}>{pending ? 'Preparing…' : submitted ? 'Retry order review' : 'Review order'}</button></div>}
    <p className={styles.resourceStatus} role="status">{message}</p>
    {error && !reviewing && !removing?.item && <p role="alert" className={styles.inlineError}>{error}</p>}
    {removing && !removing.item && <DeleteSession batchId={course.batchId} sessionKey={session.key} title={removing.title} sessionKeys={course.sessions.map(s => s.key)} resource={{ kind, key: removing.key }} onSaved={onDraftSaved} onClose={close} />}
    {(reviewing || removing?.item) && <dialog ref={dialog} className={`${styles.locationDialog} ${styles.deleteDialog}`} aria-labelledby={titleId} aria-busy={pending} onCancel={event => { event.preventDefault(); close(); }}>
      <div className={styles.deleteBody}><h2 id={titleId}>{removing ? 'Delete this resource?' : 'Publish this resource order?'}</h2>
        {removing ? <><p className={styles.deleteSessionTitle}>{removing.title}</p><p>{removing.item?.published_revision === null && removing.item.document.targets.some(target => target.replaceKey) ? 'This deletes the saved draft. The original published resource remains.' : 'The resource will be removed from all locations below. The stored file is kept.'}</p></> : <><ol className={styles.orderPreview}>{ordered?.map(row => <li key={row.key}>{row.title}</li>)}</ol><p>Changes are confirmed per resource. Any new drafts in this order will be published. Other saved resource edits must be resolved first.</p></>}
        {!scopes.length && !error && <p role="status">Checking affected sessions…</p>}
        {!!scopes.length && <><h3>Affected locations</h3><ul>{[...new Set(scopes.flatMap(scope => scope.targets.map(target => `${target.courseTitle ?? 'Unavailable course'} · ${target.sessionTitle ?? 'Unavailable session'} · ${CONTENT_PLACEMENTS[target.placement]}`)))].map(location => <li key={location}>{location}</li>)}</ul></>}
        {error && <p role="alert" className={styles.inlineError}>{error}{partial && ' Some resources were already confirmed. Retrying continues the remaining changes.'}</p>}
      </div><footer className={styles.locationDialogActions}><button ref={cancel} disabled={pending} onClick={close}>{submitted ? 'Close — keep drafts' : 'Cancel'}</button>
        {error && !scopes.length && removing?.item && !conflict ? <button disabled={pending} onClick={() => void prepareDelete(removing, trigger.current!)}>Retry review</button> : <button className={removing ? styles.deleteConfirm : styles.primary} disabled={pending || conflict || !scopes.length} onClick={() => void confirm()}>{pending ? 'Confirming…' : removing ? 'Delete resource' : 'Publish order'}</button>}
      </footer>
    </dialog>}
  </div>;
}
