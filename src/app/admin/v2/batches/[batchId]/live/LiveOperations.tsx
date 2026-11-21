'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminDraftGuard } from '@/components/AdminDraftNavigation';
import type { V2EnrollmentOption } from '@/lib/v2Enrollments';
import type { V2LiveClassStatus } from '@/lib/v2StudentDelivery';
import type { V2Publication } from '@/lib/v2Publications';
import type { V2LiveMapping } from '@/lib/v2LiveMappingSuggestions';
import { setLiveRegistrationAction, completeLiveClassAction } from './actions';
import LiveSessionMappings from './LiveSessionMappings';
import styles from '../batchPage.module.css';

type Review = { kind: 'registration'; student: V2EnrollmentOption } | { kind: 'completion'; event: V2LiveClassStatus };
type Props = {
  batchId: string; registrations: V2EnrollmentOption[]; classes: V2LiveClassStatus[]; learningEnabled?: boolean;
  mappings?: V2LiveMapping[]; mappingsAvailable?: boolean; publication?: V2Publication; seatLimit?: number;
};
const completedLabel = (value: string) => new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(value));
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase() ?? '').join('') || '?';

export default function LiveOperations({ batchId, registrations, classes, learningEnabled = false, mappings = [], mappingsAvailable = true, publication, seatLimit = 8 }: Props) {
  const router = useRouter();
  const [review, setReview] = useState<Review | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [now] = useState(() => Date.now());
  const busy = useRef(false);
  useAdminDraftGuard(review !== null || pending);
  const registered = registrations.filter(student => student.active);
  const available = registrations.filter(student => !student.active && student.eligible);
  const ineligible = registrations.filter(student => !student.active && !student.eligible);
  const full = registered.length >= seatLimit;
  const locked = pending || !!review || !!error;

  async function confirm() {
    if (!review || busy.current) return;
    busy.current = true; setPending(true); setError(''); setMessage('');
    try {
      const result = review.kind === 'registration'
        ? await setLiveRegistrationAction({ batchId, studentId: review.student.studentId, active: !review.student.active, expectedRevision: review.student.revision })
        : await completeLiveClassAction({ batchId, eventKey: review.event.eventKey, publicationRevision: review.event.publicationRevision });
      if (result.status === 'error') setError(result.message);
      else { setMessage(review.kind === 'completion' ? 'Class completion recorded. Attendance and feedback remain separate.' : review.student.active ? `${review.student.name} no longer has a live seat.` : `${review.student.name} is registered for the live classes.`); setReview(null); router.refresh(); }
    } catch { setError('Confirmation was interrupted. Reload this page to verify the saved state.'); }
    finally { busy.current = false; setPending(false); }
  }

  function studentRow(student: V2EnrollmentOption) {
    const reviewing = review?.kind === 'registration' && review.student.studentId === student.studentId;
    const blocked = !student.active && (!student.eligible || !classes.length || full);
    return <li key={student.studentId} className={styles.studentRow} data-reviewing={reviewing || undefined}>
      <span className={styles.avatar} aria-hidden="true">{initials(student.name)}</span>
      <div className={styles.studentMain}><strong>{student.name}</strong>
        <span>{student.active ? 'Live seat' : !student.eligible ? 'Enrollment or course access inactive' : full ? 'No seats left' : 'Enrolled · no live seat'}</span></div>
      {!reviewing && (student.eligible || student.active) && <button type="button" className={student.active ? styles.quietAction : styles.secondaryAction} disabled={locked || blocked}
        aria-label={`${student.active ? 'Remove live seat' : 'Give live seat'}: ${student.name}`} onClick={() => { setReview({ kind: 'registration', student }); setMessage(''); }}>
        {student.active ? 'Remove' : 'Give seat'}</button>}
      {reviewing && <div className={styles.inlineConfirm} role="region" aria-label="Confirm live operation">
        <p><strong>{student.active ? 'Remove live registration?' : 'Confirm live registration?'}</strong> {student.active ? 'They keep their course access and recordings, but can no longer open the live meeting links.' : 'They can open the private meeting links for published classes. Course access and enrollment stay as they are; no payment is taken.'}</p>
        <div><button className="btn btn-primary" type="button" disabled={pending} onClick={confirm}>{pending ? 'Saving…' : student.active ? 'Remove seat' : 'Confirm registration'}</button>
          <button className="btn btn-secondary" type="button" disabled={pending} onClick={() => setReview(null)}>Cancel</button></div>
      </div>}
    </li>;
  }

  function completionAction(eventKey: string, linked: boolean) {
    const event = classes.find(item => item.eventKey === eventKey);
    if (!event) return <span className={styles.badge}>Not published</span>;
    if (event.completedAt) return <span className={styles.badge} data-tone="ok">Completed · {completedLabel(event.completedAt)}</span>;
    const reviewing = review?.kind === 'completion' && review.event.eventKey === eventKey;
    if (reviewing) return <div className={styles.inlineConfirm} role="region" aria-label="Confirm live operation">
      <p><strong>Mark this live class complete?</strong> {learningEnabled ? 'This closes the join link and asks registered students for feedback on the linked session. It does not mark attendance or publish a recording, and it cannot be undone here.' : 'This closes the join link and records an audit entry. It does not mark attendance or publish a recording, and it cannot be undone here.'}</p>
      <div><button className="btn btn-primary" type="button" disabled={pending} onClick={confirm}>{pending ? 'Saving…' : 'Confirm class completion'}</button>
        <button className="btn btn-secondary" type="button" disabled={pending} onClick={() => setReview(null)}>Cancel</button></div>
    </div>;
    const published = publication?.events.find(item => item.key === eventKey);
    const ended = !!published?.endsAt && Date.parse(published.endsAt) < now;
    const canComplete = !learningEnabled || linked;
    return <div className={styles.completion}>
      {!canComplete && <span className={styles.badge} data-tone="warn">Link a session first</span>}
      {canComplete && !ended && <span className={styles.badge}>Upcoming</span>}
      <button type="button" className={ended && canComplete ? 'btn btn-primary' : styles.secondaryAction} disabled={locked || !canComplete} onClick={() => { setReview({ kind: 'completion', event }); setMessage(''); }}>Mark class complete</button>
    </div>;
  }

  return <div className={styles.layout} aria-busy={pending}>
    {(message || error) && <div className={styles.feedback}>
      {message && <p role="status" className={styles.notice}>{message}</p>}
      {error && <div role="alert" className={styles.alert}><p>{error}</p><button type="button" className="btn btn-secondary" onClick={() => window.location.reload()}>Reload live operations</button></div>}
    </div>}

    <section className={styles.panel} aria-labelledby="live-registrations-heading">
      <div className={styles.panelHead}><h2 id="live-registrations-heading">Live registrations</h2><span className={styles.count} data-full={full || undefined}>{registered.length} / {seatLimit} seats</span></div>
      <meter className={styles.seatMeter} min={0} max={seatLimit} value={registered.length} aria-label="Live seats taken" />
      <p className={styles.panelIntro}>{full ? `All ${seatLimit} seats are taken. There is no waitlist; remove a seat to free one.` : `${seatLimit - registered.length} of ${seatLimit} seats open.`} Attendance is optional, and recordings stay available to every enrolled student.</p>
      {!registrations.length ? <div className={styles.empty}><p>No students are enrolled in this batch yet. Enroll students first, then give them live seats.</p>
        <Link className={styles.secondaryAction} href={`/admin/v2/batches/${batchId}/students`} prefetch={false}>Enroll students</Link></div> : <>
        <h3 className={styles.groupTitle}>Registered <span>{registered.length}</span></h3>
        {registered.length ? <ul className={styles.studentList}>{registered.map(studentRow)}</ul> : <p className={styles.muted}>No live seats assigned yet.</p>}
        {!!available.length && <><h3 className={styles.groupTitle}>Enrolled without a seat <span>{available.length}</span></h3><ul className={styles.studentList}>{available.map(studentRow)}</ul></>}
        {!!ineligible.length && <details className={styles.ineligible}><summary>{ineligible.length} enrolled {ineligible.length === 1 ? 'student' : 'students'} without active access</summary><ul className={styles.studentList}>{ineligible.map(studentRow)}</ul></details>}
      </>}
    </section>

    {learningEnabled && publication && mappingsAvailable
      ? <LiveSessionMappings publication={publication} mappings={mappings} completedEventKeys={classes.filter(item => item.completedAt !== null).map(item => item.eventKey)}
        heading="Classes" intro="After a class ends, check its feedback session and mark it complete. Registered students are then asked for feedback on that session."
        renderAction={completionAction} />
      : <section className={styles.panel} aria-labelledby="live-classes-heading">
        <div className={styles.panelHead}><h2 id="live-classes-heading">Classes</h2></div>
        {learningEnabled && <p role="alert" className={styles.alert}>{publication ? 'Feedback session links could not be loaded. Completion is unavailable until this page reloads.' : 'Publish the batch before marking classes complete.'}</p>}
        <p className={styles.panelIntro}>Mark each class complete after it ends. This closes its join link.</p>
        {!classes.length ? <p className={styles.muted}>No published live classes yet.</p> : <ul className={styles.classList}>{classes.map(event => <li key={event.eventKey} className={styles.classRow} data-state={event.completedAt ? 'done' : undefined}>
          <div className={styles.classWhen}><span>Class</span></div>
          <div className={styles.classMain}><strong>{event.title}</strong></div>
          <div className={styles.classAction}>{learningEnabled ? null : completionAction(event.eventKey, true)}</div>
        </li>)}</ul>}
      </section>}
  </div>;
}
