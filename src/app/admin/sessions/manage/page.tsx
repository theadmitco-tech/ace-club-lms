'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSessions, updateSession, getCourses } from '@/lib/mockData';
import { formatDate } from '@/lib/utils';
import { Session } from '@/lib/types';

export default function ManageSchedulePage() {
  const router = useRouter();
  const courses = getCourses();
  const [courseId, setCourseId] = useState(courses[0]?.id || '');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (courseId) {
      // Sort sessions by current date to establish original "slots"
      const currentSessions = getSessions(courseId).sort(
        (a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime()
      );
      setSessions(currentSessions);
    }
  }, [courseId]);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newSessions = [...sessions];
    const itemToMove = newSessions.splice(draggedIndex, 1)[0];
    newSessions.splice(index, 0, itemToMove);
    
    setDraggedIndex(index);
    setSessions(newSessions);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const saveChanges = () => {
    // Get the ORIGINAL dates in chronological order
    const originalDates = [...getSessions(courseId)]
      .sort((a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime())
      .map(s => s.session_date);

    // Apply these dates to the NEW order of sessions
    sessions.forEach((s, index) => {
      updateSession(s.id, {
        session_date: originalDates[index],
        session_number: index + 1,
      });
    });
    
    router.push('/admin/sessions');
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Reorder Curriculum</h1>
          <p className="admin-page-subtitle">Drag and drop to shuffle sessions. Time slots (Weekends 10am) remain fixed.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-ghost" onClick={() => router.back()}>Cancel</button>
          <button className="btn btn-primary" onClick={saveChanges}>Save New Order</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="form-group">
          <label className="form-label">Active Course</label>
          <select 
            className="form-input" 
            value={courseId} 
            onChange={(e) => setCourseId(e.target.value)}
          >
            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <div className="drag-list">
        {sessions.map((session, index) => (
          <div
            key={session.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`drag-item glass-card ${draggedIndex === index ? 'dragging' : ''}`}
          >
            <div className="drag-handle">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="5" r="1" /><circle cx="9" cy="12" r="1" /><circle cx="9" cy="19" r="1" />
                <circle cx="15" cy="5" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="19" r="1" />
              </svg>
            </div>
            
            <div className="drag-slot-info">
              <span className="slot-number">Slot {index + 1}</span>
              <span className="slot-date">{formatDate(getSessions(courseId).sort((a,b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime())[index].session_date)}</span>
            </div>

            <div className="drag-content">
              <h3 className="drag-title">{session.title}</h3>
              <p className="drag-meta">Currently Session #{session.session_number}</p>
            </div>

            <div className="drag-badge">
               {index % 2 === 0 ? 'Saturday' : 'Sunday'}
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .drag-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .drag-item {
          display: flex;
          align-items: center;
          padding: 16px;
          cursor: grab;
          transition: all 0.2s ease;
          border: 1px solid var(--border-primary);
        }
        .drag-item:active {
          cursor: grabbing;
        }
        .drag-item.dragging {
          opacity: 0.5;
          transform: scale(0.98);
          background: var(--bg-secondary);
          border-color: var(--accent-primary);
        }
        .drag-handle {
          color: var(--text-tertiary);
          margin-right: 16px;
        }
        .drag-slot-info {
          display: flex;
          flex-direction: column;
          width: 140px;
          margin-right: 24px;
        }
        .slot-number {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--accent-primary);
          font-weight: 700;
        }
        .slot-date {
          font-size: 13px;
          color: var(--text-secondary);
        }
        .drag-content {
          flex: 1;
        }
        .drag-title {
          font-size: 16px;
          font-weight: 600;
          margin: 0;
        }
        .drag-meta {
          font-size: 12px;
          color: var(--text-tertiary);
          margin: 4px 0 0 0;
        }
        .drag-badge {
          font-size: 11px;
          padding: 4px 8px;
          border-radius: 4px;
          background: var(--bg-secondary);
          color: var(--text-secondary);
          border: 1px solid var(--border-primary);
        }
      `}</style>
    </div>
  );
}
