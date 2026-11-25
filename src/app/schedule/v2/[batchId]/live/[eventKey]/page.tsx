import Link from 'next/link';
import { isV2LearningEnabled } from '@/lib/server/v2LearningFeature';
import { getMyV2LearningState } from '@/lib/server/v2Learning';
import { notFound } from 'next/navigation';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { isV2StudentScheduleEnabled } from '@/lib/server/v2StudentScheduleFeature';
import { getMyV2Meeting } from '@/lib/server/v2StudentDelivery';
import { StudentHeader } from '@/components/student/StudentHeader';
import { getMyDisplayName } from '@/lib/server/studentProfile';
import styles from '@/components/student/v2Learning.module.css';
import '../../../../../dashboard/dashboard.css';

const when = (start: string, end: string) => {
  const day = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(start));
  const clock = (value: string) => new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
  return `${day} · ${clock(start)}–${clock(end)} IST`;
};

export default async function LiveClassPage({ params }: { params: Promise<{ batchId: string; eventKey: string }> }) {
  if (!isV2StudentScheduleEnabled()) notFound();
  await requirePortalRole('student');
  const { batchId, eventKey } = await params;
  const learningEnabled = isV2LearningEnabled();
  const [meeting, studentName, learning] = await Promise.all([getMyV2Meeting(batchId, eventKey), getMyDisplayName(), learningEnabled ? getMyV2LearningState(batchId).catch(() => null) : Promise.resolve(null)]);
  const event = learning?.liveEvents.find(item => item.key === eventKey);
  const back = learningEnabled ? `/schedule/v2/${batchId}?view=live` : '/schedule/v2';
  return <div className="student-page"><StudentHeader studentName={studentName} /><main className="student-main"><div className="student-container">
    <Link className={styles.backLink} href={back}>← Live classes</Link>
    <section className={styles.liveCard} aria-labelledby="live-class-title">
      <span className={styles.label}>Live class{event && event.section !== 'programme' ? ` · ${event.section === 'di' ? 'DI' : event.section === 'quant' ? 'Quant' : 'Verbal'}` : ''}</span>
      <h1 id="live-class-title">{event?.title ?? 'Live class'}</h1>
      {event && <p className={styles.liveWhen}>{when(event.startsAt, event.endsAt)}</p>}
      {meeting ? <>
        <a className={styles.joinButton} href={`/api/v2/meeting?batchId=${batchId}&eventKey=${eventKey}`} target="_blank" rel="noopener noreferrer">Join Google Meet <span aria-hidden="true">↗</span></a>
        <p className={styles.liveHint}>Opens in a new tab. Attending is optional; the recording is added to the session afterwards.</p>
      </> : <div className={styles.liveUnavailable}>
        <h2>You can’t join this class right now</h2>
        <ul>
          <li>The class may have ended, or its meeting link isn’t ready yet.</li>
          <li>Joining needs a live seat in this batch and active course access.</li>
        </ul>
        <div className={styles.row}><Link className={styles.secondary} href="/account/access" prefetch={false}>Check my access</Link>{learningEnabled && <Link className={styles.secondary} href={`/schedule/v2/${batchId}`}>Recordings & materials</Link>}</div>
      </div>}
    </section>
  </div></main></div>;
}
