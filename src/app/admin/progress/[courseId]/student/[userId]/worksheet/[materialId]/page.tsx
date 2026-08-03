import Link from 'next/link';
import { loadAdminStudentWorksheetProgress } from '@/lib/server/adminPractice';
import { formatTrackerDuration } from '@/lib/studentPractice';

function formatLastUpdated(value: string | null, timezone: string) {
  if (!value) return 'Not updated';
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: timezone,
  }).format(new Date(value));
}

export default async function AdminStudentWorksheetProgressPage({
  params,
}: {
  params: Promise<{ courseId: string; userId: string; materialId: string }>;
}) {
  const { courseId, userId, materialId } = await params;
  const result = await loadAdminStudentWorksheetProgress(courseId, userId, materialId);
  const backHref = `/admin/progress/${courseId}`;

  if (result.status === 'failed') {
    return (
      <div className="animate-fade-in">
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">Worksheet log</h1>
            <p className="admin-page-subtitle">{result.message}</p>
          </div>
          <Link className="btn btn-secondary" href={backHref}>← Batch progress</Link>
        </div>
        <div className="admin-card admin-progress-message" role="alert">
          <p>No question-level Student information has been shown.</p>
        </div>
      </div>
    );
  }

  const { course, student, worksheet } = result.data;
  const doneCount = worksheet.questions.filter((question) => question.status === 'done').length;
  const reviewCount = worksheet.questions.filter((question) => question.status === 'review').length;
  const notUpdatedCount = worksheet.questions.length - doneCount - reviewCount;
  const completionPercent = worksheet.questions.length > 0
    ? Math.round((doneCount / worksheet.questions.length) * 100)
    : 0;

  return (
    <div className="animate-fade-in">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">{student.full_name || 'Student'} · {worksheet.title}</h1>
          <p className="admin-page-subtitle">
            {course.name} · {worksheet.section || 'Other'} · Week {worksheet.week_number} · Read-only
          </p>
        </div>
        <Link className="btn btn-secondary" href={backHref}>← Batch progress</Link>
      </div>

      <div className="admin-stats-grid admin-progress-totals" aria-label="Worksheet progress totals">
        <div className="admin-stat-card">
          <div className="admin-stat-info"><div className="admin-stat-number">{doneCount}</div><div className="admin-stat-label">Done</div></div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-info"><div className="admin-stat-number">{reviewCount}</div><div className="admin-stat-label">Come back for review</div></div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-info"><div className="admin-stat-number">{notUpdatedCount}</div><div className="admin-stat-label">Not updated</div></div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-info"><div className="admin-stat-number">{completionPercent}%</div><div className="admin-stat-label">Completion</div></div>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card-header admin-progress-card-heading">
          <div>
            <h2 className="admin-card-title">Question log</h2>
            <p className="admin-progress-meta">{student.email}{student.is_active ? '' : ' · Inactive account'}</p>
          </div>
          <span className="badge badge-locked">Admin read-only</span>
        </div>
        <div className="admin-table-container">
          <table className="admin-table admin-progress-question-table">
            <thead>
              <tr><th>Question</th><th>Status</th><th>Time</th><th>Comment</th><th>Last update</th></tr>
            </thead>
            <tbody>
              {worksheet.questions.map((question) => (
                <tr key={question.id}>
                  <td><strong>{question.question_number}</strong></td>
                  <td>
                    <span className={`admin-progress-status admin-progress-status-${question.status || 'empty'}`}>
                      {question.status === 'done'
                        ? 'Done'
                        : question.status === 'review'
                          ? 'Come back for review'
                          : 'Not updated'}
                    </span>
                  </td>
                  <td>{formatTrackerDuration(question.time_taken_seconds) || '—'}</td>
                  <td className="admin-progress-comment">{question.comment || '—'}</td>
                  <td>{formatLastUpdated(question.updated_at, course.schedule_timezone)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
