'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminDraftGuard } from '@/components/AdminDraftNavigation';
import type { V2EnrollmentOption } from '@/lib/v2Enrollments';
import type { V2LiveClassStatus } from '@/lib/v2StudentDelivery';
import { setLiveRegistrationAction, completeLiveClassAction } from './actions';
import styles from '../../../templates/templates.module.css';

type Review = {kind:'registration';student:V2EnrollmentOption} | {kind:'completion';event:V2LiveClassStatus};
export default function LiveOperations({batchId,registrations,classes,learningEnabled=false,mappings=[]}:{batchId:string;registrations:V2EnrollmentOption[];classes:V2LiveClassStatus[];learningEnabled?:boolean;mappings?:{eventKey:string;sessionKey:string;publicationRevision:number}[]}) {
  const router = useRouter();
  const [review,setReview] = useState<Review|null>(null);
  const [pending,setPending] = useState(false);
  const [message,setMessage] = useState('');
  const [error,setError] = useState('');
  const busy = useRef(false);
  useAdminDraftGuard(review !== null || pending);
  async function confirm() {
    if (!review || busy.current) return;
    busy.current=true;setPending(true);setError('');setMessage('');
    try {
      const result = review.kind === 'registration'
        ? await setLiveRegistrationAction({batchId,studentId:review.student.studentId,active:!review.student.active,expectedRevision:review.student.revision})
        : await completeLiveClassAction({batchId,eventKey:review.event.eventKey,publicationRevision:review.event.publicationRevision});
      if (result.status === 'error') setError(result.message);
      else { setMessage(review.kind === 'completion' ? 'Class completion recorded. Attendance and feedback remain separate.' : 'Live registration updated.'); setReview(null);router.refresh(); }
    } catch { setError('Confirmation was interrupted. Reload this page to verify the saved state.'); }
    finally {busy.current=false;setPending(false);}
  }
  return <div aria-busy={pending}>
    {message && <p role="status">{message}</p>}{error && <div role="alert"><p>{error}</p><button type="button" className="btn btn-secondary" onClick={() => window.location.reload()}>Reload live operations</button></div>}
    {review && <section className={styles.card} aria-label="Confirm live operation"><h2>{review.kind === 'completion' ? 'Mark this live class complete?' : review.student.active ? 'Remove live registration?' : 'Confirm live registration?'}</h2>
      <p>{review.kind === 'completion' ? review.event.title : review.student.name}</p>
      <p>{review.kind === 'completion' ? (learningEnabled ? 'Completion closes the join link and creates feedback obligations for eligible live registrants in the mapped session. It does not mark attendance or publish a recording. Completion cannot be reversed here.' : 'Completion closes the join link and records an audit entry. It does not mark any student present, submit feedback, or publish a recording. Completion cannot be reversed here.')
        : 'Manual registration controls access to published private meeting links. Active product access and batch enrollment remain required. This action does not take or confirm a payment.'}</p>
      <div className={styles.buttons}><button className="btn btn-primary" type="button" disabled={pending || !!error} onClick={confirm}>{review.kind === 'completion' ? 'Confirm class completion' : 'Confirm registration'}</button><button className="btn btn-secondary" type="button" disabled={pending} onClick={() => setReview(null)}>Cancel</button></div>
    </section>}
    <section className={styles.card}><h2>Live registrations</h2><p>Explicit registration is separate from schedule enrollment. Only registered, enrolled students with active course access can open a published meeting.</p>
      {!registrations.length && <p>No enrolled students are available. Batch enrollment is managed from the student list.</p>}
      <ul className={styles.list}>{registrations.map((student) => <li key={student.studentId} className={styles.event}><strong>{student.name}</strong><span>{student.active ? 'Registered' : 'Not registered'}{!student.eligible ? ' · Enrollment or access inactive' : ''}</span>
        <button className="btn btn-secondary" type="button" disabled={pending || !!review || !!error || (!student.active && (!student.eligible || !classes.length))} onClick={() => setReview({kind:'registration',student})}>{student.active ? 'Remove registration' : 'Register for live classes'}</button></li>)}</ul>
    </section>
    <section className={styles.card}><h2>Class completion</h2><p>Completion records that a published live class has concluded. Student attendance, feedback and recording publication are separate.</p>
      {!classes.length && <p>No published live classes are available.</p>}
      <ul className={styles.list}>{classes.map((event) => <li key={event.eventKey} className={styles.event}><strong>{event.title}</strong>
        {event.completedAt ? <span>Completed {new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'}).format(new Date(event.completedAt))} IST</span>
          : <button className="btn btn-secondary" type="button" disabled={pending || !!review || !!error || learningEnabled && !mappings.some(m => m.eventKey === event.eventKey && m.publicationRevision === event.publicationRevision)} onClick={() => setReview({kind:'completion',event})}>Mark class complete</button>}</li>)}</ul>
    </section>
  </div>;
}
