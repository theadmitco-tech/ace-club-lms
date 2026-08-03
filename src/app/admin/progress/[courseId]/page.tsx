import Link from 'next/link';
import { getAdminProgressCounts } from '@/lib/adminPractice';
import { loadAdminCoursePracticeProgress } from '@/lib/server/adminPractice';

function formatLastUpdated(value: string | null, timezone: string) {
  if (!value) return 'No updates yet';
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: timezone,
  }).format(new Date(value));
}

export default async function AdminCourseProgressPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const result = await loadAdminCoursePracticeProgress(courseId);

  if (result.status === 'failed') {
    return (
      <div className="animate-fade-in">
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">Student progress</h1>
            <p className="admin-page-subtitle">{result.message}</p>
          </div>
          <Link className="btn btn-secondary" href="/admin/progress">← All batches</Link>
        </div>
        <div className="admin-card admin-progress-message" role="alert">
          <h2 className="admin-card-title">Batch progress unavailable</h2>
          <p>No Student tracker information has been shown.</p>
        </div>
      </div>
    );
  }

  const { course, students, worksheets, progress } = result.data;

  return (
    <div className="animate-fade-in">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">{course.name}</h1>
          <p className="admin-page-subtitle">Completion counts only Done questions. Review questions remain incomplete.</p>
        </div>
        <Link className="btn btn-secondary" href="/admin/progress">← All batches</Link>
      </div>

      {students.length === 0 ? (
        <div className="admin-card admin-progress-message">
          <h2 className="admin-card-title">No enrolled Students</h2>
          <p>Enroll a Student in this batch before checking progress.</p>
        </div>
      ) : worksheets.length === 0 ? (
        <div className="admin-card admin-progress-message">
          <h2 className="admin-card-title">No released worksheets yet</h2>
          <p>Progress will appear after a worksheet with fixed questions reaches its release time.</p>
        </div>
      ) : (
        <div className="admin-progress-worksheet-list">
          {worksheets.map((worksheet) => (
            <section className="admin-card" key={worksheet.material_id}>
              <div className="admin-card-header admin-progress-card-heading">
                <div>
                  <h2 className="admin-card-title">{worksheet.title}</h2>
                  <p className="admin-progress-meta">
                    {worksheet.section || 'Other'} · Week {worksheet.week_number} · {worksheet.session_title}
                  </p>
                </div>
                <span className="badge badge-available">{worksheet.total_questions} questions</span>
              </div>

              <div className="admin-table-container">
                <table className="admin-table admin-progress-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Done</th>
                      <th>Review</th>
                      <th>Not updated</th>
                      <th>Completion</th>
                      <th>Last update</th>
                      <th><span className="sr-only">Inspect</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => {
                      const row = progress.find((item) => (
                        item.user_id === student.id && item.material_id === worksheet.material_id
                      ));
                      const counts = getAdminProgressCounts(row, worksheet.total_questions);

                      return (
                        <tr key={student.id}>
                          <td>
                            <div className="admin-progress-student-name">
                              {student.full_name || 'Student'}
                              {!student.is_active && <span className="badge badge-locked">Inactive</span>}
                            </div>
                            <div className="admin-progress-meta">{student.email}</div>
                          </td>
                          <td>{counts.done}</td>
                          <td>{counts.review}</td>
                          <td>{counts.notUpdated}</td>
                          <td><strong>{counts.completionPercent}%</strong></td>
                          <td>{formatLastUpdated(row?.last_updated || null, course.schedule_timezone)}</td>
                          <td>
                            <Link
                              className="btn btn-secondary btn-sm"
                              href={`/admin/progress/${course.id}/student/${student.id}/worksheet/${worksheet.material_id}`}
                            >
                              Inspect log
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
