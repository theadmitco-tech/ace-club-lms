import Link from 'next/link';
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
          <h2 id={`batch-${batch.batchId}`}>{batch.title}</h2></div></div>
        {batch.events.length === 0 ? <div className="student-state compact"><p>No events scheduled yet.</p></div>
          : <ol className="timeline-list">{batch.events.map((event) => <li className="student-state compact" key={event.key}>
            <span className="student-eyebrow">{event.section} · {event.kind === 'live' ? 'Live session' : 'Course outline'}</span>
            <h3>{event.title || 'Topic to be announced'}</h3>
            {event.startsAt && event.endsAt ? <p><time dateTime={event.startsAt}>{time(event.startsAt)}</time> – <time dateTime={event.endsAt}>{time(event.endsAt)}</time> IST</p>
              : <p>Date to be announced</p>}
            {event.instructor && <p>Instructor: {event.instructor}</p>}
          </li>)}</ol>}
      </section>)}
    </div></main>
  </div>;
}
