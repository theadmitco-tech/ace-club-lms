import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ResourceActions } from '@/components/student/ResourceActions';
import { StudentHeader } from '@/components/student/StudentHeader';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { loadStudentTimeline } from '@/lib/server/studentTimeline';
import {
  formatProgrammeDateTime,
  getMaterialAvailabilityCopy,
  isAcademicSection,
  type StudentTimelineMaterial,
} from '@/lib/studentTimeline';
import '../../dashboard/dashboard.css';
import './session.css';

const JOURNEY_STEPS: Array<{
  type: StudentTimelineMaterial['type'] | 'class';
  label: string;
  description: string;
}> = [
  { type: 'pre_read', label: 'Pre-read', description: 'Prepare before class' },
  { type: 'class', label: 'Class', description: 'Attend the scheduled class' },
  { type: 'video', label: 'Recording', description: 'Review after class' },
  { type: 'worksheet', label: 'Worksheet', description: 'Practise after class' },
];

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id: sessionId }, identity] = await Promise.all([params, requirePortalRole('student')]);
  const result = await loadStudentTimeline(identity.id);

  if (result.status === 'failed') {
    return (
      <div className="student-page">
        <StudentHeader studentName={result.studentName} />
        <main className="student-main">
          <section className="student-state student-state-error" role="alert">
            <h1>We couldn&apos;t load this curriculum item</h1>
            <p>{result.message}</p>
            <Link className="student-button" href="/dashboard">Return to Timeline</Link>
          </section>
        </main>
      </div>
    );
  }

  const session = result.timeline.sessions.find((item) => item.id === sessionId);
  if (!session || !result.timeline.course) notFound();

  const timeZone = result.timeline.course.schedule_timezone;
  const isAcademic = isAcademicSection(session.class_type);

  return (
    <div className="student-page">
      <StudentHeader studentName={result.studentName} />
      <main className="student-main session-journey-main">
        <div className="session-journey-container">
          <Link
            className="session-back-link"
            href={`/dashboard?openWeek=${session.week_number ?? 0}#session-${session.id}`}
          >
            ← Back to Timeline
          </Link>
          <header className="session-journey-header">
            <div className="timeline-meta">
              <span className="timeline-type">{session.class_type ?? 'Programme'}</span>
              <span>Week {session.week_number ?? 0}</span>
            </div>
            <h1>{session.title}</h1>
            <p>
              {formatProgrammeDateTime(session.session_date, timeZone)}
              {session.instructor ? ` · With ${session.instructor}` : ''}
            </p>
          </header>

          {isAcademic ? (
            <section className="journey-panel" aria-labelledby="journey-title">
              <div className="journey-panel-heading">
                <span className="student-eyebrow">Learning sequence</span>
                <h2 id="journey-title">Prepare → Attend class → Practise</h2>
              </div>
              <ol className="journey-step-list">
                {JOURNEY_STEPS.map((step, index) => {
                  const materials = step.type === 'class'
                    ? []
                    : session.materials.filter((material) => material.type === step.type);
                  return (
                    <li className="journey-step" key={step.type}>
                      <span className="journey-step-number">{index + 1}</span>
                      <div className="journey-step-copy">
                        <strong>{step.label}</strong>
                        <p>{step.description}</p>
                      </div>
                      {step.type === 'class' ? (
                        <div className="journey-step-state">
                          <strong>{formatProgrammeDateTime(session.session_date, timeZone)}</strong>
                          <small>{session.instructor ? `With ${session.instructor}` : 'Programme event'}</small>
                        </div>
                      ) : materials.length > 0 ? (
                        <div className="journey-materials">
                          {materials.map((material) => (
                            <div className="journey-material" key={material.id}>
                              <div>
                                <strong>{material.title}</strong>
                                <small>{getMaterialAvailabilityCopy(material, timeZone)}</small>
                              </div>
                              {material.is_available && (
                                <Link className="student-button" href={`/session/${session.id}/material/${material.id}`}>
                                  {step.type === 'pre_read' ? 'Open pre-read' : step.type === 'video' ? 'Watch recording' : 'Open worksheet'}
                                </Link>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="not-configured-copy">Not configured</span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          ) : (
            <section className="journey-panel">
              <div className="journey-panel-heading">
                <span className="student-eyebrow">Programme event</span>
                <h2>Event details</h2>
                <p>This item does not add academic steps unless the programme team configures a resource.</p>
              </div>
              <ResourceActions
                includeClassMaterial
                sessionId={session.id}
                materials={session.materials}
                timeZone={timeZone}
              />
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
