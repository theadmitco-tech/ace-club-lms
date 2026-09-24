import Link from 'next/link';
import { StudentHeader } from '@/components/student/StudentHeader';
import { ResourceCard } from '@/components/student/ResourceCard';
import { requirePortalRole } from '@/lib/server/portalAuthorization';
import { loadStudentPracticeOverview } from '@/lib/server/studentPractice';
import { formatProgrammeDateTime } from '@/lib/studentTimeline';
import '../dashboard/dashboard.css';
import './practice.css';

export default async function PracticeLogPage() {
  const identity = await requirePortalRole('student');
  const result = await loadStudentPracticeOverview();
  const studentName = identity.fullName;

  if (result.status === 'failed') {
    return (
      <div className="student-page">
        <StudentHeader studentName={studentName} />
        <main className="student-main">
          <section className="student-state student-state-error" role="alert">
            <span className="state-kicker">Practice log unavailable</span>
            <h1>We couldn&apos;t load your Practice log</h1>
            <p>{result.message}</p>
            <Link className="student-button" href="/practice">Retry Practice log</Link>
          </section>
        </main>
      </div>
    );
  }

  const { course, worksheets } = result.data;
  const sectionOrder = ['QA', 'VA', 'DI'];
  const groups = worksheets.reduce((map, worksheet) => {
    const section = worksheet.section ?? 'Other';
    const group = map.get(section) ?? [];
    group.push(worksheet);
    map.set(section, group);
    return map;
  }, new Map<string, typeof worksheets>());

  return (
    <div className="student-page">
      <StudentHeader studentName={studentName} />
      <main className="student-main practice-overview-main">
        <div className="practice-overview-container">
          <header className="practice-overview-header">
            <div>
              <span className="student-eyebrow">{course?.name ?? 'Your course'}</span>
              <h1>Practice log</h1>
              <p>Review released worksheets by section and continue the same manual log from any course view.</p>
            </div>
            <Link className="student-button student-button-secondary" href="/dashboard">Return to course</Link>
          </header>

          {!course ? (
            <section className="student-state">
              <h2>No course assigned</h2>
              <p>Your released worksheet logs will appear after the programme team assigns your cohort.</p>
            </section>
          ) : worksheets.length === 0 ? (
            <section className="student-state">
              <h2>No released worksheets yet</h2>
              <p>Worksheets appear here after their classes end and tracker questions are available.</p>
            </section>
          ) : (
            <div className="practice-week-groups">
              {Array.from(groups.entries()).sort(([left], [right]) => {
                const leftIndex = sectionOrder.indexOf(left);
                const rightIndex = sectionOrder.indexOf(right);
                if (leftIndex === -1 && rightIndex === -1) return left.localeCompare(right);
                if (leftIndex === -1) return 1;
                if (rightIndex === -1) return -1;
                return leftIndex - rightIndex;
              }).map(([section, items]) => (
                <section className="practice-week-group" key={section} aria-labelledby={`practice-section-${section}`}>
                  <div className="practice-week-heading">
                    <h2 id={`practice-section-${section}`}>{section}</h2>
                    <span>{items.length} worksheet{items.length === 1 ? '' : 's'}</span>
                  </div>
                  <div className="practice-overview-list">
                    {items.map((worksheet) => (
                      <article className="practice-overview-card" key={worksheet.material_id}>
                        <ResourceCard
                          actions={[
                            {
                              href: `/session/${worksheet.session_id}/material/${worksheet.material_id}`,
                              label: 'Open worksheet',
                            },
                            {
                              href: `/session/${worksheet.session_id}/material/${worksheet.material_id}?focus=log#worksheet-log`,
                              label: worksheet.last_updated ? 'Update log' : 'Start log',
                              secondary: true,
                            },
                          ]}
                          availability={worksheet.last_updated
                            ? `Last updated ${formatProgrammeDateTime(worksheet.last_updated, course.schedule_timezone)}`
                            : 'Not updated yet'}
                          context={`Week ${worksheet.week_number} · ${worksheet.session_title}`}
                          title={worksheet.title}
                          type="worksheet"
                        />
                        <div className="practice-overview-totals" aria-label={`Progress for ${worksheet.title}`}>
                          <span><strong>{worksheet.done_count}</strong> Done</span>
                          <span><strong>{worksheet.review_count}</strong> Review</span>
                          <span><strong>{worksheet.total_questions - worksheet.done_count - worksheet.review_count}</strong> Not updated</span>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
