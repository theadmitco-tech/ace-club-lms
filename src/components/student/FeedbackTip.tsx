'use client';

import Link from 'next/link';
import { useState, useSyncExternalStore } from 'react';
import styles from './v2Learning.module.css';

const KEY = 'ace:v2-feedback-tip-dismissed';
const noSubscription = () => () => {};
const readDismissed = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return true; } };

/** A one-time explanation of the feedback rule, so the first subject lock is expected rather than surprising. */
export function FeedbackTip() {
  // Hidden on the server and until the browser's choice is known; storage problems simply hide the tip.
  const stored = useSyncExternalStore(noSubscription, readDismissed, () => true);
  const [dismissed, setDismissed] = useState(false);
  if (stored || dismissed) return null;
  const dismiss = () => { try { localStorage.setItem(KEY, '1'); } catch { /* the tip is hidden for this visit anyway */ } setDismissed(true); };
  return <aside className={styles.tip} aria-label="How feedback works">
    <p><strong>How feedback works:</strong> after you watch most of a recording, or after a live class you’re registered for, we ask for quick feedback on that session. Until you send it, the other sessions in that subject pause; your other subjects stay open. <Link href="/help">More help</Link></p>
    <button type="button" onClick={dismiss}>Got it</button>
  </aside>;
}
