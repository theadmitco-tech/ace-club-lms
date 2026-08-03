import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { createClient } from '@/utils/supabase/server';

type AdminSession = {
  id: string;
  title: string;
  session_number: number;
  session_date: string;
  is_published: boolean;
};

type AdminProfile = {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'student';
};

export default async function AdminDashboard() {
  const supabase = await createClient();
  const [sessionsResult, profilesResult, coursesResult, enrollmentsResult] = await Promise.all([
    supabase
      .from('sessions')
      .select('id, title, session_number, session_date, is_published')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .order('created_at', { ascending: false }),
    supabase.from('courses').select('id'),
    supabase.from('enrollments').select('id'),
  ]);

  const sessions = (sessionsResult.data || []) as AdminSession[];
  const profiles = (profilesResult.data || []) as AdminProfile[];
  const students = profiles.filter((profile) => profile.role === 'student');
  const loadFailed = [sessionsResult, profilesResult, coursesResult, enrollmentsResult]
    .some((result) => Boolean(result.error));

  return (
    <div className="animate-fade-in">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Dashboard</h1>
          <p className="admin-page-subtitle">Programme operations and manual Student progress.</p>
        </div>
        <Link className="btn btn-primary" href="/admin/progress">View Student progress</Link>
      </div>

      {loadFailed && (
        <div className="admin-card admin-progress-message" role="alert" style={{ marginBottom: 'var(--space-xl)' }}>
          <h2 className="admin-card-title">Some dashboard information could not be loaded</h2>
          <p>Retry this page. Existing Admin destinations remain available.</p>
        </div>
      )}

      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-icon">📋</div>
          <div className="admin-stat-info"><div className="admin-stat-number">{sessions.length}+</div><div className="admin-stat-label">Recent sessions</div></div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon">👥</div>
          <div className="admin-stat-info"><div className="admin-stat-number">{students.length}</div><div className="admin-stat-label">Students</div></div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon">📚</div>
          <div className="admin-stat-info"><div className="admin-stat-number">{coursesResult.data?.length || 0}</div><div className="admin-stat-label">Batches</div></div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon">🎫</div>
          <div className="admin-stat-info"><div className="admin-stat-number">{enrollmentsResult.data?.length || 0}</div><div className="admin-stat-label">Enrollments</div></div>
        </div>
      </div>

      <div className="admin-card" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="admin-card-header"><h2 className="admin-card-title">Recent sessions</h2></div>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead><tr><th>#</th><th>Title</th><th>Date</th><th>Status</th></tr></thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id}>
                  <td><strong>{String(session.session_number).padStart(2, '0')}</strong></td>
                  <td>{session.title}</td>
                  <td>{formatDate(session.session_date)}</td>
                  <td><span className={`badge ${session.is_published ? 'badge-available' : 'badge-locked'}`}>{session.is_published ? 'Published' : 'Draft'}</span></td>
                </tr>
              ))}
              {sessions.length === 0 && <tr><td colSpan={4}>No sessions yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card-header"><h2 className="admin-card-title">Students</h2></div>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead><tr><th>Name</th><th>Email</th><th>Progress</th></tr></thead>
            <tbody>
              {students.slice(0, 8).map((student) => (
                <tr key={student.id}>
                  <td>{student.full_name || 'Student'}</td>
                  <td>{student.email}</td>
                  <td><Link className="btn btn-secondary btn-sm" href="/admin/progress">Open batch progress</Link></td>
                </tr>
              ))}
              {students.length === 0 && <tr><td colSpan={3}>No Students yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
