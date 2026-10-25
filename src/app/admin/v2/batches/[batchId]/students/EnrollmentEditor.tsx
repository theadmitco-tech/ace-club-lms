'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminDraftGuard } from '@/components/AdminDraftNavigation';
import type { V2EnrollmentOption } from '@/lib/v2Enrollments';
import { setEnrollmentAction } from './actions';
import styles from '../../../templates/templates.module.css';

export default function EnrollmentEditor({ batchId, options }: { batchId: string; options: V2EnrollmentOption[] }) {
  const router = useRouter();
  const [review, setReview] = useState<V2EnrollmentOption | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const busy = useRef(false);
  useAdminDraftGuard(review !== null || pending);
  async function confirm() {
    if (!review || busy.current || error) return;
    busy.current = true; setPending(true); setMessage('');
    try {
      const result = await setEnrollmentAction({ batchId, studentId: review.studentId, active: !review.active, expectedRevision: review.revision });
      if (result.status === 'error') setError(result.message);
      else { setMessage(review.active ? 'Student removed from this batch.' : 'Student enrolled in this batch.'); setReview(null); router.refresh(); }
    } catch { setError('Confirmation was interrupted. Reload the student list to check the result before retrying.'); }
    finally { busy.current = false; setPending(false); }
  }
  return <section className={styles.card} aria-busy={pending} aria-labelledby="enrollment-heading">
    <h2 id="enrollment-heading">Enrolled students</h2>
    <p>Students need an enrollment in this batch and active access to its product to see the published schedule.</p>
    {message && <p role="status">{message}</p>}
    {error && <div role="alert"><p>{error}</p><button type="button" className="btn btn-secondary" onClick={() => window.location.reload()}>Reload student list</button></div>}
    {review && <div className={styles.event}>
      <h3>{review.active ? 'Remove' : 'Enroll'} {review.name}?</h3>
      <p>{review.active ? 'This removes access to this batch schedule.' : 'This allows access to this batch schedule when it is published.'}</p>
      <p>Student ID: {review.studentId}</p>
      <div className={styles.buttons}><button type="button" className="btn btn-primary" disabled={pending || !!error} onClick={confirm}>Confirm {review.active ? 'removal' : 'enrollment'}</button>
        <button type="button" className="btn btn-secondary" disabled={pending || !!error} onClick={() => setReview(null)}>Cancel</button></div>
    </div>}
    {!options.length && <p>No students with active access to this product are available.</p>}
    <ul className={styles.list}>{options.map((student) => <li className={styles.event} key={student.studentId}>
      <strong>{student.name}</strong><span>Student ID: {student.studentId}</span>
      <span>{student.active ? 'Enrolled' : 'Not enrolled'}{!student.eligible ? ' · Product access inactive' : ''}</span>
      <button type="button" className="btn btn-secondary" disabled={pending || !!review || !!error || (!student.active && !student.eligible)}
        onClick={() => { setReview(student); setMessage(''); }}>{student.active ? 'Remove from batch' : 'Enroll in batch'}</button>
    </li>)}</ul>
  </section>;
}
