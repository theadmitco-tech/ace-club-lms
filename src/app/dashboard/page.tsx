import Link from 'next/link';
import { ResourceActions } from '@/components/student/ResourceActions';
import { StudentHeader } from '@/components/student/StudentHeader';
import { TimelineItem } from '@/components/student/TimelineItem';
import { WeekDisclosure } from '@/components/student/WeekDisclosure';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { loadStudentTimeline } from '@/lib/server/studentTimeline';
import {
  formatProgrammeDateTime,
  getCurrentProgrammeWeek,
  getMaterialAvailabilityCopy,
  getPreReadRecommendation,
  getRecommendedPractice,
  groupTimelineByWeek,
  isAcademicSection,
  type AcademicSection,
} from '@/lib/studentTimeline';
import './dashboard.css';

type DashboardSearchParams = Promise<{
  view?: string | string[];
  section?: string | string[];
}>;

const SECTIONS: AcademicSection[] = ['QA', 'VA', 'DI'];

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DashboardPage({ searchParams }: { searchParams: DashboardSearchParams }) {
  const identity = await requirePortalRole('student');
  const [query, result] = await Promise.all([searchParams, loadStudentTimeline(identity.id)]);

  if (result.status === 'failed') {
    return (
      <div className="student-page">
        <StudentHeader studentName={result.studentName} />
        <main className="student-main">
          <section className="student-state student-state-error" role="alert">
            <span className="state-kicker">Course unavailable</span>
            <h1>We couldn&apos;t load your course</h1>
            <p>{result.message}</p>
            <Link className="student-button" href="/dashboard">Retry course</Link>
          </section>
        </main>
      </div>
    );
  }

  const { studentName, timeline } = result;
  const requestedView = firstValue(query.view);
  const requestedSection = firstValue(query.section);
  const sectionCandidate = requestedSection ?? null;
  const selectedSection: AcademicSection = isAcademicSection(sectionCandidate)
    ? sectionCandidate
    : 'QA';
  const isSectionView = requestedView === 'section';

  if (!timeline.course) {
    return (
      <div className="student-page">
        <StudentHeader studentName={studentName} />
        <main className="student-main">
          <section className="student-state">
            <span className="state-kicker">No course assigned</span>
            <h1>Your course will appear here</h1>
            <p>You are signed in, but no cohort is assigned to your account. Contact the programme team if you expected access.</p>
          </section>
        </main>
      </div>
    );
  }

  const { course, generated_at: generatedAt, sessions } = timeline;
  const timeZone = course.schedule_timezone || 'Asia/Kolkata';
  const currentWeek = getCurrentProgrammeWeek(course, generatedAt);
  const weekGroups = groupTimelineByWeek(sessions);
  const thisWeekSessions = sessions.filter((session) => session.week_number === currentWeek);
  const recommendedPractice = getRecommendedPractice(sessions, generatedAt);
  const preReadRecommendation = getPreReadRecommendation(
    sessions,
    currentWeek,
    generatedAt,
    timeZone,
  );
  const sectionSessions = sessions.filter((session) => session.class_type === selectedSection);
  const firstName = studentName.split(/\s+/)[0];

  return (
    <div className="student-page">
      <StudentHeader studentName={studentName} />
      <main className="student-main">
        <div className="student-container">
          <header className="student-intro">
            <div>
              <span className="student-eyebrow">{course.name}</span>
              <h1>Welcome back, {firstName}</h1>
              <p>See what is available now, what happens next, and where you are in the programme.</p>
            </div>
            <div className="programme-position" aria-label={`Current programme week ${currentWeek}`}>
              <span>Programme position</span>
              <strong>Week {currentWeek}</strong>
            </div>
          </header>

          {currentWeek > 0 && (
            <section className="practice-callout" aria-labelledby="recommended-practice-title">
              <div className="callout-heading">
                <div>
                  <span className="student-eyebrow">Weekly task</span>
                  <h2 id="recommended-practice-title">Recommended practice</h2>
                </div>
                <p>Complete each section&apos;s latest worksheet before its next class begins.</p>
              </div>
              {recommendedPractice.length > 0 ? (
                <div className="practice-list">
                  {recommendedPractice.map(({ session, material }) => (
                    <div className="practice-row" key={material.id}>
                      <div>
                        <span>{session.class_type ?? 'Course'} · Week {session.week_number}</span>
                        <strong>{material.title}</strong>
                      </div>
                      <Link className="student-button" href={`/session/${session.id}/material/${material.id}`}>
                        Open worksheet
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="practice-empty">
                  <strong>No worksheets are currently recommended</strong>
                  <p>A section&apos;s worksheet appears here after class and leaves when that section&apos;s next class begins.</p>
                </div>
              )}
            </section>
          )}

          <section className="week-callout" aria-labelledby="this-week-title">
            <div className="callout-heading">
              <div>
                <span className="student-eyebrow">Week {currentWeek}</span>
                <h2 id="this-week-title">This week</h2>
              </div>
              <p>Times shown in {timeZone}.</p>
            </div>

            {preReadRecommendation && (
              <div className="recommendation-row">
                <span className="recommended-pill">Recommended</span>
                <div>
                  <strong>{preReadRecommendation.section} pre-read for {preReadRecommendation.session.title}</strong>
                  <small>
                    {preReadRecommendation.material
                      ? getMaterialAvailabilityCopy(preReadRecommendation.material, timeZone)
                      : 'No pre-read has been added for this class.'}
                  </small>
                </div>
                {preReadRecommendation.material?.is_available && (
                  <Link
                    className="student-button student-button-light"
                    href={`/session/${preReadRecommendation.session.id}/material/${preReadRecommendation.material.id}`}
                  >
                    Open pre-read
                  </Link>
                )}
              </div>
            )}

            {thisWeekSessions.length > 0 ? (
              <div className="this-week-list">
                {thisWeekSessions.map((session) => (
                  <div className="this-week-row" key={session.id}>
                    <div>
                      <span>{formatProgrammeDateTime(session.session_date, timeZone)}</span>
                      <strong>{session.title}</strong>
                    </div>
                    <ResourceActions sessionId={session.id} materials={session.materials} timeZone={timeZone} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="inline-empty">
                <strong>No scheduled curriculum items this week</strong>
                <p>Use the Timeline to see the next programme event.</p>
              </div>
            )}
          </section>

          <section className="course-browser" aria-labelledby="course-browser-title">
            <div className="browser-heading">
              <div>
                <span className="student-eyebrow">Your course</span>
                <h2 id="course-browser-title">Find a curriculum item</h2>
              </div>
              <nav className="view-switcher" aria-label="Course views">
                <Link
                  className={!isSectionView ? 'active' : ''}
                  href="/dashboard"
                  aria-current={!isSectionView ? 'page' : undefined}
                  scroll={false}
                >
                  Timeline
                </Link>
                <Link
                  className={isSectionView ? 'active' : ''}
                  href={`/dashboard?view=section&section=${selectedSection}`}
                  aria-current={isSectionView ? 'page' : undefined}
                  scroll={false}
                >
                  Browse by section
                </Link>
              </nav>
            </div>

            {isSectionView ? (
              <div>
                <nav className="section-switcher" aria-label="Academic sections">
                  {SECTIONS.map((section) => (
                    <Link
                      className={selectedSection === section ? 'active' : ''}
                      href={`/dashboard?view=section&section=${section}`}
                      key={section}
                      aria-current={selectedSection === section ? 'page' : undefined}
                      scroll={false}
                    >
                      {section}
                    </Link>
                  ))}
                </nav>
                <div className="section-results">
                  <p className="result-count">{sectionSessions.length} {selectedSection} curriculum items in course order</p>
                  {sectionSessions.map((session) => (
                    <TimelineItem
                      key={session.id}
                      session={session}
                      timeZone={timeZone}
                    />
                  ))}
                </div>
              </div>
            ) : sessions.length > 0 ? (
              <div className="week-groups">
                {weekGroups.map(({ weekNumber, sessions: groupedSessions }) => (
                  <WeekDisclosure
                    key={weekNumber}
                    weekNumber={weekNumber}
                    itemCount={groupedSessions.length}
                    initiallyOpen={weekNumber === currentWeek}
                  >
                    <div className="timeline-list">
                      {groupedSessions.map((session) => (
                        <TimelineItem
                          key={session.id}
                          session={session}
                          timeZone={timeZone}
                        />
                      ))}
                    </div>
                  </WeekDisclosure>
                ))}
              </div>
            ) : (
              <div className="student-state compact">
                <h3>Your schedule is not available yet</h3>
                <p>The programme team is preparing the curriculum. Check back later or contact support.</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
