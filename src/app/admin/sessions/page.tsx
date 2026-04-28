'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';

export default function AdminSessionsPage() {
  const router = useRouter();
  const [sessions, setSessionsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  const [supabase] = useState(() => createClient());
  const { addToast } = useAuth();

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          courses (name),
          materials (id)
        `)
        .order('session_date', { ascending: true });
        
      if (error) {
        addToast('error', 'Database error: ' + error.message);
      } else if (data) {
        setSessionsList(data);
      }
    } catch (err) {
      console.error('fetchSessions error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('sessions').delete().eq('id', id);
    if (error) {
      addToast('error', 'Failed to delete session.');
    } else {
      addToast('success', 'Session deleted successfully.');
      await fetchSessions();
    }
    setDeleteConfirm(null);
  };



  return (
    <div className="animate-fade-in">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Sessions</h1>
          <p className="admin-page-subtitle">Manage all course sessions and their materials</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn btn-ghost"
            onClick={() => router.push('/admin/sessions/manage')}
          >
            🔄 Manage Schedule
          </button>
          <button
            className="btn btn-primary"
            onClick={() => router.push('/admin/sessions/new')}
          >
            + New Session
          </button>
        </div>
      </div>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Title</th>
              <th>Batch</th>
              <th>Date</th>
              <th>Materials</th>
              <th>Status</th>
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
            ) : sessions.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-tertiary)' }}>
                  No sessions yet. Create a batch to auto-generate sessions.
                </td>
              </tr>
            ) : (
              sessions.map((session) => {
              const courseName = session.courses?.name || 'Unknown';
              const materialsCount = session.materials?.length || 0;
              return (
                <tr key={session.id}>
                  <td>
                    <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                      {String(session.session_number).padStart(2, '0')}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500 }}>{session.title}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                    {courseName}
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{formatDate(session.session_date)}</td>
                  <td>
                    <span className="badge badge-available">{materialsCount} items</span>
                  </td>
                  <td>
                    <span className={`badge ${session.is_published ? 'badge-available' : 'badge-locked'}`}>
                      {session.is_published ? '● Published' : '○ Draft'}
                    </span>
                  </td>
                  <td>
                    <div className="admin-table-actions">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => router.push(`/admin/sessions/${session.id}`)}
                      >
                        Edit
                      </button>
                      {deleteConfirm === session.id ? (
                        <>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(session.id)}
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
                          onClick={() => setDeleteConfirm(session.id)}
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
