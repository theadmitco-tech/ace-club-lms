'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';

export default function AdminUsersPage() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [batchData, setBatchData] = useState<any[]>([]); // courses with enrolled students
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  // Add student form per batch
  const [addingToBatch, setAddingToBatch] = useState<string | null>(null);
  const [newEmails, setNewEmails] = useState('');

  const [supabase] = useState(() => createClient());
  const { addToast } = useAuth();

  const fetchData = async () => {
    setIsLoading(true);

    // 1. Fetch admins
    const { data: adminProfiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'admin')
      .order('created_at', { ascending: true });
    
    if (adminProfiles) setAdmins(adminProfiles);

    // 2. Fetch batches with enrolled students
    const { data: courses } = await supabase
      .from('courses')
      .select(`
        id, name, is_active,
        enrollments (
          id, enrolled_at,
          profiles (id, email, full_name, created_at)
        )
      `)
      .order('created_at', { ascending: false });
    
    if (courses) setBatchData(courses);

    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRemoveStudent = async (enrollmentId: string, studentEmail: string, batchName: string) => {
    const { error } = await supabase.from('enrollments').delete().eq('id', enrollmentId);
    if (error) {
      addToast('error', 'Failed to remove student.');
    } else {
      addToast('success', `${studentEmail} removed from ${batchName}.`);
      await fetchData();
    }
    setDeleteConfirm(null);
  };

  const handleAddStudents = async (courseId: string) => {
    if (!newEmails.trim()) return;
    setIsSubmitting(true);

    const emails = newEmails
      .split(/[\n,]/)
      .map(e => e.trim())
      .filter(e => e.length > 0 && e.includes('@'));

    if (emails.length === 0) {
      addToast('error', 'No valid emails found.');
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/bulk-enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails, courseId, sendMagicLink: true })
      });
      const result = await res.json();
      if (result.success > 0) {
        addToast('success', `${result.success} student(s) enrolled & notified!`);
      }
      if (result.failed > 0) {
        addToast('warning', `${result.failed} enrollment(s) failed.`);
      }
    } catch (err) {
      console.error(err);
      addToast('error', 'Failed to process enrollments.');
    }

    setNewEmails('');
    setAddingToBatch(null);
    setIsSubmitting(false);
    await fetchData();
  };

  return (
    <div className="animate-fade-in">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Users</h1>
          <p className="admin-page-subtitle">Manage admins and view batch-wise student rosters</p>
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '64px' }}>
          <div className="spinner spinner-lg" />
        </div>
      ) : (
        <>

      {/* ========== ADMINS TABLE ========== */}
      <div className="admin-card" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="admin-card-header">
          <h2 className="admin-card-title">🛡️ Admins ({admins.length})</h2>
        </div>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Email</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin, i) => (
                <tr key={admin.id}>
                  <td style={{ color: 'var(--text-tertiary)' }}>{i + 1}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 6,
                        background: 'linear-gradient(135deg, var(--accent-secondary, #7C3AED), #EC4899)', color: 'white',
                        fontSize: '10px', fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {(admin.full_name || '??').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
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
              {admins.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-tertiary)' }}>
                    No admins found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========== BATCH-WISE STUDENTS ========== */}
      {batchData.map((batch) => {
        const students = (batch.enrollments || [])
          .map((e: any) => ({ ...e.profiles, enrollmentId: e.id, enrolled_at: e.enrolled_at }))
          .filter((s: any) => s.id); // Filter out any null profiles
        const isAddingHere = addingToBatch === batch.id;

        return (
          <div key={batch.id} className="admin-card" style={{ marginBottom: 'var(--space-xl)' }}>
            <div className="admin-card-header">
              <h2 className="admin-card-title">
                📚 {batch.name}
                <span style={{
                  fontSize: '13px',
                  fontWeight: 400,
                  color: 'var(--text-tertiary)',
                  marginLeft: '8px',
                }}>
                  ({students.length} student{students.length !== 1 ? 's' : ''})
                </span>
                {!batch.is_active && (
                  <span className="badge badge-locked" style={{ marginLeft: '8px', fontSize: '11px' }}>Inactive</span>
                )}
              </h2>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  if (isAddingHere) {
                    setAddingToBatch(null);
                    setNewEmails('');
                  } else {
                    setAddingToBatch(batch.id);
                    setNewEmails('');
                  }
                }}
              >
                {isAddingHere ? '✕ Cancel' : '+ Add Students'}
              </button>
            </div>

            {/* Add Students Form (inline) */}
            {isAddingHere && (
              <div style={{
                padding: '16px',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-secondary)',
                marginBottom: '16px',
              }}>
                <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
                  Paste emails to enroll (comma or newline separated)
                </label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="student1@gmail.com, student2@gmail.com..."
                  value={newEmails}
                  onChange={(e) => setNewEmails(e.target.value)}
                  style={{ marginBottom: '12px' }}
                />
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '12px' }}>
                  New accounts will be auto-created and students will receive a magic login link via email.
                </p>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleAddStudents(batch.id)}
                  disabled={!newEmails.trim() || isSubmitting}
                >
                  {isSubmitting ? 'Enrolling...' : 'Enroll & Notify'}
                </button>
              </div>
            )}

            {/* Students Table */}
            {students.length > 0 ? (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Enrolled</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student: any, i: number) => (
                      <tr key={student.enrollmentId}>
                        <td style={{ color: 'var(--text-tertiary)' }}>{i + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: 6,
                              background: 'var(--accent-gradient)', color: 'white',
                              fontSize: '10px', fontWeight: 700,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {(student.full_name || '??').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <span style={{ fontWeight: 500 }}>{student.full_name}</span>
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>{student.email}</td>
                        <td style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>
                          {formatDate(student.enrolled_at)}
                        </td>
                        <td>
                          <div className="admin-table-actions">
                            {deleteConfirm === student.enrollmentId ? (
                              <>
                                <button
                                  className="btn btn-danger btn-sm"
                                  onClick={() => handleRemoveStudent(student.enrollmentId, student.email, batch.name)}
                                >
                                  Confirm
                                </button>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => setDeleteConfirm(null)}
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => setDeleteConfirm(student.enrollmentId)}
                                style={{ color: 'var(--error)' }}
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{
                padding: '24px',
                textAlign: 'center',
                color: 'var(--text-tertiary)',
                fontSize: '13px',
              }}>
                No students enrolled in this batch yet. Click &quot;+ Add Students&quot; to get started.
              </div>
            )}
          </div>
        );
      })}

      {batchData.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <h3 className="empty-state-title">No batches yet</h3>
          <p className="empty-state-text">Create a batch first to start enrolling students.</p>
        </div>
      )}
      </>
      )}
    </div>
  );
}
