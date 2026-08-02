import './dashboard.css';

export default function DashboardLoading() {
  return (
    <div className="student-page">
      <div className="student-loading" role="status">
        <span className="loading-mark" aria-hidden="true">A</span>
        <div>
          <strong>Loading your course</strong>
          <p>Preparing this week and your timeline…</p>
        </div>
      </div>
    </div>
  );
}
