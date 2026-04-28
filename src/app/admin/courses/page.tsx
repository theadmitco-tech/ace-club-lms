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
  
  // Student management state
  const [viewingStudentsFor, setViewingStudentsFor] = useState<any | null>(null);
  const [studentsInBatch, setStudentsInBatch] = useState<any[]>([]);
  const [isStudentsLoading, setIsStudentsLoading] = useState(false);
  
  const supabase = createClient();
  const { addToast } = useAuth();
  
  const [form, setForm] = useState({
    name: '',
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

  const fetchStudentsInBatch = async (courseId: string) => {
    setIsStudentsLoading(true);
    const { data, error } = await supabase
      .from('enrollments')
      .select('id, user_id, profiles(full_name, email)')
      .eq('course_id', courseId);
    
    if (!error && data) {
      setStudentsInBatch(data);
    }
    setIsStudentsLoading(false);
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
        is_active: form.is_active,
      })
      .select()
      .single();

    if (courseError || !newCourse) {
      addToast('error', 'Failed to create batch.');
      setIsSubmitting(false);
      return;
    }

    // 2. Clone from Master Base if Start Date is provided
    if (form.startDate) {
      // Fetch Master Curriculum
      const { data: masterSessions } = await supabase
        .from('master_sessions')
        .select('*, master_materials(*)')
        .order('session_number', { ascending: true });

      if (masterSessions && masterSessions.length > 0) {
        const startDateObj = new Date(`${form.startDate}T10:00:00Z`);
        const schedule = generateSchedule(startDateObj, []);
        
        for (let i = 0; i < masterSessions.length; i++) {
          const ms = masterSessions[i];
          const slot = schedule[i]; // Get the generated date slot
          
          if (!slot) continue;

          // Create session for this batch
          const { data: newSession, error: sErr } = await supabase
            .from('sessions')
            .insert({
              course_id: newCourse.id,
              title: ms.title,
              session_number: ms.session_number,
              session_date: slot.date,
              is_published: true,
            })
            .select()
            .single();

          if (newSession && ms.master_materials) {
            // Define which materials are static (copied from master) vs dynamic (unique per batch)
            const materialsToInsert = ms.master_materials.map((mm: any) => {
              const isStatic = mm.type === 'pre_read' || mm.type === 'worksheet';
              
              return {
                session_id: newSession.id,
                type: mm.type,
                title: mm.title,
                // Only copy URLs for static materials; leave dynamic ones empty to be filled per batch
                notion_url: isStatic ? mm.notion_url : null,
                file_url: isStatic ? mm.file_url : null,
                video_url: isStatic ? mm.video_url : null,
                available_from: mm.type === 'pre_read' 
                  ? new Date(new Date(slot.date).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
                  : new Date(new Date(slot.date).getTime() + 2 * 60 * 60 * 1000).toISOString()
              };
            });
            await supabase.from('materials').insert(materialsToInsert);
          }
        }
      } else {
        // Fallback to basic schedule if master is empty
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
    }

    if (form.bulkEmails) {
      const emails = form.bulkEmails.split(/[\n,]/).map(e => e.trim()).filter(e => e.length > 0 && e.includes('@'));
      if (emails.length > 0) {
        try {
          const res = await fetch('/api/admin/bulk-enroll', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emails, courseId: newCourse.id })
          });
          const result = await res.json();
          if (result.success > 0) addToast('success', `Enrolled ${result.success} students.`);
          if (result.failed > 0) addToast('warning', `Failed to enroll ${result.failed} students.`);
        } catch (err) { console.error(err); }
      }
    }

    addToast('success', 'Batch created successfully!');
    await fetchCourses();
    resetForm();
    setShowAdd(false);
    setIsSubmitting(false);
  };

  const handleEdit = (course: any) => {
    setEditingId(course.id);
    setForm({
      name: course.name,
      is_active: course.is_active,
      startDate: '',
      bulkEmails: '',
    });
    fetchStudentsInBatch(course.id);
    setShowAdd(true);
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    setIsSubmitting(true);
    
    const { error } = await supabase
      .from('courses')
      .update({
        name: form.name,
        is_active: form.is_active,
      })
      .eq('id', editingId);

    if (form.bulkEmails) {
      const emails = form.bulkEmails.split(/[\n,]/).map(e => e.trim()).filter(e => e.length > 0 && e.includes('@'));
      if (emails.length > 0) {
        try {
          const res = await fetch('/api/admin/bulk-enroll', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emails, courseId: editingId })
          });
          const result = await res.json();
          if (result.success > 0) addToast('success', `Enrolled ${result.success} new students.`);
          if (result.failed > 0) addToast('warning', `Failed to enroll ${result.failed} students.`);
        } catch (err) { console.error(err); }
      }
    }

    if (error) {
      addToast('error', 'Failed to update batch.');
    } else {
      addToast('success', 'Batch updated.');
      await fetchCourses();
      resetForm();
      setShowAdd(false);
    }
    setIsSubmitting(false);
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

  const handleRemoveStudent = async (enrollmentId: string) => {
    const { error } = await supabase.from('enrollments').delete().eq('id', enrollmentId);
    if (error) {
      addToast('error', 'Failed to remove student.');
    } else {
      addToast('success', 'Student removed from batch.');
      if (editingId) fetchStudentsInBatch(editingId);
      if (viewingStudentsFor) fetchStudentsInBatch(viewingStudentsFor.id);
      fetchCourses();
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ name: '', is_active: true, startDate: '', bulkEmails: '' });
    setStudentsInBatch([]);
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
          <h1 className="admin-page-title">{viewingStudentsFor ? `Students: ${viewingStudentsFor.name}` : 'Batches'}</h1>
          <p className="admin-page-subtitle">
            {viewingStudentsFor ? 'Manage students enrolled in this batch' : 'Create and manage your GMAT study batches'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {viewingStudentsFor ? (
            <button className="btn btn-secondary" onClick={() => setViewingStudentsFor(null)}>
              ← Back to Batches
            </button>
          ) : (
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
          )}
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAdd && !viewingStudentsFor && (
        <div className="admin-card animate-fade-in-up" style={{ marginBottom: 'var(--space-xl)' }}>
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
                placeholder="e.g., GMAT Focus — Jan 2026 Batch"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            {!editingId && (
              <div className="form-group">
                <label htmlFor="start-date" className="form-label">Start Date (Auto-generate 16 Sessions)</label>
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>
                  Select the Saturday of Week 1. This will automatically build out your 8-week schedule.
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

            {/* List existing students while editing */}
            {editingId && studentsInBatch.length > 0 && (
              <div className="form-group">
                <label className="form-label">Enrolled Students ({studentsInBatch.length})</label>
                <div style={{ 
                  maxHeight: '150px', 
                  overflowY: 'auto', 
                  background: 'var(--bg-secondary)', 
                  padding: '8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-primary)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  {studentsInBatch.map(s => (
                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', padding: '4px' }}>
                      <span>{s.profiles?.full_name} ({s.profiles?.email})</span>
                      <button 
                        onClick={() => handleRemoveStudent(s.id)}
                        style={{ color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px' }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">{editingId ? 'Add More Students' : 'Initial Students'} (Bulk Enroll)</label>
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>
                Paste emails (comma separated or new line).
              </p>
              <textarea
                className="form-input"
                rows={3}
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
                Published / Active
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
            </div>
          </div>
        </div>
      )}

      {/* Main Batches Table View */}
      {!viewingStudentsFor ? (
        <div className="admin-card">
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Batch Name</th>
                  <th>Sessions Done</th>
                  <th>Students</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => {
                  const now = new Date();
                  const sessionsDone = course.sessions?.filter((s: any) => new Date(s.session_date) < now).length || 0;
                  const totalSessions = course.sessions?.length || 0;
                  const progress = totalSessions > 0 ? Math.round((sessionsDone / totalSessions) * 100) : 0;

                  return (
                    <tr key={course.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{course.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Created {formatDate(course.created_at)}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ fontSize: '13px', fontWeight: 500 }}>{sessionsDone} / {totalSessions} sessions</div>
                          <div style={{ width: '80px', height: '4px', background: 'var(--bg-tertiary)', borderRadius: '2px' }}>
                            <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent-primary)', borderRadius: '2px' }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <button 
                          className="btn btn-ghost btn-sm" 
                          onClick={() => {
                            setViewingStudentsFor(course);
                            fetchStudentsInBatch(course.id);
                          }}
                          style={{ color: 'var(--accent-primary)', padding: '4px 0' }}
                        >
                          {course.enrollments?.length || 0} students →
                        </button>
                      </td>
                      <td>
                        <span className={`badge ${course.is_active ? 'badge-available' : 'badge-locked'}`}>
                          {course.is_active ? '● Active' : '○ Draft'}
                        </span>
                      </td>
                      <td>
                        <div className="admin-table-actions" style={{ justifyContent: 'flex-end' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(course)}>
                            Edit
                          </button>
                          {deleteConfirm === course.id ? (
                            <>
                              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(course.id)}>Confirm</button>
                              <button className="btn btn-ghost btn-sm" onClick={() => setDeleteConfirm(null)}>Cancel</button>
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
                })}
              </tbody>
            </table>
          </div>
          {courses.length === 0 && (
            <div className="empty-state" style={{ padding: '40px' }}>
              <div className="empty-state-icon">📚</div>
              <h3 className="empty-state-title">No batches found</h3>
              <p className="empty-state-text">Click "New Batch" to get started.</p>
            </div>
          )}
        </div>
      ) : (
        /* Students Management View */
        <div className="admin-card animate-fade-in">
          <div className="admin-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="admin-card-title">Enrolled Students</h2>
            <button className="btn btn-primary btn-sm" onClick={() => {
              handleEdit(viewingStudentsFor);
              setViewingStudentsFor(null);
            }}>
              + Add Students
            </button>
          </div>
          
          <div className="admin-table-container">
            {isStudentsLoading ? (
              <div style={{ padding: '40px', textAlign: 'center' }}><div className="spinner" /></div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Email</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {studentsInBatch.map((enrollment) => (
                    <tr key={enrollment.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ 
                            width: 24, height: 24, borderRadius: 4, 
                            background: 'var(--accent-gradient)', color: 'white', 
                            fontSize: '10px', fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            {enrollment.profiles?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 500 }}>{enrollment.profiles?.full_name}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                        {enrollment.profiles?.email}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          className="btn btn-ghost btn-sm" 
                          onClick={() => handleRemoveStudent(enrollment.id)}
                          style={{ color: 'var(--error)' }}
                        >
                          Remove from Batch
                        </button>
                      </td>
                    </tr>
                  ))}
                  {studentsInBatch.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                        No students enrolled in this batch yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
