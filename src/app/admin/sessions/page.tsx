'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- Sortable Row Component ---
function SortableSessionRow({ session, onEdit, onDeleteConfirm, isConfirmingDelete }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: session.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    background: isDragging ? 'var(--bg-tertiary)' : 'transparent',
    position: isDragging ? 'relative' as const : 'static' as const,
    zIndex: isDragging ? 10 : 1,
  };

  const materialsCount = session.materials?.length || 0;

  return (
    <tr ref={setNodeRef} style={style} className={isDragging ? 'dragging' : ''}>
      <td style={{ width: '40px', cursor: 'grab' }} {...attributes} {...listeners}>
        <span style={{ color: 'var(--text-tertiary)', fontSize: '18px' }}>⣿</span>
      </td>
      <td style={{ width: '50px' }}>
        <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
          {String(session.session_number).padStart(2, '0')}
        </span>
      </td>
      <td style={{ fontWeight: 500 }}>{session.title}</td>
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
          <button className="btn btn-ghost btn-sm" onClick={() => onEdit(session.id)}>
            Edit
          </button>
          {isConfirmingDelete ? (
            <>
              <button className="btn btn-danger btn-sm" onClick={() => onDeleteConfirm(session.id, true)}>
                Confirm
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => onDeleteConfirm(session.id, false)}>
                Cancel
              </button>
            </>
          ) : (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => onDeleteConfirm(session.id, 'start')}
              style={{ color: 'var(--error)' }}
            >
              Delete
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// --- Main Page Component ---
export default function AdminSessionsPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [sessions, setSessions] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  const supabase = createClient();
  const { addToast } = useAuth();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Requires a 5px drag to trigger, so clicks still work
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchCourses();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedCourseId) {
      fetchSessions(selectedCourseId);
    } else {
      setSessions([]);
    }
  }, [selectedCourseId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCourses = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('courses')
      .select('id, name')
      .order('created_at', { ascending: false });
      
    if (!error && data) {
      setCourses(data);
      if (data.length > 0) {
        setSelectedCourseId(data[0].id);
      }
    }
    setIsLoading(false);
  };

  const fetchSessions = async (courseId: string) => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('sessions')
      .select(`*, materials(id)`)
      .eq('course_id', courseId)
      .order('session_number', { ascending: true });
      
    if (!error && data) {
      setSessions(data);
    }
    setIsLoading(false);
  };

  const handleDeleteRequest = async (id: string, action: boolean | 'start') => {
    if (action === 'start') {
      setDeleteConfirm(id);
      return;
    }
    if (action === false) {
      setDeleteConfirm(null);
      return;
    }
    
    // Confirmed Delete
    const { error } = await supabase.from('sessions').delete().eq('id', id);
    if (error) {
      addToast('error', 'Failed to delete session.');
    } else {
      addToast('success', 'Session deleted successfully.');
      if (selectedCourseId) fetchSessions(selectedCourseId);
    }
    setDeleteConfirm(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSessions((items) => {
        // 1. Capture the original sequence of dates before moving anything
        // This ensures the "slots" remain fixed in time.
        const originalDates = [...items]
          .sort((a, b) => a.session_number - b.session_number)
          .map(i => i.session_date);

        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        
        const reorderedItems = arrayMove(items, oldIndex, newIndex);
        
        // 2. Assign the original dates to the new sequence of items
        const updatedItems = reorderedItems.map((item, index) => ({
          ...item,
          session_number: index + 1,
          session_date: originalDates[index] // Inherit the date of the slot
        }));

        saveNewOrder(updatedItems);
        return updatedItems;
      });
    }
  };

  const saveNewOrder = async (newSessions: any[]) => {
    setIsUpdatingOrder(true);
    
    // We update each session's number in the database
    const updates = newSessions.map(session => ({
      id: session.id,
      course_id: session.course_id,
      title: session.title,
      session_number: session.session_number,
      session_date: session.session_date,
      is_published: session.is_published
    }));

    const { error } = await supabase
      .from('sessions')
      .upsert(updates, { onConflict: 'id' });

    if (error) {
      addToast('error', 'Failed to save new order.');
      console.error(error);
    } else {
      addToast('success', 'Schedule updated successfully.');
    }
    
    setIsUpdatingOrder(false);
  };

  if (isLoading && courses.length === 0) {
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
          <h1 className="admin-page-title">Manage Schedule</h1>
          <p className="admin-page-subtitle">Drag and drop sessions to reorder your curriculum</p>
        </div>
        {selectedCourseId && (
          <button
            className="btn btn-primary"
            onClick={() => router.push(`/admin/sessions/new?course_id=${selectedCourseId}`)} // Pass course ID if we make a new one
          >
            + New Session
          </button>
        )}
      </div>

      <div className="admin-card" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="admin-form-row" style={{ alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, margin: 0 }}>
            <label className="form-label">Select Batch</label>
            <select
              className="form-select"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
            >
              <option value="" disabled>-- Select a Batch --</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>{course.name}</option>
              ))}
            </select>
          </div>
          {isUpdatingOrder && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', color: 'var(--accent-primary)', fontSize: '14px' }}>
              <div className="spinner" /> Saving order...
            </div>
          )}
        </div>
      </div>

      {selectedCourseId && (
        <div className="admin-card">
          <div className="admin-table-container">
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}></th>
                    <th style={{ width: '50px' }}>#</th>
                    <th>Title</th>
                    <th>Date</th>
                    <th>Materials</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <SortableContext 
                    items={sessions.map(s => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {sessions.map((session) => (
                      <SortableSessionRow 
                        key={session.id} 
                        session={session} 
                        onEdit={(id: string) => router.push(`/admin/sessions/${id}`)}
                        onDeleteConfirm={handleDeleteRequest}
                        isConfirmingDelete={deleteConfirm === session.id}
                      />
                    ))}
                  </SortableContext>
                </tbody>
              </table>
            </DndContext>
            
            {sessions.length === 0 && !isLoading && (
              <div className="empty-state" style={{ padding: '40px' }}>
                <div className="empty-state-icon">📋</div>
                <h3 className="empty-state-title">No sessions yet</h3>
                <p className="empty-state-text">Create a session for this batch to get started.</p>
              </div>
            )}
            
            {sessions.length === 0 && isLoading && (
              <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
                <div className="spinner" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
