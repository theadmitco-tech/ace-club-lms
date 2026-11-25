import Link from 'next/link';
import type { V2Publication } from '@/lib/v2Publications';
import type { V2LearningState } from '@/lib/v2Learning';
import type { V2ProductAccess } from '@/lib/v2Products';
import { V2_TEMPLATE_PRODUCTS } from '@/lib/v2Templates';
import styles from './myLearning.module.css';

type Batch = { publication: V2Publication; learning: V2LearningState | null };
type NextStep = { key: string; kind: 'feedback' | 'live' | 'continue'; label: string; title: string; detail: string; href: string; action: string };

const productNames: Record<string, string> = { full_batch: 'Full Course', quant_crash: 'Quant', verbal_crash: 'Verbal', di_crash: 'DI' };
const day = (value: string) => new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(value));
const clock = (value: string) => new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
const longDate = (value: string) => new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));

/** The student's home: what to do next, their courses and how long access lasts. */
export function V2LearningLibrary({ batches, access = null, studentName = '', now }: { batches: Batch[]; access?: V2ProductAccess[] | null; studentName?: string; now: number }) {
  const firstName = studentName.split(/\s+/)[0] && studentName !== 'Student' ? studentName.split(/\s+/)[0] : '';
  const unverified = batches.some(batch => !batch.learning);
  const course = (batchId: string) => `/schedule/v2/${batchId}`;

  // Up next: feedback first (it pauses a subject), then the next live class, then where the student left off.
  const steps: NextStep[] = [];
  for (const { publication, learning } of batches) {
    const due = learning?.obligations[0];
    if (due) steps.push({ key: `feedback-${publication.batchId}`, kind: 'feedback', label: 'Feedback due', title: due.sessionTitle,
      detail: `${learning!.obligations.length > 1 ? `${learning!.obligations.length} sessions` : 'One session'} in ${publication.title}. Other sessions in that subject open again once it’s sent.`, href: course(publication.batchId), action: 'Give feedback' });
  }
  const nextLive = batches.flatMap(({ publication, learning }) => learning?.liveRegistered ? learning.liveEvents
    .filter(event => !event.completedAt && Date.parse(event.endsAt) > now).map(event => ({ event, publication })) : [])
    .sort((a, b) => Date.parse(a.event.startsAt) - Date.parse(b.event.startsAt))[0];
  if (nextLive) {
    const live = Date.parse(nextLive.event.startsAt) <= now;
    steps.push({ key: 'live', kind: 'live', label: live ? 'Live now' : 'Next live class', title: nextLive.event.title,
      detail: `${day(nextLive.event.startsAt)} · ${clock(nextLive.event.startsAt)}–${clock(nextLive.event.endsAt)} IST`, href: `${course(nextLive.publication.batchId)}/live/${nextLive.event.key}`, action: live ? 'Join class' : 'View class' });
  }
  for (const { publication, learning } of batches) {
    const last = learning?.sessions.find(session => session.key === learning.lastSessionKey && !session.locked);
    if (last) steps.push({ key: `continue-${publication.batchId}`, kind: 'continue', label: 'Continue', title: last.title, detail: publication.title, href: course(publication.batchId), action: 'Continue' });
  }

  const expiring = (access ?? []).filter(item => Date.parse(item.expires_at) - now < 30 * 86400000);

  return <div className={styles.home}>
    <header className={styles.intro}>
      {firstName && <p className={styles.hello}>Hi {firstName},</p>}
      <h1>My learning</h1>
      <p>{batches.length ? 'Here’s what to do next. Sessions can be taken in any order.' : 'Your courses will appear here.'}</p>
    </header>

    {unverified && <p role="alert" className={styles.alert}>Some course details couldn’t be loaded. Reload the page before opening a session.</p>}

    {!batches.length ? <section className={styles.empty}>
      <h2>Your course access isn’t active</h2>
      <p>If you bought a course, its access may have ended or it may not be open yet. Your purchases and their dates are in <Link href="/account/access">My access</Link>.</p>
    </section> : <>
      {!!steps.length && <section aria-labelledby="up-next-heading">
        <h2 id="up-next-heading" className={styles.sectionTitle}>Up next</h2>
        <ul className={styles.steps}>{steps.slice(0, 3).map(step => <li key={step.key} data-kind={step.kind}>
          <span className={styles.stepLabel}>{step.label}</span>
          <strong>{step.title}</strong>
          <span className={styles.stepDetail}>{step.detail}</span>
          <Link className={step.kind === 'feedback' || step.kind === 'live' ? styles.primary : styles.secondary} href={step.href} prefetch={false}>{step.action}</Link>
        </li>)}</ul>
      </section>}

      <section aria-labelledby="courses-heading">
        <h2 id="courses-heading" className={styles.sectionTitle}>Your courses</h2>
        <div className={styles.courses}>{batches.map(({ publication, learning }) => {
          const total = learning?.sessions.length ?? publication.sessions?.length ?? 0;
          const opened = learning ? new Set(learning.progress.map(item => item.sessionKey).filter(key => learning.sessions.some(session => session.key === key))).size : 0;
          const last = learning?.sessions.find(session => session.key === learning.lastSessionKey && !session.locked);
          return <article key={publication.batchId} className={styles.course}>
            <div className={styles.courseHead}><span className={styles.product}>{V2_TEMPLATE_PRODUCTS[publication.productCode].label}</span>
              {learning?.liveRegistered && <span className={styles.badge}>Live seat</span>}
              {!!learning?.obligations.length && <span className={styles.badge} data-tone="warn">Feedback due</span>}</div>
            <h3>{publication.title}</h3>
            {learning ? <>
              <div className={styles.progress}><span>{opened} of {total} {total === 1 ? 'session' : 'sessions'} opened</span><meter min={0} max={Math.max(total, 1)} value={opened} aria-label={`Sessions opened in ${publication.title}`} /></div>
              <div className={styles.actions}>
                <Link className={styles.primary} href={course(publication.batchId)} prefetch={false}>{last ? 'Continue' : 'Start learning'}</Link>
                {learning.liveRegistered && <Link className={styles.secondary} href={`${course(publication.batchId)}?view=live`} prefetch={false}>Live classes</Link>}
              </div>
            </> : <p role="alert" className={styles.muted}>This course couldn’t be checked. Reload before opening it.</p>}
          </article>;
        })}</div>
      </section>
    </>}

    {access && access.length > 0 && <section aria-labelledby="access-heading" className={styles.access}>
      <h2 id="access-heading" className={styles.sectionTitle}>Your access</h2>
      <ul>{access.map(item => { const ending = expiring.includes(item); return <li key={`${item.product_code}-${item.expires_at}`} data-ending={ending || undefined}>
        <strong>{productNames[item.product_code] ?? 'Course'}</strong><span>{ending ? `Ends ${longDate(item.expires_at)}` : `Until ${longDate(item.expires_at)}`}</span></li>; })}</ul>
      <Link href="/account/access">Access details & upgrades</Link>
    </section>}
  </div>;
}
