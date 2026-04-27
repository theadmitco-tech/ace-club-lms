'use client';

import { useState } from 'react';
import { getCourses, createCourse, updateCourse, deleteCourse, getSessions, getEnrollments } from '@/lib/mockData';
import { Course } from '@/lib/types';
import { formatDate } from '@/lib/utils';

export default function AdminCoursesPage() {
  const [courses, setCoursesList] = useState(getCourses());
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    is_active: true,
  });

  const handleCreate = () => {
    if (!form.name) return;
    createCourse({
      name: form.name,
      description: form.description,
      is_active: form.is_active,
    });
    setCoursesList(getCourses());
    setForm({ name: '', description: '', is_active: true });
    setShowAdd(false);
  };

  const handleEdit = (course: Course) => {
    setEditingId(course.id);
    setForm({
      name: course.name,
      description: course.description,
      is_active: course.is_active,
    });
  };

  const handleUpdate = () => {
    if (!editingId) return;
    updateCourse(editingId, {
      name: form.name,
      description: form.description,
      is_active: form.is_active,
    });
    setCoursesList(getCourses());
    setEditingId(null);
    setForm({ name: '', description: '', is_active: true });
  };

  const handleDelete = (id: string) => {
    deleteCourse(id);
    setCoursesList(getCourses());
    setDeleteConfirm(null);
  };

  return (
    <div className="animate-fade-in">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Courses</h1>
          <p className="admin-page-subtitle">Manage your course offerings</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => { setShowAdd(!showAdd); setEditingId(null); }}
        >
          {showAdd ? '✕ Cancel' : '+ New Course'}
        </button>
      </div>

      {/* Add/Edit Form */}
      {(showAdd || editingId) && (
        <div className="admin-card" style={{ marginBottom: 'var(--space-xl)' }}>
          <div className="admin-card-header">
            <h2 className="admin-card-title">{editingId ? 'Edit Course' : 'New Course'}</h2>
          </div>
          <div className="admin-form">
            <div className="form-group">
              <label htmlFor="course-name" className="form-label">Course Name</label>
              <input
                id="course-name"
                type="text"
                className="form-input"
                placeholder="e.g., GMAT Focus Edition — Ace Batch 2025"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label htmlFor="course-desc" className="form-label">Description</label>
              <textarea
                id="course-desc"
                className="form-textarea"
                placeholder="Course description..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: 'var(--accent-primary)' }}
                />
                Active
              </label>
            </div>
            <div className="admin-form-actions">
              <button
                className="btn btn-primary"
                onClick={editingId ? handleUpdate : handleCreate}
                disabled={!form.name}
              >
                {editingId ? 'Update Course' : 'Create Course'}
              </button>
              {editingId && (
                <button
                  className="btn btn-secondary"
                  onClick={() => { setEditingId(null); setForm({ name: '', description: '', is_active: true }); }}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Courses List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        {courses.map((course) => {
          const sessions = getSessions(course.id);
          const enrollments = getEnrollments(undefined, course.id);
          
          return (
            <div key={course.id} className="admin-card">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{course.name}</h3>
                    <span className={`badge ${course.is_active ? 'badge-available' : 'badge-locked'}`}>
                      {course.is_active ? '● Active' : '○ Inactive'}
                    </span>
                  </div>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    {course.description}
                  </p>
                  <div style={{ display: 'flex', gap: '24px' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{sessions.length}</span> sessions
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{enrollments.length}</span> students enrolled
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                      Created {formatDate(course.created_at)}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(course)}>
                    Edit
                  </button>
                  {deleteConfirm === course.id ? (
                    <>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(course.id)}>
                        Confirm
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setDeleteConfirm(null)}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setDeleteConfirm(course.id)}
                      style={{ color: 'var(--error)' }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {courses.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📚</div>
          <h3 className="empty-state-title">No courses yet</h3>
          <p className="empty-state-text">Create your first course to get started.</p>
        </div>
      )}
    </div>
  );
}
