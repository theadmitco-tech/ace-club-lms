'use client';

import Link from 'next/link';
import { useEffect, useSyncExternalStore } from 'react';
import styles from './studentPreview.module.css';

const EVENT = 'ace:last-opened-session';
const keyFor = (ownerId: string) => `ace:last-opened-session:v1:${ownerId}`;
function subscribe(notify: () => void) {
  window.addEventListener('storage', notify);
  window.addEventListener(EVENT, notify);
  return () => {
    window.removeEventListener('storage', notify);
    window.removeEventListener(EVENT, notify);
  };
}
function readLastOpened(ownerId: string) {
  try { return window.localStorage.getItem(keyFor(ownerId)); }
  catch { return null; }
}
const serverSnapshot = () => null;

/** Records only an already-authorized page visit, never completion or feedback. */
export function SessionVisitMarker({ ownerId, sessionId }: { ownerId: string; sessionId: string }) {
  useEffect(() => {
    try {
      window.localStorage.setItem(keyFor(ownerId), sessionId);
      window.dispatchEvent(new Event(EVENT));
    } catch { /* Browsers may disable storage. Learning still works. */ }
  }, [ownerId, sessionId]);
  return null;
}

/** The server supplies the current authorized timeline, so stale IDs cannot create links. */
export function LearningResume({ ownerId, sessions }: { ownerId: string; sessions: { id: string; title: string }[] }) {
  const lastOpened = useSyncExternalStore(subscribe, () => readLastOpened(ownerId), serverSnapshot);
  const session = sessions.find((item) => item.id === lastOpened);
  if (!session) return null;
  return <section className={styles.resume} aria-labelledby="resume-title">
    <div><span className={styles.resumeLabel}>● LAST OPENED ON THIS BROWSER</span><h2 id="resume-title">Pick up where you left off</h2><p>{session.title}</p><small>A page-visit reminder, not a completion record.</small></div>
    <Link href={`/session/${encodeURIComponent(session.id)}`}>Resume session →</Link>
  </section>;
}
