import Link from 'next/link';
import { PortalResourceCard } from '@/components/student/PortalResourceCard';
import { ResourceCard } from '@/components/student/ResourceCard';
import { StudentHeader } from '@/components/student/StudentHeader';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { loadStudentTimeline } from '@/lib/server/studentTimeline';
import {
  formatProgrammeDateTime,
  getDateKeyInTimeZone,
  getCurrentProgrammeWeek,
  getLastClassSessionMaterials,
  getMaterialAvailabilityCopy,
  getNextClassPreReads,
  getNextEvent,
  getRecommendedPractice,
  isCrashCourse,
} from '@/lib/studentTimeline';
import './dashboard.css';

export default async function DashboardPage() {
  const identity = await requirePortalRole('student');
  const result = await loadStudentTimeline(identity.id, identity.fullName);

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
  const crashCourse = isCrashCourse(course, sessions);
  const currentWeek = getCurrentProgrammeWeek(course, generatedAt);
  const recommendedPractice = getRecommendedPractice(sessions, generatedAt);
  const nextClassPreReads = getNextClassPreReads(sessions, generatedAt);
  const lastClassSessionMaterials = getLastClassSessionMaterials(sessions, generatedAt);
  const recommendedPreReads = nextClassPreReads.filter(({ materials }) => materials.length > 0);
  const recommendedSessionMaterials = lastClassSessionMaterials.filter(({ materials }) => materials.length > 0);
  const starterPacks = (timeline.resources ?? []).filter((resource) => resource.category === 'starter_pack');
  const isBeforeBatchStart = Boolean(
    course.cohort_start_date
    && getDateKeyInTimeZone(generatedAt, timeZone) < course.cohort_start_date,
  );
  const nextEvent = getNextEvent(sessions, generatedAt);
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
            <div className="programme-position" aria-label={crashCourse ? 'Crash course' : `Current programme week ${currentWeek}`}>
              <span>Programme position</span>
              <strong>{crashCourse ? 'Crash course' : `Week ${currentWeek}`}</strong>
            </div>
          </header>

          <section className="home-summary-grid" aria-label="Course summary">
            <article className="home-summary-card">
              <span className="student-eyebrow">Next event</span>
              {nextEvent ? (
                <>
                  <h2>{nextEvent.title}</h2>
                  <p>{formatProgrammeDateTime(nextEvent.session_date, timeZone)}</p>
                  <Link className="text-link" href={`/session/${nextEvent.id}`}>View event</Link>
                </>
              ) : <p>No upcoming published event.</p>}
            </article>
          </section>

          <section className="practice-callout" aria-labelledby="recommended-practice-title">
              <div className="callout-heading">
                <div>
                  <span className="student-eyebrow">Weekly task</span>
                  <h2 id="recommended-practice-title">Recommended practice</h2>
                </div>
              </div>
              {recommendedPractice.length > 0 ? (
                <div className="practice-list">
                  {recommendedPractice.map(({ session, material }) => (
                    <ResourceCard
                      actions={[
                        {
                          href: `/session/${session.id}/material/${material.id}`,
                          label: 'Open worksheet',
                        },
                        ...(material.tracker_available ? [{
                          href: `/session/${session.id}/material/${material.id}?focus=log#worksheet-log`,
                          label: 'Update log',
                          secondary: true,
                        }] : []),
                      ]}
                      availability={getMaterialAvailabilityCopy(material, timeZone)}
                      context={`${session.class_type ?? 'Course'} · Week ${session.week_number}`}
                      hideDetails
                      key={material.id}
                      title={material.title}
                      type="worksheet"
                    />
                  ))}
                </div>
              ) : (
                <div className="practice-empty">
                  <strong>No worksheets are currently recommended</strong>
                  <p>A section&apos;s worksheet appears here after class and leaves when that section&apos;s next class begins.</p>
                </div>
              )}
          </section>

          <section className="practice-callout reading-callout" aria-labelledby="recommended-reading-title">
              <div className="callout-heading">
                <div>
                  <span className="student-eyebrow">Prepare &amp; review</span>
                  <h2 id="recommended-reading-title">Recommended reading</h2>
                </div>
              </div>
              <div className="reading-subsections">
                {isBeforeBatchStart && starterPacks.length > 0 && (
                  <section className="reading-subsection" aria-labelledby="starter-packs-title">
                    <div className="reading-subsection-heading">
                      <h3 id="starter-packs-title">Starter Packs</h3>
                    </div>
                    <div className="practice-list reading-resource-list">
                      {starterPacks.map((resource) => <PortalResourceCard hideDetails key={resource.id} resource={resource} />)}
                    </div>
                  </section>
                )}
                <section className="reading-subsection" aria-labelledby="next-class-pre-reads-title">
                  <div className="reading-subsection-heading">
                    <h3 id="next-class-pre-reads-title">Next class pre-reads</h3>
                  </div>
                  {recommendedPreReads.length > 0 ? recommendedPreReads.map(({ section, session, materials }) => (
                    <div className="reading-section-group" key={section}>
                      <div className="reading-section-label">
                        <strong>{section}</strong>
                      </div>
                      <div className="practice-list reading-resource-list">
                        {materials.map((material) => (
                          <ResourceCard
                            actions={material.is_available ? [{
                              href: `/session/${session!.id}/material/${material.id}`,
                              label: 'Open pre-read',
                            }] : []}
                            availability={getMaterialAvailabilityCopy(material, timeZone)}
                            context={`Next ${section} class · ${session!.title}`}
                            hideDetails
                            key={material.id}
                            title={material.title}
                            type="pre_read"
                          />
                        ))}
                      </div>
                    </div>
                  )) : <div className="practice-empty reading-missing">
                    <strong>No pre-reads are currently recommended</strong>
                    <p>Pre-reads appear here only during an active between-class recommendation window.</p>
                  </div>}
                </section>

                <section className="reading-subsection" aria-labelledby="last-class-materials-title">
                  <div className="reading-subsection-heading">
                    <h3 id="last-class-materials-title">Last class Session materials</h3>
                  </div>
                  {recommendedSessionMaterials.length > 0 ? recommendedSessionMaterials.map(({ section, session, materials }) => (
                    <div className="reading-section-group" key={section}>
                      <div className="reading-section-label">
                        <strong>{section}</strong>
                      </div>
                      <div className="practice-list reading-resource-list">
                        {materials.map((material) => (
                          <ResourceCard
                            actions={[{
                              href: `/session/${session!.id}/material/${material.id}`,
                              label: 'Open session material',
                            }]}
                            availability={getMaterialAvailabilityCopy(material, timeZone)}
                            context={`Last ${section} class · ${session!.title}`}
                            hideDetails
                            key={material.id}
                            title={material.title}
                            type="session_material"
                          />
                        ))}
                      </div>
                    </div>
                  )) : <div className="practice-empty reading-missing">
                    <strong>No Session materials are currently recommended</strong>
                    <p>Session materials appear here only during an active between-class recommendation window.</p>
                  </div>}
                </section>
              </div>
          </section>

        </div>
      </main>
    </div>
  );
}
