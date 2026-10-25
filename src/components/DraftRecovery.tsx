'use client';

import { useCallback, useState, useSyncExternalStore } from 'react';
import { readDraftRecovery, writeDraftRecovery, removeDraftRecovery } from '@/lib/draftRecovery';

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
  return <>
    {available && <aside role="status">
      <p>Unsaved edits are available in this tab. Restore and review them before saving.</p>
      <button type="button" className="btn btn-secondary" onClick={onRestore}>Restore edits</button>{' '}
      <button type="button" className="btn btn-secondary" onClick={onDiscard}>Discard recovery</button>
    </aside>}
    {unavailable && <p role="alert">Recovery is unavailable in this tab. Keep this page open until your changes are saved.</p>}
  </>;
}
