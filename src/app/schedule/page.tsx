import Link from 'next/link';
import { ScheduleDisclosure } from '@/components/student/ScheduleDisclosure';
import { StudentHeader } from '@/components/student/StudentHeader';
import { TimelineItem } from '@/components/student/TimelineItem';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { loadStudentTimeline } from '@/lib/server/studentTimeline';
import {
  getCurrentProgrammeWeek,
  groupTimelineByDay,
  groupTimelineByWeek,
  isCrashCourse,
} from '@/lib/studentTimeline';
import '../dashboard/dashboard.css';

export default async function SchedulePage() {
  const identity = await requirePortalRole('student');
  const result = await loadStudentTimeline(identity.id);

  if (result.status === 'failed') {
    return (
      <div className="student-page">
        <StudentHeader studentName={result.studentName} />
        <main className="student-main"><section className="student-state student-state-error" role="alert">
          <h1>We couldn&apos;t load your Schedule</h1><p>{result.message}</p>
          <Link className="student-button" href="/schedule">Retry Schedule</Link>
        </section></main>
      </div>
    );
  }

  const { studentName, timeline } = result;
  if (!timeline.course) {
    return (
      <div className="student-page"><StudentHeader studentName={studentName} />
        <main className="student-main"><section className="student-state">
          <h1>No Schedule yet</h1><p>Your published events will appear after a course is assigned.</p>
        </section></main>
      </div>
    );
  }

  const { course, sessions, generated_at: generatedAt } = timeline;
  const timeZone = course.schedule_timezone || 'Asia/Kolkata';
  const crashCourse = isCrashCourse(course, sessions);
  const currentWeek = getCurrentProgrammeWeek(course, generatedAt);
  const primaryGroups = crashCourse
    ? groupTimelineByDay(sessions, timeZone).map((group) => ({
        id: group.dateKey,
        label: group.label,
        sessions: group.sessions,
        initiallyOpen: true,
      }))
    : groupTimelineByWeek(sessions).map((group) => ({
        id: `week-${group.weekNumber}`,
        label: `Week ${group.weekNumber}`,
        sessions: group.sessions,
        initiallyOpen: group.weekNumber === currentWeek,
      }));
  const groups = primaryGroups;

  return (
    <div className="student-page">
      <StudentHeader studentName={studentName} />
      <main className="student-main">
        <div className="student-container">
          <header className="student-intro">
            <div><span className="student-eyebrow">{course.name}</span><h1>Schedule</h1>
              <p>Browse every published event {crashCourse ? 'day by day' : 'week by week'}. Completed events remain available here.</p>
            </div>
          </header>
          <section className="course-browser" aria-labelledby="schedule-browser-title">
            <div className="browser-heading">
              <div><span className="student-eyebrow">{crashCourse ? 'Crash course' : 'Full Course'}</span>
                <h2 id="schedule-browser-title">Published events</h2></div>
              <span className="schedule-grouping-label">Grouped by {crashCourse ? 'day' : 'week'}</span>
            </div>
            {groups.length > 0 ? <div className="week-groups">
              {groups.map((group) => (
                <ScheduleDisclosure key={group.id} id={group.id} label={group.label} itemCount={group.sessions.length} initiallyOpen={group.initiallyOpen}>
                  <div className="timeline-list">
                    {group.sessions.map((session) => <TimelineItem key={session.id} session={session} timeZone={timeZone} />)}
                  </div>
                </ScheduleDisclosure>
              ))}
            </div> : <div className="student-state compact"><h3>No published events</h3><p>Your programme team has not published a Schedule yet.</p></div>}
          </section>
        </div>
      </main>
    </div>
  );
}
