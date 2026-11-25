import Link from 'next/link';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { loadStudentTimeline } from '@/lib/server/studentTimeline';
import { requestTime } from '@/lib/server/studentProfile';
import { StudentHeader } from '@/components/student/StudentHeader';
import type { StudentTimelineSession } from '@/lib/studentTimeline';
import styles from './mocks.module.css';
import '../dashboard/dashboard.css';

export const dynamic = 'force-dynamic';

const MOCK_LENGTH_MS = 4 * 60 * 60 * 1000;
const endOf = (mock: StudentTimelineSession) => mock.session_end_at ? Date.parse(mock.session_end_at) : Date.parse(mock.session_date) + MOCK_LENGTH_MS;

function when(mock: StudentTimelineSession, timeZone: string) {
  const day = new Intl.DateTimeFormat('en-IN', { timeZone, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(mock.session_date));
  const clock = (value: string) => new Intl.DateTimeFormat('en-IN', { timeZone, hour: 'numeric', minute: '2-digit' }).format(new Date(value));
  return `${day} · ${clock(mock.session_date)}${mock.session_end_at ? `–${clock(mock.session_end_at)}` : ''}`;
}

function Materials({ mock, emptyText }: { mock: StudentTimelineSession; emptyText: string }) {
  const ready = mock.materials.filter(material => material.is_available);
  if (!ready.length) return <p className={styles.muted}>{emptyText}</p>;
  return <div className={styles.materials}>{ready.map(material => <Link key={material.id} className={styles.materialLink} href={`/session/${mock.id}/material/${material.id}`} prefetch={false}>{material.title}</Link>)}</div>;
}

/** The student's mock tests from their course schedule: the next one first, then the rest. */
export default async function MocksPage() {
  const identity = await requirePortalRole('student');
  const result = await loadStudentTimeline(identity.id);
  const now = requestTime();
  const timeline = result.status === 'ready' ? result.timeline : null;
  const timeZone = timeline?.course?.schedule_timezone ?? 'Asia/Kolkata';
  const zoneLabel = timeZone === 'Asia/Kolkata' ? 'IST' : timeZone;
  const mocks = (timeline?.sessions ?? []).filter(session => session.event_type?.toLowerCase() === 'mock')
    .toSorted((a, b) => Date.parse(a.session_date) - Date.parse(b.session_date));
  const upcoming = mocks.filter(mock => endOf(mock) > now), past = mocks.filter(mock => endOf(mock) <= now).reverse();
  const [next, ...later] = upcoming;

  return <div className="student-page"><StudentHeader studentName={result.studentName} /><main className="student-main"><div className={`student-container ${styles.page}`}>
    <header className={styles.intro}>
      <h1>Mocks</h1>
      <p>Full-length practice tests to see where you stand. Each one is taken at its scheduled time. All times {zoneLabel}.</p>
    </header>

    {result.status === 'failed' ? <section className={styles.card} role="alert"><h2>Your mocks couldn’t be loaded</h2><p>{result.message}</p><Link className={styles.secondary} href="/mocks">Try again</Link></section>
      : !mocks.length ? <section className={styles.empty}><h2>No mocks are scheduled yet</h2><p>When a mock test is scheduled for your course, it appears here with its date, time and everything you need to take it.</p></section>
        : <>
          {next && <section className={styles.next} aria-labelledby="next-mock">
            <span className={styles.label}>{Date.parse(next.session_date) <= now ? 'On now' : 'Next mock'}</span>
            <h2 id="next-mock">{next.title}</h2>
            <p className={styles.when}>{when(next, timeZone)} {zoneLabel}</p>
            {(next.venue || next.reporting_time) && <p className={styles.detail}>{[next.venue && `Where: ${next.venue}`, next.reporting_time && `Report by ${next.reporting_time}`].filter(Boolean).join(' · ')}</p>}
            {next.instructions?.trim() && <p className={styles.instructions}>{next.instructions.trim()}</p>}
            <Materials mock={next} emptyText="The test link and papers appear here when they open." />
          </section>}

          {later.length > 0 && <section aria-labelledby="upcoming-mocks"><h2 id="upcoming-mocks" className={styles.sectionTitle}>Coming up</h2>
            <ol className={styles.list}>{later.map(mock => <li key={mock.id}><div><strong>{mock.title}</strong><span>{when(mock, timeZone)} {zoneLabel}</span></div></li>)}</ol>
          </section>}

          {past.length > 0 && <section aria-labelledby="past-mocks"><h2 id="past-mocks" className={styles.sectionTitle}>Past mocks</h2>
            <ol className={styles.list}>{past.map(mock => <li key={mock.id}><div><strong>{mock.title}</strong><span>{when(mock, timeZone)} {zoneLabel}</span></div><Materials mock={mock} emptyText="No review material yet." /></li>)}</ol>
          </section>}
        </>}
  </div></main></div>;
}
