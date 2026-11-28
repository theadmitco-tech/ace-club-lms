'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminDraftGuard } from '@/components/AdminDraftNavigation';
import type { V2EnrollmentOption } from '@/lib/v2Enrollments';
import { setEnrollmentAction, giveLiveSeatAction } from './actions';
import styles from '../batchPage.module.css';

const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase() ?? '').join('') || '?';

/** Enrollment controls who sees the batch schedule. It never grants course access (decision: enrolled-batch access). */
/** `live` is set when the batch is published with live classes, so seats can be given while enrolling. */
type LiveSeats = { limit: number; seats: Record<string, { active: boolean; revision: number }> };
export default function EnrollmentEditor({ batchId, options, product = 'course', live = null }: { batchId: string; options: V2EnrollmentOption[]; product?: string; live?: LiveSeats | null }) {
  const router = useRouter();
  const [review, setReview] = useState<V2EnrollmentOption | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const busy = useRef(false);
  const [withSeat, setWithSeat] = useState(false);
  const seatsTaken = live ? Object.values(live.seats).filter(seat => seat.active).length : 0;
  const seatsLeft = live ? Math.max(live.limit - seatsTaken, 0) : 0;
  const hasSeat = (studentId: string) => !!live?.seats[studentId]?.active;
  /** Gives one live seat; the database still checks enrollment, access and the seat limit. */
  async function giveSeat(studentId: string) {
    const result = await giveLiveSeatAction({ batchId, studentId, expectedRevision: live?.seats[studentId]?.revision ?? 0 });
    return result.status === 'success';
  }
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
      else {
        let note = review.active ? 'Student removed from this batch.' : 'Student enrolled in this batch.';
        if (!review.active && withSeat) note = await giveSeat(review.studentId).catch(() => false)
          ? 'Student enrolled and given a live seat.'
          : 'Student enrolled, but the live seat could not be given. Try Give live seat again.';
        setMessage(note); setReview(null); setWithSeat(false); router.refresh();
      }
    } catch { setError('Confirmation was interrupted. Reload the student list to check the result before retrying.'); }
    finally { busy.current = false; setPending(false); }
  }

  function row(student: V2EnrollmentOption) {
    const reviewing = review?.studentId === student.studentId;
    const status = student.active ? (student.eligible ? 'Can see the schedule' : `${product} access inactive · cannot see the schedule`) : student.eligible ? `Active ${product} access` : `No active ${product} access`;
    const warn = student.active && !student.eligible;
    return <li key={student.studentId} className={styles.studentRow} data-reviewing={reviewing || undefined}>
      <span className={styles.avatar} aria-hidden="true">{initials(student.name)}</span>
      <div className={styles.studentMain}><strong>{student.name}{student.active && hasSeat(student.studentId) && <span className={styles.seatBadge}>Live seat</span>}</strong><span data-tone={warn ? 'warn' : undefined}>{status}</span></div>
      {!reviewing && live && student.active && student.eligible && !hasSeat(student.studentId) && <button type="button" className={styles.secondaryAction}
        disabled={pending || !!review || !!error || seatsLeft === 0} aria-label={`Give a live seat to ${student.name}`} title={seatsLeft === 0 ? 'All live seats are taken' : undefined}
        onClick={async () => { if (busy.current) return; busy.current = true; setPending(true); setMessage('');
          try { setMessage(await giveSeat(student.studentId) ? `${student.name} now has a live seat.` : 'The live seat could not be given. Reload and try again.'); router.refresh(); }
          catch { setMessage('The live seat could not be given. Reload and try again.'); }
          finally { busy.current = false; setPending(false); } }}>Give live seat</button>}
      {!reviewing && (student.active || student.eligible) && <button type="button" className={student.active ? styles.quietAction : styles.secondaryAction}
        disabled={pending || !!review || !!error} aria-label={`${student.active ? 'Remove' : 'Enroll'} ${student.name}`}
        onClick={() => { setReview(student); setMessage(''); }}>{student.active ? 'Remove' : 'Enroll'}</button>}
      {reviewing && <div className={styles.inlineConfirm} role="region" aria-label={`${student.active ? 'Remove' : 'Enroll'} ${student.name}?`}>
        <p><strong>{student.active ? 'Remove' : 'Enroll'} {student.name}?</strong> {student.active ? 'They stop seeing this batch’s schedule. Their purchase, course access and history are kept.' : 'They will see this batch’s schedule once it is published. This does not change their purchase or course access.'}</p>
        {!student.active && live && <label className={styles.seatOption}><input type="checkbox" checked={withSeat} disabled={pending || seatsLeft === 0} onChange={event => setWithSeat(event.target.checked)} />
          <span>Also give a live seat <small>{seatsLeft === 0 ? 'All live seats are taken' : `${seatsLeft} of ${live.limit} left`}</small></span></label>}
        {error && <p role="alert" className={styles.alert}>{error}</p>}
        <div><button type="button" className="btn btn-primary" disabled={pending || !!error} onClick={confirm}>{pending ? 'Saving…' : student.active ? 'Confirm removal' : 'Confirm enrollment'}</button>
          {error ? <button type="button" className="btn btn-secondary" onClick={() => window.location.reload()}>Reload student list</button>
            : <button type="button" className="btn btn-secondary" disabled={pending} onClick={() => { setReview(null); setWithSeat(false); }}>Cancel</button>}</div>
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
      {enrolledTotal > 0 && (live
        ? <p className={styles.nextHint}>Live seats: {seatsTaken} of {live.limit} taken. Mark classes complete in <Link href={`/admin/v2/batches/${batchId}/live`} prefetch={false}>Live seats &amp; completion</Link>.</p>
        : <p className={styles.nextHint}>Live seats can be given here once the batch is published with live classes.</p>)}
    </>}
  </section>;
}
