'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { V2Publication } from '@/lib/v2Publications';
import type { V2LearningState } from '@/lib/v2Learning';
import { V2_TEMPLATE_PRODUCTS } from '@/lib/v2Templates';
import styles from './v2Learning.module.css';
export function V2LearningLibrary({ batches }: { batches: { publication: V2Publication; learning: V2LearningState | null }[] }) {
  const [route, setRoute] = useState<'recordings' | 'live'>('recordings');
  const unverified = batches.some(batch => !batch.learning);
  const visible = route === 'live' ? batches.filter(batch => batch.learning?.liveRegistered) : batches;
  return <div className={styles.workspace}><header className="student-intro"><div><h1>My learning</h1><p>Your courses, session resources and registered live classes.</p></div></header>
    <div className={styles.libraryRoutes} role="group" aria-label="Learning routes"><button aria-pressed={route === 'recordings'} onClick={() => setRoute('recordings')}><strong>Recordings & materials</strong><span>Learn at any time</span></button><button aria-pressed={route === 'live'} onClick={() => setRoute('live')}><strong>Live classes</strong><span>Registered batches and class times</span></button></div>
    {route === 'live' && !visible.length ? <section className={styles.empty}><h2>{unverified ? 'Live registration could not be verified' : 'No registered live classes'}</h2><p>{unverified ? 'Reload the library to check the latest access status.' : 'Live schedules appear here after registration is confirmed. Recordings remain available in the other tab.'}</p><button className={styles.secondary} onClick={() => setRoute('recordings')}>View recordings</button>{batches.some(batch => !batch.learning) && <p role="alert">Some learning statuses could not be verified. Reload before checking registration.</p>}</section> : !batches.length ? <section className={styles.empty}><h2>No active published courses yet</h2><p>A course appears here when access is active, enrollment is confirmed and its content is published. Expired purchases remain in My access.</p><div className={styles.row}><Link className={styles.primary} href="/account/access">Review access and expiry</Link><Link href="/courses/v2">Explore courses</Link></div></section> : <div className={styles.library}>{visible.map(({ publication: batch, learning }) => {
      const last = learning?.sessions.find(s => s.key === learning.lastSessionKey && !s.locked);
      return <article key={batch.batchId} className={styles.libraryCard}><span className={styles.label}>{V2_TEMPLATE_PRODUCTS[batch.productCode].label}</span><h2>{batch.title}</h2><p>{route === 'live' ? `${learning?.liveEvents.length ?? 0} scheduled classes · IST` : `${batch.sessions?.length ?? 0} published sessions`}</p>
        {learning ? <>{route === 'recordings' && last && <p className={styles.notice}><strong>Pick up where you left off</strong><br />{last.title}</p>}{learning.obligations.length > 0 && <p>Feedback is due. The current session and its resources remain open.</p>}<div className={styles.row}><Link className={styles.primary} href={`/schedule/v2/${batch.batchId}${route === 'live' ? '?view=live' : ''}`} prefetch={false}>{route === 'live' ? 'View live classes' : last ? 'Continue learning' : 'Explore sessions'}</Link>{route === 'recordings' && learning.liveRegistered && <Link href={`/schedule/v2/${batch.batchId}?view=live`} prefetch={false}>Live classes</Link>}</div></> : <p role="alert">Learning status could not be verified. Reload the library before opening protected content.</p>}
      </article>;
    })}</div>}
    <p className={styles.libraryFooter}>Sessions can be opened in any order. <Link href="/account/access">Access dates & purchase history</Link><span aria-hidden="true"> · </span><Link href="/dashboard">Dashboard & mocks</Link></p>
  </div>;
}
