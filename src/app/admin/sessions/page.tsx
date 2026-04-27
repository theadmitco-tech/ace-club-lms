'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSessions, deleteSession, getCourses, getMaterials } from '@/lib/mockData';
import { formatDate } from '@/lib/utils';
import { Session } from '@/lib/types';

export default function AdminSessionsPage() {
  const router = useRouter();
  const [sessions, setSessionsList] = useState(getSessions());
  const courses = getCourses();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    deleteSession(id);
    setSessionsList(getSessions());
    setDeleteConfirm(null);
  };

  return (
    <div className="animate-fade-in">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Sessions</h1>
          <p className="admin-page-subtitle">Manage all course sessions and their materials</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => router.push('/admin/sessions/new')}
        >
          + New Session
        </button>
      </div>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Title</th>
              <th>Course</th>
              <th>Date</th>
              <th>Materials</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => {
              const course = courses.find(c => c.id === session.course_id);
              const mats = getMaterials(session.id);
              return (
                <tr key={session.id}>
                  <td>
                    <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                      {String(session.session_number).padStart(2, '0')}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500 }}>{session.title}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                    {course?.name || 'Unknown'}
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{formatDate(session.session_date)}</td>
                  <td>
                    <span className="badge badge-available">{mats.length} items</span>
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
            })}
          </tbody>
        </table>
      </div>

      {sessions.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3 className="empty-state-title">No sessions yet</h3>
          <p className="empty-state-text">Create your first session to get started.</p>
          <button
            className="btn btn-primary"
            style={{ marginTop: '16px' }}
            onClick={() => router.push('/admin/sessions/new')}
          >
            + Create Session
          </button>
        </div>
      )}
    </div>
  );
}
