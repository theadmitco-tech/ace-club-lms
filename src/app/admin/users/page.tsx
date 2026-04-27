'use client';

import { useState } from 'react';
import { getUsers, createUser, deleteUser, getCourses, getEnrollments, enrollUser, unenrollUser } from '@/lib/mockData';
import { User, UserRole } from '@/lib/types';
import { formatDate } from '@/lib/utils';

export default function AdminUsersPage() {
  const [users, setUsersList] = useState(getUsers());
  const courses = getCourses();
  const [showAddUser, setShowAddUser] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({
    email: '',
    full_name: '',
    role: 'student' as UserRole,
  });
  const [enrollCourse, setEnrollCourse] = useState(courses[0]?.id || '');

  const handleAddUser = () => {
    if (!newUser.email || !newUser.full_name) return;
    
    const user = createUser({
      email: newUser.email,
      full_name: newUser.full_name,
      role: newUser.role,
    });

    // Auto-enroll in selected course if student
    if (newUser.role === 'student' && enrollCourse) {
      enrollUser(user.id, enrollCourse);
    }

    setUsersList(getUsers());
    setNewUser({ email: '', full_name: '', role: 'student' });
    setShowAddUser(false);
  };

  const handleDeleteUser = (id: string) => {
    deleteUser(id);
    setUsersList(getUsers());
    setDeleteConfirm(null);
  };

  const handleToggleEnrollment = (userId: string, courseId: string) => {
    const enrollments = getEnrollments(userId, courseId);
    if (enrollments.length > 0) {
      unenrollUser(userId, courseId);
    } else {
      enrollUser(userId, courseId);
    }
    setUsersList(getUsers()); // refresh
  };

  const students = users.filter(u => u.role === 'student');
  const admins = users.filter(u => u.role === 'admin');

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
            <h2 className="admin-card-title">Add New User</h2>
          </div>
          <div className="admin-form">
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

            <div className="admin-form-row">
              <div className="form-group">
                <label htmlFor="user-role" className="form-label">Role</label>
                <select
                  id="user-role"
                  className="form-select"
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                >
                  <option value="student">Student</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {newUser.role === 'student' && (
                <div className="form-group">
                  <label htmlFor="user-course" className="form-label">Enroll in Course</label>
                  <select
                    id="user-course"
                    className="form-select"
                    value={enrollCourse}
                    onChange={(e) => setEnrollCourse(e.target.value)}
                  >
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="admin-form-actions">
              <button
                className="btn btn-primary"
                onClick={handleAddUser}
                disabled={!newUser.email || !newUser.full_name}
              >
                Add User
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
                <th>Enrollment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const enrollments = getEnrollments(student.id);
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
                          {student.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <span style={{ fontWeight: 500 }}>{student.full_name}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{student.email}</td>
                    <td style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>
                      {formatDate(student.created_at)}
                    </td>
                    <td>
                      {courses.map(course => {
                        const isEnrolled = enrollments.some(e => e.course_id === course.id);
                        return (
                          <button
                            key={course.id}
                            className={`btn btn-sm ${isEnrolled ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ fontSize: '11px' }}
                            onClick={() => handleToggleEnrollment(student.id, course.id)}
                          >
                            {isEnrolled ? '✓ Enrolled' : 'Enroll'}
                          </button>
                        );
                      })}
                    </td>
                    <td>
                      <div className="admin-table-actions">
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
                            onClick={() => setDeleteConfirm(student.id)}
                            style={{ color: 'var(--error)' }}
                          >
                            Remove
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
                        {admin.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
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
