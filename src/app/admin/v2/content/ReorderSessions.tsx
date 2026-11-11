'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { AdminDraftLink as Link, useAdminDraftGuard } from '@/components/AdminDraftNavigation';
import { moveSessionKey, reorderedSessionInput } from '@/lib/v2SessionOrder';
import type { V2BatchInput } from '@/lib/v2Batches';
import { loadSessionDraftAction } from './session-actions';
import { previewBatchDraftAction, saveBatchDraftAction } from '../batches/actions';
import styles from './content.module.css';

type Session = { key: string; title: string };
export default function ReorderSessions({ batchId, sessions, onClose, onSaved }: {
  batchId: string; sessions: Session[]; onClose: () => void; onSaved: () => void;
}) {
  const [original] = useState(() => sessions.map(session => session.key));
  const [order, setOrder] = useState(original), [history, setHistory] = useState<string[][]>([]);
  const [announcement, setAnnouncement] = useState(''), [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<{ key: string; edge: 'before' | 'after' } | null>(null);
  const [pending, setPending] = useState(false), [submitted, setSubmitted] = useState(false), [saved, setSaved] = useState(false);
  const [error, setError] = useState(''), [existingDraft, setExistingDraft] = useState(false);
  const request = useRef<{ input: V2BatchInput; fingerprint?: string } | null>(null), busy = useRef(false);
  const list = useRef<HTMLOListElement>(null), heading = useRef<HTMLHeadingElement>(null);
  const positions = useRef(new Map<string, number>()), focusKey = useRef<string | null>(null);
  const helpId = useId(), titleId = useId();
  const dirty = order.some((key, index) => key !== original[index]);
  const locked = pending || submitted || saved;
  useAdminDraftGuard(!saved && (dirty || submitted));
  useEffect(() => { heading.current?.focus(); }, [saved]);
  useLayoutEffect(() => {
    for (const row of list.current?.querySelectorAll<HTMLElement>('[data-session-key]') ?? []) {
      const previous = positions.current.get(row.dataset.sessionKey!);
      if (previous !== undefined && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const delta = previous - row.getBoundingClientRect().top;
        if (delta) row.animate([{ transform: `translateY(${delta}px)` }, { transform: 'translateY(0)' }], { duration: 180, easing: 'ease-out' });
      }
    }
    positions.current.clear();
    if (focusKey.current) {
      const handle = list.current?.querySelector<HTMLButtonElement>(`[data-handle-key="${focusKey.current}"]`);
      handle?.focus({ preventScroll: true });
      handle?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      focusKey.current = null;
    }
  }, [order]);
  function rememberPositions() {
    for (const row of list.current?.querySelectorAll<HTMLElement>('[data-session-key]') ?? []) positions.current.set(row.dataset.sessionKey!, row.getBoundingClientRect().top);
  }
  function move(key: string, destination: number) {
    if (locked) return;
    const next = moveSessionKey(order, key, destination);
    if (next === order) return;
    rememberPositions(); focusKey.current = key;
    setHistory(previous => [...previous, order]); setOrder(next);
    setAnnouncement(`${sessions.find(session => session.key === key)?.title} moved to position ${destination + 1} of ${order.length}.`);
  }
  function undo() {
    const previous = history.at(-1); if (!previous || locked) return;
    rememberPositions(); setOrder(previous); setHistory(history.slice(0, -1)); setAnnouncement('Last move undone.');
  }
  async function save() {
    if (busy.current || saved || !dirty) return;
    busy.current = true; setPending(true); setError('');
    try {
      if (!request.current) {
        const result = await loadSessionDraftAction(batchId);
        if (result.status !== 'ready') { setExistingDraft(result.status === 'pending'); throw new Error(result.message); }
        request.current = { input: reorderedSessionInput(result.draft, original, order, crypto.randomUUID()) };
      }
      setSubmitted(true);
      if (!request.current.fingerprint) {
        const result = await previewBatchDraftAction(request.current.input);
        if (result.status === 'error') throw new Error(result.message);
        request.current.fingerprint = result.proposal.fingerprint;
      }
      if (!request.current.fingerprint) throw new Error('The order could not be reviewed. Retry shortly.');
      const result = await saveBatchDraftAction(request.current.input, request.current.fingerprint);
      if (result.status === 'error') throw new Error(result.message);
      setSaved(true); onSaved();
    } catch (error) { setError(error instanceof Error ? error.message : 'Confirmation was interrupted. Retry to recover the same saved order.'); }
    finally { busy.current = false; setPending(false); }
  }
  return <section className={styles.reorderEditor} aria-labelledby={titleId} aria-busy={pending}>
    <header className={styles.taskHeading}><span className={styles.sessionCount}>Session order</span><h2 id={titleId} ref={heading} tabIndex={-1}>{saved ? 'Session order saved' : 'Reorder sessions'}</h2>
      <p id={helpId}>{saved ? 'The new order is saved as a draft. Review and publish it when ready.' : 'Drag the handle or use the arrows to move a session. Nothing changes for students until published.'}</p>
    </header>
    {!saved && <><p className={styles.keyboardHint}>Keyboard: focus a handle, then use ↑ / ↓. Home and End move to the first or last position.</p>
      <ol className={styles.reorderList} ref={list} aria-label="Session order">
        {order.map((key, index) => {
          const title = sessions.find(session => session.key === key)!.title;
          return <li key={key} data-session-key={key} data-dragging={dragging === key || undefined} data-drop={over?.key === key ? over.edge : undefined}
            onDragOver={event => { if (!dragging || locked) return; event.preventDefault(); event.dataTransfer.dropEffect = 'move'; const rect = event.currentTarget.getBoundingClientRect(); setOver({ key, edge: event.clientY < rect.top + rect.height / 2 ? 'before' : 'after' }); }}
            onDrop={event => { event.preventDefault(); if (!dragging || locked) return; const from = order.indexOf(dragging); const slot = index + (over?.edge === 'after' ? 1 : 0); move(dragging, Math.max(0, Math.min(order.length - 1, slot - (from < slot ? 1 : 0)))); setDragging(null); setOver(null); }}>
            <button type="button" className={styles.dragHandle} data-handle-key={key} disabled={locked} draggable={!locked} aria-label={`Move ${title}`} aria-describedby={helpId}
              onDragStart={event => { setDragging(key); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', key); if (event.currentTarget.parentElement) event.dataTransfer.setDragImage(event.currentTarget.parentElement, 24, 24); }}
              onDragEnd={() => { setDragging(null); setOver(null); }}
              onKeyDown={event => { const target = event.key === 'ArrowUp' ? index - 1 : event.key === 'ArrowDown' ? index + 1 : event.key === 'Home' ? 0 : event.key === 'End' ? order.length - 1 : null; if (target !== null) { event.preventDefault(); move(key, target); } }}><span aria-hidden="true">⠿</span></button>
            <span className={styles.orderNumber} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><span className={styles.orderTitle}>{title}</span>
            <div className={styles.moveButtons}><button type="button" disabled={locked || index === 0} aria-label={`Move ${title} up`} onClick={() => move(key, index - 1)}>↑</button><button type="button" disabled={locked || index === order.length - 1} aria-label={`Move ${title} down`} onClick={() => move(key, index + 1)}>↓</button></div>
          </li>;
        })}
      </ol></>}
    <p role="status" aria-live="polite" aria-atomic="true" className={styles.orderStatus}>{saved ? 'Saved draft · awaiting publication' : announcement || 'Current published order'}</p>
    {error && <p role="alert" className={styles.inlineError}>{error}</p>}
    <footer className={styles.taskActions}>{saved ? <><Link className={styles.primary} href={`/admin/v2/batches?batch=${batchId}&review=1`}>Review & publish order</Link><button onClick={onClose}>Done</button></> : <>
      {existingDraft ? <Link href={`/admin/v2/batches?batch=${batchId}&review=1`}>Review saved draft changes</Link> : <button className={styles.primary} disabled={pending || !dirty} onClick={() => void save()}>{pending ? 'Saving…' : submitted ? 'Retry saving order' : 'Save order'}</button>}
      <button disabled={locked || !history.length} onClick={undo}>Undo move</button><button disabled={pending} onClick={onClose}>{submitted ? 'Close editor' : 'Cancel'}</button>
    </>}</footer>
  </section>;
}
