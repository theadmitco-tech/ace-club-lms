'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { formatDate } from '@/lib/utils';
import { generateSchedule } from '@/lib/curriculum';
import { useAuth } from '@/lib/AuthContext';

export default function AdminCoursesPage() {
  const [courses, setCoursesList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  // Enrolled students for the batch being edited
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  
  const [supabase] = useState(() => createClient());
  const { addToast } = useAuth();
  
  const [form, setForm] = useState({
    name: '',
    description: '',
    is_active: true,
    startDate: '',
    bulkEmails: '',
  });

  const fetchCourses = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('courses')
      .select('*, sessions(id, session_date), enrollments(id)')
      .order('created_at', { ascending: false });
      
    if (!error && data) {
      setCoursesList(data);
    }
    setIsLoading(false);
  };

  const fetchEnrolledStudents = async (courseId: string) => {
    setLoadingStudents(true);
    const { data, error } = await supabase
      .from('enrollments')
      .select('id, enrolled_at, profiles(id, email, full_name)')
      .eq('course_id', courseId)
      .order('enrolled_at', { ascending: true });
    
    if (!error && data) {
      setEnrolledStudents(data);
    }
    setLoadingStudents(false);
  };

  useEffect(() => {
    fetchCourses();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async () => {
    if (!form.name) return;
    setIsSubmitting(true);
    
    const { data: newCourse, error: courseError } = await supabase
      .from('courses')
      .insert({
        name: form.name,
        description: form.description,
        is_active: form.is_active,
      })
      .select()
      .single();

    if (courseError || !newCourse) {
      addToast('error', 'Failed to create batch.');
      setIsSubmitting(false);
      return;
    }

    // Auto-populate 16 Sessions if Start Date is provided
    if (form.startDate) {
      const startDateObj = new Date(`${form.startDate}T10:00:00Z`);
      const schedule = generateSchedule(startDateObj, []);
      
      const sessionsToInsert = schedule.map((sess, index) => ({
        course_id: newCourse.id,
        title: sess.title,
        session_number: index + 1,
        session_date: sess.date,
        is_published: true,
      }));

      await supabase.from('sessions').insert(sessionsToInsert);
    }

    // Bulk Enroll Students
    if (form.bulkEmails) {
      const emails = form.bulkEmails
        .split(/[\n,]/)
        .map(e => e.trim())
        .filter(e => e.length > 0 && e.includes('@'));

      if (emails.length > 0) {
        try {
          const res = await fetch('/api/admin/bulk-enroll', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emails, courseId: newCourse.id })
          });
          const result = await res.json();
          if (result.failed > 0) {
            addToast('warning', `Batch created, but failed to enroll ${result.failed} students.`);
          }
        } catch (err) {
          console.error(err);
          addToast('error', 'Failed to process bulk enrollments.');
        }
      }
    }

    addToast('success', 'Batch created successfully!');
    await fetchCourses();
    resetForm();
    setShowAdd(false);
    setIsSubmitting(false);
  };

  const handleEdit = async (course: any) => {
    setEditingId(course.id);
    setForm({
      name: course.name,
      description: course.description || '',
      is_active: course.is_active,
      startDate: '',
      bulkEmails: '',
    });
    setShowAdd(true);
    await fetchEnrolledStudents(course.id);
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    setIsSubmitting(true);
    
    const { error } = await supabase
      .from('courses')
      .update({
        name: form.name,
        description: form.description,
        is_active: form.is_active,
      })
      .eq('id', editingId);

    if (error) {
      addToast('error', 'Failed to update batch.');
      setIsSubmitting(false);
      return;
    }

    // Add new students if emails provided
    if (form.bulkEmails.trim()) {
      const emails = form.bulkEmails
        .split(/[\n,]/)
        .map(e => e.trim())
        .filter(e => e.length > 0 && e.includes('@'));

      if (emails.length > 0) {
        try {
          const res = await fetch('/api/admin/bulk-enroll', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emails, courseId: editingId, sendMagicLink: true })
          });
          const result = await res.json();
          if (result.success > 0) {
            addToast('success', `Batch updated! ${result.success} student(s) enrolled & notified.`);
          }
          if (result.failed > 0) {
            addToast('warning', `${result.failed} enrollment(s) failed.`);
          }
        } catch (err) {
          console.error(err);
          addToast('error', 'Failed to process new enrollments.');
        }
      } else {
        addToast('success', 'Batch updated.');
      }
    } else {
      addToast('success', 'Batch updated.');
    }

    await fetchCourses();
    resetForm();
    setShowAdd(false);
    setIsSubmitting(false);
  };

  const handleRemoveStudent = async (enrollmentId: string, studentEmail: string) => {
    const { error } = await supabase.from('enrollments').delete().eq('id', enrollmentId);
    if (error) {
      addToast('error', 'Failed to remove student.');
    } else {
      addToast('success', `${studentEmail} removed from batch.`);
      setEnrolledStudents(enrolledStudents.filter(e => e.id !== enrollmentId));
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('courses').delete().eq('id', id);
    if (error) {
      addToast('error', 'Failed to delete batch.');
    } else {
      addToast('success', 'Batch deleted.');
      await fetchCourses();
    }
    setDeleteConfirm(null);
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ name: '', description: '', is_active: true, startDate: '', bulkEmails: '' });
    setEnrolledStudents([]);
  };



  return (
    <div className="animate-fade-in">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Batches</h1>
          <p className="admin-page-subtitle">Manage your batches and enrolled students</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => { 
            if (showAdd) {
              resetForm();
              setShowAdd(false);
            } else {
              resetForm();
              setShowAdd(true);
            }
          }}
        >
          {showAdd ? '✕ Cancel' : '+ New Batch'}
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAdd && (
        <div className="admin-card" style={{ marginBottom: 'var(--space-xl)' }}>
          <div className="admin-card-header">
            <h2 className="admin-card-title">{editingId ? 'Edit Batch' : 'Create New Batch'}</h2>
          </div>
          <div className="admin-form">
            <div className="form-group">
              <label htmlFor="course-name" className="form-label">Batch Name</label>
              <input
                id="course-name"
                type="text"
                className="form-input"
                placeholder="e.g., GMAT Focus Edition — May 2025 Intake"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label htmlFor="course-desc" className="form-label">Description</label>
              <textarea
                id="course-desc"
                className="form-textarea"
                placeholder="Batch description..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            {/* Start Date: only on create */}
            {!editingId && (
              <div className="form-group">
                <label htmlFor="start-date" className="form-label">Start Date (Auto-populate 16 Sessions)</label>
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>
                  Select the Saturday of Week 1. This will automatically build out your 8-week curriculum timeline.
                </p>
                <input
                  id="start-date"
                  type="date"
                  className="form-input"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>
            )}

            {/* Currently Enrolled Students (only when editing) */}
            {editingId && (
              <div className="form-group">
                <label className="form-label">📋 Currently Enrolled Students ({enrolledStudents.length})</label>
                {loadingStudents ? (
                  <div style={{ padding: '16px', textAlign: 'center' }}>
                    <div className="spinner" />
                  </div>
                ) : enrolledStudents.length > 0 ? (
                  <div style={{
                    maxHeight: '240px',
                    overflowY: 'auto',
                    border: '1px solid var(--border-primary)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-secondary)',
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-primary)' }}>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-tertiary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>#</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-tertiary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-tertiary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-tertiary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Enrolled</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {enrolledStudents.map((enrollment, i) => {
                          const profile = enrollment.profiles;
                          return (
                            <tr key={enrollment.id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                              <td style={{ padding: '8px 12px', color: 'var(--text-tertiary)' }}>{i + 1}</td>
                              <td style={{ padding: '8px 12px', fontWeight: 500 }}>{profile?.full_name || '—'}</td>
                              <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{profile?.email || '—'}</td>
                              <td style={{ padding: '8px 12px', color: 'var(--text-tertiary)' }}>{formatDate(enrollment.enrolled_at)}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  style={{ color: 'var(--error)', fontSize: '12px' }}
                                  onClick={() => handleRemoveStudent(enrollment.id, profile?.email || '')}
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                    No students enrolled yet.
                  </p>
                )}
              </div>
            )}

            {/* Student Roster: shown on both create and edit */}
            <div className="form-group">
              <label className="form-label">
                {editingId ? '➕ Add More Students' : 'Initial Student Roster (Bulk Enroll)'}
              </label>
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>
                {editingId
                  ? 'Paste emails to enroll new students. They will receive a magic login link automatically.'
                  : 'Paste a list of emails (comma separated or new line). Accounts will be auto-created and enrolled.'}
              </p>
              <textarea
                className="form-input"
                rows={4}
                placeholder="student1@gmail.com, student2@gmail.com..."
                value={form.bulkEmails}
                onChange={(e) => setForm({ ...form, bulkEmails: e.target.value })}
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
                disabled={!form.name || isSubmitting}
              >
                {isSubmitting ? 'Processing...' : (editingId ? 'Update Batch' : 'Create Batch')}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => { resetForm(); setShowAdd(false); }}
                disabled={isSubmitting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batches Table */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Batch Name</th>
              <th>Sessions</th>
              <th>Progress</th>
              <th>Students</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '48px' }}>
                  <div className="spinner" />
                </td>
              </tr>
            ) : courses.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-tertiary)' }}>
                  No batches yet. Click &quot;+ New Batch&quot; to get started.
                </td>
              </tr>
            ) : (
              courses.map((course) => {
              const sessionCount = course.sessions?.length || 0;
              const enrollmentCount = course.enrollments?.length || 0;
              const now = new Date();
              const doneCount = (course.sessions || []).filter((s: any) => new Date(s.session_date) <= now).length;
              const progressPct = sessionCount > 0 ? Math.round((doneCount / sessionCount) * 100) : 0;
              
              return (
                <tr key={course.id}>
                  <td>
                    <div>
                      <div style={{ fontWeight: 600 }}>{course.name}</div>
                      {course.description && (
                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {course.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{sessionCount}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '48px',
                        height: '6px',
                        borderRadius: '3px',
                        background: 'var(--bg-tertiary, rgba(255,255,255,0.08))',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${progressPct}%`,
                          height: '100%',
                          borderRadius: '3px',
                          background: progressPct === 100 ? 'var(--success, #22c55e)' : 'var(--accent-primary)',
                          transition: 'width 0.3s',
                        }} />
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {doneCount}/{sessionCount}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--accent-secondary, #7C3AED)' }}>{enrollmentCount}</span>
                  </td>
                  <td>
                    <span className={`badge ${course.is_active ? 'badge-available' : 'badge-locked'}`}>
                      {course.is_active ? '● Active' : '○ Inactive'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>
                    {formatDate(course.created_at)}
                  </td>
                  <td>
                    <div className="admin-table-actions">
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
                  </td>
                </tr>
              );
            })
            )}
          </tbody>
        </table>
      </div>


    </div>
  );
}
