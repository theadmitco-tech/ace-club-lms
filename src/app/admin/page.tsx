'use client';

import { getSessions, getUsers, getCourses, getEnrollments } from '@/lib/mockData';
import { formatDate } from '@/lib/utils';

export default function AdminDashboard() {
  const sessions = getSessions();
  const users = getUsers();
  const courses = getCourses();
  const students = getUsers('student');
  const admins = getUsers('admin');
  const enrollments = getEnrollments();

  const totalMaterials = sessions.reduce((acc, s) => {
    const session = getSessions().find(ss => ss.id === s.id);
    return acc + (session ? 0 : 0);
  }, 0);

  return (
    <div className="animate-fade-in">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Dashboard</h1>
          <p className="admin-page-subtitle">Overview of your Ace Club platform</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-icon">📋</div>
          <div className="admin-stat-info">
            <div className="admin-stat-number">{sessions.length}</div>
            <div className="admin-stat-label">Sessions</div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon">👥</div>
          <div className="admin-stat-info">
            <div className="admin-stat-number">{students.length}</div>
            <div className="admin-stat-label">Students</div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon">📚</div>
          <div className="admin-stat-info">
            <div className="admin-stat-number">{courses.length}</div>
            <div className="admin-stat-label">Courses</div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon">🎫</div>
          <div className="admin-stat-info">
            <div className="admin-stat-number">{enrollments.length}</div>
            <div className="admin-stat-label">Enrollments</div>
          </div>
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="admin-card" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="admin-card-header">
          <h2 className="admin-card-title">Recent Sessions</h2>
        </div>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Title</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sessions.slice(0, 5).map((session) => (
                <tr key={session.id}>
                  <td>
                    <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                      {String(session.session_number).padStart(2, '0')}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500 }}>{session.title}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{formatDate(session.session_date)}</td>
                  <td>
                    <span className={`badge ${session.is_published ? 'badge-available' : 'badge-locked'}`}>
                      {session.is_published ? '● Published' : '○ Draft'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Students */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">Students</h2>
        </div>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Enrolled</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const studentEnrollments = getEnrollments(student.id);
                return (
                  <tr key={student.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          background: 'var(--accent-gradient)',
                          color: 'white',
                          fontSize: '10px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          {student.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <span style={{ fontWeight: 500 }}>{student.full_name}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{student.email}</td>
                    <td>
                      <span className="badge badge-available">
                        {studentEnrollments.length} course{studentEnrollments.length !== 1 ? 's' : ''}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
