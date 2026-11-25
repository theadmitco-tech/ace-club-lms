import Link from 'next/link';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { loadStudentTimeline } from '@/lib/server/studentTimeline';
import { requestTime } from '@/lib/server/studentProfile';
import { StudentHeader } from '@/components/student/StudentHeader';
import type { StudentTimelineSession } from '@/lib/studentTimeline';
import { getMyV2Mocks, type V2StudentMock } from '@/lib/server/v2Mocks';
import styles from './mocks.module.css';
import { googleCalendarLink } from '@/lib/calendarLink';
import '../dashboard/dashboard.css';

export const dynamic = 'force-dynamic';

const MOCK_LENGTH_MS = 4 * 60 * 60 * 1000;

/** One mock, from a V2 batch or from the older course schedule. */
type Mock = { id: string; title: string; startsAt: string; endsAt: string | null; where: string | null; instructions: string;
  links: { key: string; label: string; href: string; external: boolean }[] };
const endOf = (mock: Mock) => mock.endsAt ? Date.parse(mock.endsAt) : Date.parse(mock.startsAt) + MOCK_LENGTH_MS;

function fromV2(mock: V2StudentMock): Mock {
  return { id: mock.id, title: mock.title, startsAt: mock.startsAt, endsAt: mock.endsAt, where: null, instructions: mock.instructions,
    links: mock.testUrl ? [{ key: 'test', label: 'Open the test', href: mock.testUrl, external: true }] : [] };
}
function fromSchedule(mock: StudentTimelineSession): Mock {
  return { id: mock.id, title: mock.title, startsAt: mock.session_date, endsAt: mock.session_end_at, instructions: mock.instructions?.trim() ?? '',
    where: [mock.venue && `Where: ${mock.venue}`, mock.reporting_time && `Report by ${mock.reporting_time}`].filter(Boolean).join(' · ') || null,
    links: mock.materials.filter(material => material.is_available).map(material => ({ key: material.id, label: material.title, href: `/session/${mock.id}/material/${material.id}`, external: false })) };
}

function when(mock: Mock, timeZone: string) {
  const day = new Intl.DateTimeFormat('en-IN', { timeZone, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(mock.startsAt));
  const clock = (value: string) => new Intl.DateTimeFormat('en-IN', { timeZone, hour: 'numeric', minute: '2-digit' }).format(new Date(value));
  return `${day} · ${clock(mock.startsAt)}${mock.endsAt ? `–${clock(mock.endsAt)}` : ''}`;
}

function Materials({ mock, emptyText }: { mock: Mock; emptyText: string }) {
  if (!mock.links.length) return <p className={styles.muted}>{emptyText}</p>;
  return <div className={styles.materials}>{mock.links.map(link => link.external
    ? <a key={link.key} className={styles.materialLink} href={link.href} target="_blank" rel="noreferrer">{link.label} <span aria-hidden="true">↗</span></a>
    : <Link key={link.key} className={styles.materialLink} href={link.href} prefetch={false}>{link.label}</Link>)}</div>;
}

function CalendarLink({ mock, now }: { mock: Mock; now: number }) {
  const href = Date.parse(mock.startsAt) > now ? googleCalendarLink({ title: mock.title, startsAt: mock.startsAt, endsAt: mock.endsAt, durationMinutes: 210, details: mock.instructions }) : null;
  return href ? <a className={styles.calendar} href={href} target="_blank" rel="noreferrer">Add to calendar <span aria-hidden="true">↗</span></a> : null;
}

/** The student's mock tests from their course schedule: the next one first, then the rest. */
export default async function MocksPage() {
  const identity = await requirePortalRole('student');
  const [result, v2Mocks] = await Promise.all([loadStudentTimeline(identity.id), getMyV2Mocks()]);
  const now = requestTime();
  const timeline = result.status === 'ready' ? result.timeline : null;
  const timeZone = timeline?.course?.schedule_timezone ?? 'Asia/Kolkata';
  const zoneLabel = timeZone === 'Asia/Kolkata' ? 'IST' : timeZone;
  const mocks = [...(v2Mocks ?? []).map(fromV2), ...(timeline?.sessions ?? []).filter(session => session.event_type?.toLowerCase() === 'mock').map(fromSchedule)]
    .toSorted((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  // Only a total failure is an error; one working source still shows its mocks.
  const failed = result.status === 'failed' && v2Mocks === null;
  const upcoming = mocks.filter(mock => endOf(mock) > now), past = mocks.filter(mock => endOf(mock) <= now).reverse();
  const [next, ...later] = upcoming;

  return <div className="student-page"><StudentHeader studentName={result.studentName} /><main className="student-main"><div className={`student-container ${styles.page}`}>
    <header className={styles.intro}>
      <h1>Mocks</h1>
      <p>Full-length practice tests to see where you stand. Each one is taken at its scheduled time. All times {zoneLabel}.</p>
    </header>

    {failed ? <section className={styles.card} role="alert"><h2>Your mocks couldn’t be loaded</h2><p>Please try again. If it keeps happening, contact the programme team.</p><Link className={styles.secondary} href="/mocks">Try again</Link></section>
      : !mocks.length ? <section className={styles.empty}><h2>No mocks are scheduled yet</h2><p>When a mock test is scheduled for your course, it appears here with its date, time and everything you need to take it.</p></section>
        : <>
          {next && <section className={styles.next} aria-labelledby="next-mock">
            <span className={styles.label}>{Date.parse(next.startsAt) <= now ? 'On now' : 'Next mock'}</span>
            <h2 id="next-mock">{next.title}</h2>
            <p className={styles.when}>{when(next, timeZone)} {zoneLabel}</p>
            {next.where && <p className={styles.detail}>{next.where}</p>}
            {next.instructions && <p className={styles.instructions}>{next.instructions}</p>}
            <Materials mock={next} emptyText="The test link and papers appear here when they open." />
            <CalendarLink mock={next} now={now} />
          </section>}

          {later.length > 0 && <section aria-labelledby="upcoming-mocks"><h2 id="upcoming-mocks" className={styles.sectionTitle}>Coming up</h2>
            <ol className={styles.list}>{later.map(mock => <li key={mock.id}><div><strong>{mock.title}</strong><span>{when(mock, timeZone)} {zoneLabel}</span></div><CalendarLink mock={mock} now={now} /></li>)}</ol>
          </section>}

          {past.length > 0 && <section aria-labelledby="past-mocks"><h2 id="past-mocks" className={styles.sectionTitle}>Past mocks</h2>
            <ol className={styles.list}>{past.map(mock => <li key={mock.id}><div><strong>{mock.title}</strong><span>{when(mock, timeZone)} {zoneLabel}</span></div><Materials mock={mock} emptyText="No review material yet." /></li>)}</ol>
          </section>}
        </>}
  </div></main></div>;
}
