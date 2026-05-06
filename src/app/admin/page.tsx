'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { formatDate } from '@/lib/utils';
import type { WorksheetDailyTarget } from '@/lib/types';
import { summarizeWorksheetProgress, toDateKey } from '@/lib/worksheetProgress';

interface AdminSession {
  id: string;
  title: string;
  session_number: number;
  session_date: string;
  is_published: boolean;
}

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'student';
}

interface AdminCourse {
  id: string;
}

interface AdminEnrollment {
  id: string;
  user_id: string;
  course_id: string;
}

interface AttemptStatsRow {
  user_id: string;
  attempted_total: number;
  correct_total: number;
  accuracy: number;
  last_attempt_date: string | null;
  active_today: boolean;
}

interface AdminDashboardData {
  sessions: AdminSession[];
  users: AdminUser[];
  courses: AdminCourse[];
  enrollments: AdminEnrollment[];
}

export default function AdminDashboard() {
  const [data, setData] = useState<AdminDashboardData>({
    sessions: [],
    users: [],
    courses: [],
    enrollments: []
  });
  const [worksheetData, setWorksheetData] = useState<{
    targets: WorksheetDailyTarget[];
    attemptStats: AttemptStatsRow[];
    courseId: string | null;
    unavailable: boolean;
  }>({
    targets: [],
    attemptStats: [],
    courseId: null,
    unavailable: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function fetchDashboardData() {
      setIsLoading(true);

      const [
        { data: sessions },
        { data: users },
        { data: courses },
        { data: enrollments },
        { data: plans, error: plansError }
      ] = await Promise.all([
        supabase.from('sessions').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('courses').select('id'),
        supabase.from('enrollments').select('*'),
        supabase.from('master_worksheet_plans').select('id').eq('is_active', true).limit(1)
      ]);

      setData({
        sessions: (sessions || []) as AdminSession[],
        users: (users || []) as AdminUser[],
        courses: (courses || []) as AdminCourse[],
        enrollments: (enrollments || []) as AdminEnrollment[]
      });

      if (plansError) {
        setWorksheetData({ targets: [], attemptStats: [], courseId: null, unavailable: true });
      } else if (plans?.[0] && enrollments?.[0]) {
        const monitorCourseId = enrollments[0].course_id;
        const [{ data: targets }, { data: attemptStats, error: attemptStatsError }] = await Promise.all([
          supabase.from('worksheet_daily_targets').select('*').eq('course_id', monitorCourseId).eq('is_active', true),
          supabase.rpc('get_course_worksheet_attempt_stats', { p_course_id: monitorCourseId }),
        ]);
        setWorksheetData({
          targets: (targets || []) as WorksheetDailyTarget[],
          attemptStats: attemptStatsError ? [] : (attemptStats || []) as AttemptStatsRow[],
          courseId: monitorCourseId,
          unavailable: Boolean(attemptStatsError),
        });
      }
      setIsLoading(false);
    }

    fetchDashboardData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const students = data.users.filter((user) => user.role === 'student');
  const worksheetEnrollments = worksheetData.courseId
    ? data.enrollments.filter((enrollment) => enrollment.course_id === worksheetData.courseId)
    : [];
  const todayKey = toDateKey(new Date());
  const expectedTotal = worksheetData.targets
    .filter((target) => target.target_date <= todayKey)
    .reduce((sum, target) => sum + target.target_count, 0);
  const attemptedTotal = worksheetData.attemptStats.reduce((sum, row) => sum + Number(row.attempted_total || 0), 0);
  const correctTotal = worksheetData.attemptStats.reduce((sum, row) => sum + Number(row.correct_total || 0), 0);
  const worksheetRiskRows = worksheetEnrollments.map((enrollment) => {
    const student = data.users.find((user) => user.id === enrollment.user_id);
    const attemptStats = worksheetData.attemptStats.find((row) => row.user_id === enrollment.user_id);
    const summary = summarizeWorksheetProgress({
      targets: worksheetData.targets,
      logs: [{
        id: enrollment.user_id,
        target_id: enrollment.user_id,
        course_id: enrollment.course_id,
        user_id: enrollment.user_id,
        log_date: todayKey,
        section: 'quant',
        attempted_count: attemptStats?.attempted_total || 0,
        created_at: todayKey,
      }],
    });
    return { enrollment, student, summary, attemptStats };
  });
  const worksheetStats = {
    completionPercent: expectedTotal * Math.max(worksheetEnrollments.length, 1) > 0
      ? Math.round((attemptedTotal / (expectedTotal * Math.max(worksheetEnrollments.length, 1))) * 100)
      : 0,
    activeToday: worksheetData.attemptStats.filter((row) => row.active_today).length,
    classAverage: worksheetEnrollments.length > 0 ? Math.round(attemptedTotal / worksheetEnrollments.length) : 0,
    classAccuracy: attemptedTotal > 0 ? Math.round((correctTotal / attemptedTotal) * 100) : 0,
    onTrackCount: worksheetRiskRows.filter((row) => row.summary.status !== 'behind').length,
    behindCount: worksheetRiskRows.filter((row) => row.summary.status === 'behind').length,
  };

  if (isLoading) {
    return (
      <div className="admin-loading">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

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
            <div className="admin-stat-number">{data.sessions.length}+</div>
            <div className="admin-stat-label">Recent Sessions</div>
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
            <div className="admin-stat-number">{data.courses.length}</div>
            <div className="admin-stat-label">Courses</div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon">🎫</div>
          <div className="admin-stat-info">
            <div className="admin-stat-number">{data.enrollments.length}</div>
            <div className="admin-stat-label">Enrollments</div>
          </div>
        </div>
      </div>

      {!worksheetData.unavailable && worksheetData.courseId && (
        <div className="admin-card" style={{ marginBottom: 'var(--space-xl)' }}>
          <div className="admin-card-header">
            <h2 className="admin-card-title">Worksheet Progress</h2>
          </div>
          <div className="admin-stats-grid" style={{ marginBottom: 'var(--space-xl)' }}>
            <div className="admin-stat-card">
              <div className="admin-stat-icon">%</div>
              <div className="admin-stat-info">
                <div className="admin-stat-number">{worksheetStats.completionPercent}%</div>
                <div className="admin-stat-label">Completion</div>
              </div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-icon">✓</div>
              <div className="admin-stat-info">
                <div className="admin-stat-number">{worksheetStats.activeToday}</div>
                <div className="admin-stat-label">Logged today</div>
              </div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-icon">Ø</div>
              <div className="admin-stat-info">
                <div className="admin-stat-number">{worksheetStats.classAverage}</div>
                <div className="admin-stat-label">Class average</div>
              </div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-icon">%</div>
              <div className="admin-stat-info">
                <div className="admin-stat-number">{worksheetStats.classAccuracy}%</div>
                <div className="admin-stat-label">Class accuracy</div>
              </div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-icon">→</div>
              <div className="admin-stat-info">
                <div className="admin-stat-number">{worksheetStats.onTrackCount}</div>
                <div className="admin-stat-label">On track</div>
              </div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-icon">!</div>
              <div className="admin-stat-info">
                <div className="admin-stat-number">{worksheetStats.behindCount}</div>
                <div className="admin-stat-label">Behind</div>
              </div>
            </div>
          </div>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>At-risk student</th>
                  <th>Shortfall</th>
                  <th>Accuracy</th>
                  <th>Last attempt</th>
                </tr>
              </thead>
              <tbody>
                {worksheetRiskRows.filter((row) => row.summary.status === 'behind').slice(0, 6).map((row) => (
                  <tr key={row.enrollment.user_id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{row.student?.full_name || 'Student'}</div>
                      <div style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>{row.student?.email}</div>
                    </td>
                    <td>{row.summary.shortfall} questions</td>
                    <td>{Math.round(Number(row.attemptStats?.accuracy || 0))}%</td>
                    <td>{row.attemptStats?.last_attempt_date || 'No attempts'}</td>
                  </tr>
                ))}
                {worksheetRiskRows.filter((row) => row.summary.status === 'behind').length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: 28 }}>
                      No students are behind by 2 weekdays.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
              {data.sessions.map((session) => (
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
              {students.slice(0, 10).map((student) => {
                const studentEnrollments = data.enrollments.filter((enrollment) => enrollment.user_id === student.id);
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
                          {student.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
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
