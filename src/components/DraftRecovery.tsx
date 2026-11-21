'use client';

import { useCallback, useId, useRef, useState, useSyncExternalStore } from 'react';
import { readDraftRecovery, writeDraftRecovery, removeDraftRecovery } from '@/lib/draftRecovery';

import styles from './DraftRecovery.module.css';

const EVENT = 'ace:draft-recovery';
const serverSnapshot = () => null;
function subscribe(listener: () => void) {
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
function notify() { window.dispatchEvent(new Event(EVENT)); }

export function useDraftRecovery<T>(ownerId: string, scope: string, isValid: (value: unknown) => value is T) {
  const [handled, setHandled] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const snapshot = useCallback(() => {
    try { return readDraftRecovery(window.sessionStorage, ownerId, scope); } catch { return null; }
  }, [ownerId, scope]);
  const raw = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  let recovered: T | null = null;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (isValid(parsed)) recovered = parsed;
  } catch { /* Ignore damaged or incompatible scratch state. */ }

  function remember(value: T) {
    setHandled(true);
    let saved = false;
    try { saved = writeDraftRecovery(window.sessionStorage, ownerId, scope, value); } catch { /* Storage disabled. */ }
    setUnavailable(!saved);
    notify();
  }
  function forget() {
    setHandled(true);
    try { removeDraftRecovery(window.sessionStorage, ownerId, scope); } catch { /* Storage disabled. */ }
    notify();
  }
  return { recovered: handled ? null : recovered, remember, forget, unavailable,
    acknowledge: () => setHandled(true) };
}

export function DraftRecoveryNotice({ available, unavailable, onRestore, onDiscard }: {
  available: boolean; unavailable: boolean; onRestore: () => void; onDiscard: () => void;
}) {
  const titleId = useId();
  const cancelButton = useRef<HTMLButtonElement>(null);
  const discardButton = useRef<HTMLButtonElement>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [outcome, setOutcome] = useState('');
  return <>
    {available && <aside className={styles.panel} aria-labelledby={titleId}>
      <svg className={styles.icon} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M3 10a9 9 0 1 1 2 8M3 4v6h6m3-3v5l3 2"/></svg>
      <div className={styles.copy}><h2 id={titleId}>{confirmDiscard ? 'Discard the saved edits?' : 'Continue where you left off'}</h2>
        <p>{confirmDiscard ? 'This removes the recovery copy in this tab. Changes already saved to the website stay unchanged.' : 'This tab has saved edits. Restore them to continue, or start with the current saved version.'}</p>
      </div>
      <div className={styles.actions}>
        {confirmDiscard ? <>
          <button ref={cancelButton} type="button" className={styles.primary} onClick={() => {setConfirmDiscard(false);requestAnimationFrame(() => discardButton.current?.focus());}}>Keep edits</button>
          <button type="button" className={styles.discard} onClick={() => {onDiscard();setConfirmDiscard(false);setOutcome('Saved edits discarded. The current version is ready to edit.');}}>Discard edits</button>
        </> : <>
          <button type="button" className={styles.primary} onClick={() => {onRestore();setOutcome('Edits restored. Review them before saving.');}}>Restore edits</button>
          <button ref={discardButton} type="button" className={styles.secondary} onClick={() => {setConfirmDiscard(true);requestAnimationFrame(() => cancelButton.current?.focus());}}>Start fresh</button>
        </>}
      </div>
    </aside>}
    {!available && outcome && <p className={styles.result} role="status">{outcome}</p>}
    {unavailable && <p className={styles.warning} role="alert">This browser could not keep a recovery copy. Save your changes before leaving this page.</p>}
  </>;
}
