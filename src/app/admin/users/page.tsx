'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';

type AdminUser = {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'student';
  created_at: string;
};

type Course = {
  id: string;
  name: string;
};

type Enrollment = {
  id: string;
  user_id: string;
  course_id: string;
};

type UsersData = {
  users: AdminUser[];
  courses: Course[];
  enrollments: Enrollment[];
};

export default function AdminUsersPage() {
  const [data, setData] = useState<UsersData>({
    users: [],
    courses: [],
    enrollments: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  const [enrollCourse, setEnrollCourse] = useState('');
  const [enrollMode, setEnrollMode] = useState<'single' | 'bulk'>('single');
  const [newUser, setNewUser] = useState({ email: '', full_name: '', role: 'student' });
  const [bulkEmails, setBulkEmails] = useState('');
  
  const supabase = createClient();
  const { addToast } = useAuth();

  const fetchUsersData = async () => {
    setIsLoading(true);
    const [
      { data: users },
      { data: courses },
      { data: enrollments }
    ] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('courses').select('id, name'),
      supabase.from('enrollments').select('*')
    ]);

    setData({
      users: users || [],
      courses: courses || [],
      enrollments: enrollments || []
    });
    
    if (courses && courses.length > 0 && !enrollCourse) {
      setEnrollCourse(courses[0].id);
    }
    
    setIsLoading(false);
  };

  const handleEnrollAction = async () => {
    if (enrollMode === 'single' && (!newUser.email || !newUser.full_name)) return;
    if (enrollMode === 'bulk' && !bulkEmails) return;
    
    setIsSubmitting(true);
    
    let emailsToProcess: string[] = [];
    
    if (enrollMode === 'single') {
      emailsToProcess = [newUser.email];
      // Note: role is ignored here since bulk-enroll always creates students
    } else {
      emailsToProcess = bulkEmails
        .split(/[\n,]/)
        .map(e => e.trim())
        .filter(e => e.length > 0 && e.includes('@'));
    }

    if (emailsToProcess.length > 0 && enrollCourse) {
      try {
        const res = await fetch('/api/admin/bulk-enroll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emails: emailsToProcess, courseId: enrollCourse })
        });
        const result = await res.json();
        
        if (result.failed > 0) {
          addToast('warning', `Processed with ${result.failed} errors.`);
        } else {
          addToast('success', `Successfully processed ${result.success} users!`);
        }
      } catch {
        addToast('error', 'Failed to process enrollments.');
      }
    } else if (emailsToProcess.length > 0 && !enrollCourse) {
       addToast('error', 'Please select a batch to enroll in.');
    }

    await fetchUsersData();
    setNewUser({ email: '', full_name: '', role: 'student' });
    setBulkEmails('');
    setShowAddUser(false);
    setIsSubmitting(false);
  };

  const handleToggleEnrollment = async (userId: string, courseId: string) => {
    const isEnrolled = data.enrollments.some((e) => e.user_id === userId && e.course_id === courseId);
    
    if (isEnrolled) {
      // Unenroll
      const { error } = await supabase
        .from('enrollments')
        .delete()
        .eq('user_id', userId)
        .eq('course_id', courseId);
      if (error) addToast('error', 'Failed to unenroll.');
      else addToast('success', 'User unenrolled.');
    } else {
      // Enroll
      const { error } = await supabase
        .from('enrollments')
        .insert({ user_id: userId, course_id: courseId });
      if (error) addToast('error', 'Failed to enroll.');
      else addToast('success', 'User enrolled.');
    }
    
    void fetchUsersData();
  };

  const handleDeleteUser = async (userId: string) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const result = await res.json();
      if (result.success) {
        addToast('success', 'User deleted from platform.');
        fetchUsersData();
      } else {
        addToast('error', result.error || 'Failed to delete user.');
      }
    } catch {
      addToast('error', 'An error occurred while deleting user.');
    }
    setDeleteConfirm(null);
    setIsSubmitting(false);
  };

  useEffect(() => {
    void fetchUsersData(); // eslint-disable-line react-hooks/set-state-in-effect
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const students = data.users.filter((u) => u.role === 'student');
  const admins = data.users.filter((u) => u.role === 'admin');

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
          <h1 className="admin-page-title">Users</h1>
          <p className="admin-page-subtitle">Manage students and admin accounts</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowAddUser(!showAddUser)}
        >
          {showAddUser ? '✕ Cancel' : '+ Add User'}
        </button>
      </div>

      {/* Add User Form */}
      {showAddUser && (
        <div className="admin-card" style={{ marginBottom: 'var(--space-xl)' }}>
          <div className="admin-card-header">
            <h2 className="admin-card-title">Add New User / Bulk Enroll</h2>
          </div>
          <div className="admin-form">
            <div className="tabs" style={{ display: 'flex', gap: '16px', marginBottom: '16px', borderBottom: '1px solid var(--border-primary)' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setEnrollMode('single')} style={{ borderBottom: enrollMode === 'single' ? '2px solid var(--accent-primary)' : 'none' }}>Single User</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setEnrollMode('bulk')} style={{ borderBottom: enrollMode === 'bulk' ? '2px solid var(--accent-primary)' : 'none' }}>Bulk Emails</button>
            </div>

            {enrollMode === 'single' ? (
              <>
                <div className="admin-form-row">
                  <div className="form-group">
                    <label htmlFor="user-name" className="form-label">Full Name</label>
                    <input
                      id="user-name"
                      type="text"
                      className="form-input"
                      placeholder="John Doe"
                      value={newUser.full_name}
                      onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="user-email" className="form-label">Email</label>
                    <input
                      id="user-email"
                      type="email"
                      className="form-input"
                      placeholder="john@example.com"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="form-group">
                <label className="form-label">Email Addresses (one per line or comma separated)</label>
                <textarea
                  className="form-input"
                  rows={5}
                  placeholder="student1@gmail.com, student2@gmail.com..."
                  value={bulkEmails}
                  onChange={(e) => setBulkEmails(e.target.value)}
                />
              </div>
            )}

            <div className="admin-form-row">
              <div className="form-group">
                <label htmlFor="user-course" className="form-label">Enroll in Batch</label>
                <select
                  id="user-course"
                  className="form-select"
                  value={enrollCourse}
                  onChange={(e) => setEnrollCourse(e.target.value)}
                >
                  <option value="">Select a batch...</option>
                  {data.courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="admin-form-actions">
              <button
                className="btn btn-primary"
                onClick={handleEnrollAction}
                disabled={isSubmitting || (enrollMode === 'single' ? (!newUser.email) : !bulkEmails)}
              >
                {isSubmitting ? 'Processing...' : (enrollMode === 'single' ? 'Invite & Enroll' : 'Enroll All Students')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Students Table */}
      <div className="admin-card" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="admin-card-header">
          <h2 className="admin-card-title">Students ({students.length})</h2>
        </div>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Joined</th>
                <th>Enrollment Toggle</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const studentEnrollments = data.enrollments.filter((e) => e.user_id === student.id);
                return (
                  <tr key={student.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 6,
                          background: 'var(--accent-gradient)', color: 'white',
                          fontSize: '10px', fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {student.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 500 }}>{student.full_name}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{student.email}</td>
                    <td style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>
                      {formatDate(student.created_at)}
                    </td>
                    <td style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {data.courses.map((course) => {
                        const isEnrolled = studentEnrollments.some((e) => e.course_id === course.id);
                        return (
                          <button
                            key={course.id}
                            className={`btn btn-sm ${isEnrolled ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ fontSize: '11px', padding: '4px 8px', maxWidth: '180px' }}
                            onClick={() => handleToggleEnrollment(student.id, course.id)}
                            title={isEnrolled ? `Unenroll from ${course.name}` : `Enroll in ${course.name}`}
                          >
                            {isEnrolled ? `✓ ${course.name}` : course.name}
                          </button>
                        );
                      })}
                      
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                        {deleteConfirm === student.id ? (
                          <>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDeleteUser(student.id)}>
                              Confirm
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={() => setDeleteConfirm(null)}>
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button 
                            className="btn btn-ghost btn-sm" 
                            style={{ color: 'var(--error)', opacity: 0.6 }}
                            onClick={() => setDeleteConfirm(student.id)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admins Table */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">Admins ({admins.length})</h2>
        </div>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 6,
                        background: 'linear-gradient(135deg, var(--accent-secondary), #EC4899)', color: 'white',
                        fontSize: '10px', fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {admin.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 500 }}>{admin.full_name}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{admin.email}</td>
                  <td style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>
                    {formatDate(admin.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
