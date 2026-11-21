'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminDraftGuard } from '@/components/AdminDraftNavigation';
import type { V2EnrollmentOption } from '@/lib/v2Enrollments';
import { setEnrollmentAction } from './actions';
import styles from '../batchPage.module.css';

const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase() ?? '').join('') || '?';

/** Enrollment controls who sees the batch schedule. It never grants course access (decision: enrolled-batch access). */
export default function EnrollmentEditor({ batchId, options, product = 'course' }: { batchId: string; options: V2EnrollmentOption[]; product?: string }) {
  const router = useRouter();
  const [review, setReview] = useState<V2EnrollmentOption | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const busy = useRef(false);
  useAdminDraftGuard(review !== null || pending);
  const search = query.trim().toLowerCase();
  const visible = options.filter(student => !search || student.name.toLowerCase().includes(search));
  const enrolled = visible.filter(student => student.active);
  const available = visible.filter(student => !student.active && student.eligible);
  const inactive = visible.filter(student => !student.active && !student.eligible);
  const enrolledTotal = options.filter(student => student.active).length;

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

  function row(student: V2EnrollmentOption) {
    const reviewing = review?.studentId === student.studentId;
    const status = student.active ? (student.eligible ? 'Can see the schedule' : `${product} access inactive · cannot see the schedule`) : student.eligible ? `Active ${product} access` : `No active ${product} access`;
    const warn = student.active && !student.eligible;
    return <li key={student.studentId} className={styles.studentRow} data-reviewing={reviewing || undefined}>
      <span className={styles.avatar} aria-hidden="true">{initials(student.name)}</span>
      <div className={styles.studentMain}><strong>{student.name}</strong><span data-tone={warn ? 'warn' : undefined}>{status}</span></div>
      {!reviewing && (student.active || student.eligible) && <button type="button" className={student.active ? styles.quietAction : styles.secondaryAction}
        disabled={pending || !!review || !!error} aria-label={`${student.active ? 'Remove' : 'Enroll'} ${student.name}`}
        onClick={() => { setReview(student); setMessage(''); }}>{student.active ? 'Remove' : 'Enroll'}</button>}
      {reviewing && <div className={styles.inlineConfirm} role="region" aria-label={`${student.active ? 'Remove' : 'Enroll'} ${student.name}?`}>
        <p><strong>{student.active ? 'Remove' : 'Enroll'} {student.name}?</strong> {student.active ? 'They stop seeing this batch’s schedule. Their purchase, course access and history are kept.' : 'They will see this batch’s schedule once it is published. This does not change their purchase or course access.'}</p>
        {error && <p role="alert" className={styles.alert}>{error}</p>}
        <div><button type="button" className="btn btn-primary" disabled={pending || !!error} onClick={confirm}>{pending ? 'Saving…' : student.active ? 'Confirm removal' : 'Confirm enrollment'}</button>
          {error ? <button type="button" className="btn btn-secondary" onClick={() => window.location.reload()}>Reload student list</button>
            : <button type="button" className="btn btn-secondary" disabled={pending} onClick={() => setReview(null)}>Cancel</button>}</div>
      </div>}
    </li>;
  }

  return <section className={styles.panel} aria-busy={pending} aria-labelledby="enrollment-heading">
    <div className={styles.panelHead}><h2 id="enrollment-heading">Students</h2><span className={styles.count}>{enrolledTotal} enrolled</span></div>
    {message && <p role="status" className={styles.notice}>{message}</p>}
    {error && !review && <div role="alert" className={styles.alert}><p>{error}</p><button type="button" className="btn btn-secondary" onClick={() => window.location.reload()}>Reload student list</button></div>}
    {!options.length ? <div className={styles.empty}><p>No students have {product} access yet.</p></div> : <>
      {options.length > 8 && <label className={styles.search}><span className={styles.visuallyHidden}>Find a student</span><input type="search" placeholder="Find a student…" value={query} onChange={event => setQuery(event.target.value)} /></label>}
      <h3 className={styles.groupTitle}>Enrolled <span>{enrolled.length}</span></h3>
      {enrolled.length ? <ul className={styles.studentList}>{enrolled.map(row)}</ul> : <p className={styles.muted}>{search ? 'No enrolled students match.' : 'No one is enrolled yet.'}</p>}
      {!!available.length && <><h3 className={styles.groupTitle}>Can be enrolled <span>{available.length}</span></h3><ul className={styles.studentList}>{available.map(row)}</ul></>}
      {!!inactive.length && <details className={styles.ineligible}><summary>{inactive.length} {inactive.length === 1 ? 'student' : 'students'} without active {product} access</summary><ul className={styles.studentList}>{inactive.map(row)}</ul></details>}
      {enrolledTotal > 0 && <p className={styles.nextHint}>Next: <Link href={`/admin/v2/batches/${batchId}/live`} prefetch={false}>give live seats</Link> to students who will attend the live classes.</p>}
    </>}
  </section>;
}
