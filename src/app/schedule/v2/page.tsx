import Link from 'next/link';
import { isV2LearningEnabled } from '@/lib/server/v2LearningFeature';
import { getMyV2LearningState } from '@/lib/server/v2Learning';
import { V2LearningLibrary } from '@/components/student/V2LearningLibrary';
import { notFound } from 'next/navigation';
import { StudentHeader } from '@/components/student/StudentHeader';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { isV2StudentScheduleEnabled } from '@/lib/server/v2StudentScheduleFeature';
import { getMyV2BatchSchedules } from '@/lib/server/v2StudentSchedules';
import { V2_TEMPLATE_PRODUCTS } from '@/lib/v2Templates';
import '../../dashboard/dashboard.css';

const time = (value: string) => new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short',
}).format(new Date(value));

export default async function EnrolledSchedulePage() {
  if (!isV2StudentScheduleEnabled()) notFound();
  await requirePortalRole('student');
  const result = await getMyV2BatchSchedules();
  if (isV2LearningEnabled()) {
    const batches = result.status === 'ready' ? await Promise.all(result.schedules.map(async publication => ({ publication, learning: await getMyV2LearningState(publication.batchId) }))) : null;
    return <div className="student-page"><StudentHeader studentName="Student" /><main className="student-main"><div className="student-container">{batches ? <V2LearningLibrary batches={batches} /> : <section className="student-state student-state-error" role="alert"><h1>The learning library could not be loaded</h1><p>Please retry shortly.</p><Link className="student-button" href="/schedule/v2">Retry</Link></section>}</div></main></div>;
  }
  return <div className="student-page">
    <StudentHeader studentName="Student" />
    <main className="student-main"><div className="student-container">
      <Link className="student-button" href="/schedule">Back to Schedule</Link>
      <header className="student-intro"><div><h1>Enrolled batch schedules</h1>
        <p>Published schedules for your enrolled batches. All times are in India Standard Time (IST).</p></div></header>
      {result.status === 'unavailable' ? <section className="student-state student-state-error" role="alert">
        <h2>Schedule could not be loaded</h2><p>Please retry or contact the programme team.</p>
        <Link className="student-button" href="/schedule/v2">Retry</Link>
      </section> : result.schedules.length === 0 ? <section className="student-state">
        <h2>No published batch schedules yet</h2><p>A schedule appears once you are enrolled, have active course access and the programme team publishes it.</p>
      </section> : result.schedules.map((batch) => <section className="course-browser" key={batch.batchId} aria-labelledby={`batch-${batch.batchId}`}>
        <div className="browser-heading"><div><span className="student-eyebrow">{V2_TEMPLATE_PRODUCTS[batch.productCode].label}</span>
          <h2 id={`batch-${batch.batchId}`}>{batch.title}</h2></div><Link className="student-button" href={`/schedule/v2/${batch.batchId}`} prefetch={false}>Open course sessions</Link></div>
        {!!batch.sessions?.length && <section aria-label="Course sessions"><h3>Course sessions</h3>
          <ol>{batch.sessions.map((session) => <li key={session.key}>{session.title} · {session.section}</li>)}</ol>
        </section>}
        {batch.events.length === 0 ? <div className="student-state compact"><p>No events scheduled yet.</p></div>
          : <ol className="timeline-list">{batch.events.map((event) => <li className="student-state compact" key={event.key}>
            <span className="student-eyebrow">{event.section} · {event.kind === 'live' ? 'Live session' : 'Course outline'}</span>
            <h3>{event.title || 'Topic to be announced'}</h3>
            {event.startsAt && event.endsAt ? <p><time dateTime={event.startsAt}>{time(event.startsAt)}</time> – <time dateTime={event.endsAt}>{time(event.endsAt)}</time> IST</p>
              : <p>Self-paced · no scheduled date</p>}
            {event.instructor && <p>Instructor: {event.instructor}</p>}
            {event.kind === 'live' && <Link className="student-button" href={`/schedule/v2/${batch.batchId}/live/${event.key}`} prefetch={false}>Open live class</Link>}
          </li>)}</ol>}
      </section>)}
    </div></main>
  </div>;
}
