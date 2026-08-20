'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
import { getDefaultSessionTitle, shouldUseDefaultSessionTitle } from '@/lib/curriculum';
import { cancelEventAction, reorderEventsAction, shiftScheduleAction } from './actions';

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

type CourseOption = {
  id: string;
  name: string;
  schedule_revision: number;
  source_template_revision_id: string | null;
};

type AdminSession = {
  id: string;
  course_id: string;
  title: string;
  session_number: number;
  session_date: string;
  is_published: boolean;
  display_order: number | null;
  session_end_at: string | null;
  cancelled_at: string | null;
  materials?: { id: string }[];
};

type SortableSessionRowProps = {
  session: AdminSession;
  onEdit: (id: string) => void;
  onDeleteConfirm: (id: string, action: boolean | 'start') => void;
  isConfirmingDelete: boolean;
};

// --- Sortable Row Component ---
function SortableSessionRow({ session, onEdit, onDeleteConfirm, isConfirmingDelete }: SortableSessionRowProps) {
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
              Cancel
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function toDateTimeLocalValue(dateValue: string) {
  const date = new Date(dateValue);
  const istDate = new Date(date.getTime() + 330 * 60000);
  return istDate.toISOString().slice(0, 16);
}

// --- Main Page Component ---
export default function AdminSessionsPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [pushFromSessionId, setPushFromSessionId] = useState('');
  const [pushToDate, setPushToDate] = useState('');
  const [isPushingSchedule, setIsPushingSchedule] = useState(false);
  
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

  const fetchCourses = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('courses')
      .select('id, name, schedule_revision, source_template_revision_id')
      .order('created_at', { ascending: false });
      
    if (!error && data) {
      const courseOptions = data as CourseOption[];
      setCourses(courseOptions);
      if (data.length > 0) {
        setSelectedCourseId(courseOptions[0].id);
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
      .order('display_order', { ascending: true, nullsFirst: false })
      .order('session_number', { ascending: true });
      
    if (!error && data) {
      const fetchedSessions = data as AdminSession[];
      const isPhase2Batch = Boolean(courses.find((course) => course.id === courseId)?.source_template_revision_id);
      const sessionsWithCurriculumTitles = fetchedSessions.map((session) => {
        const defaultTitle = getDefaultSessionTitle(session.session_number);
        const shouldUpdateTitle = !isPhase2Batch && Boolean(defaultTitle && shouldUseDefaultSessionTitle(session.session_number, session.title));

        return {
          ...session,
          title: shouldUpdateTitle && defaultTitle ? defaultTitle : session.title,
        };
      });

      setSessions(sessionsWithCurriculumTitles);
      setPushFromSessionId((currentId) => {
        if (currentId && sessionsWithCurriculumTitles.some((session) => session.id === currentId)) {
          return currentId;
        }

        return sessionsWithCurriculumTitles[0]?.id || '';
      });
      setPushToDate((currentDate) => currentDate || (
        sessionsWithCurriculumTitles[0] ? toDateTimeLocalValue(sessionsWithCurriculumTitles[0].session_date) : ''
      ));

      const titleUpdates = sessionsWithCurriculumTitles
        .filter((session, index) => session.title !== fetchedSessions[index].title)
        .map((session) => (
          supabase
            .from('sessions')
            .update({ title: session.title })
            .eq('id', session.id)
        ));

      if (titleUpdates.length > 0) {
        await Promise.all(titleUpdates);
      }
    }
    setIsLoading(false);
  };

  const selectedPushSession = sessions.find((session) => session.id === pushFromSessionId);
  const pushDeltaMs = selectedPushSession && pushToDate
    ? new Date(pushToDate).getTime() - new Date(selectedPushSession.session_date).getTime()
    : 0;
  const pushPreviewDate = selectedPushSession && pushToDate
    ? new Date(new Date(selectedPushSession.session_date).getTime() + pushDeltaMs).toISOString()
    : '';
  const pushConsequences = selectedPushSession && pushDeltaMs
    ? sessions.filter((session) => session.session_number >= selectedPushSession.session_number
      && !session.cancelled_at && new Date(session.session_date) > new Date())
      .map((session) => ({ ...session, after: new Date(new Date(session.session_date).valueOf() + pushDeltaMs).toISOString() }))
    : [];

  const handleDeleteRequest = async (id: string, action: boolean | 'start') => {
    if (action === 'start') {
      setDeleteConfirm(id);
      return;
    }
    if (action === false) {
      setDeleteConfirm(null);
      return;
    }
    
    const selectedCourse = courses.find((course) => course.id === selectedCourseId);
    if (!selectedCourse?.source_template_revision_id) {
      addToast('error', 'Legacy batches are preserved and cannot be deleted through the Phase 2 editor.');
      setDeleteConfirm(null);
      return;
    }
    const result = await cancelEventAction({
      courseId: selectedCourseId,
      sessionId: id,
      reason: 'Cancelled by Admin after consequence review',
      expectedRevision: selectedCourse.schedule_revision,
    });
    if (result.status === 'error') addToast('error', result.message);
    else {
      addToast('success', result.message);
      setCourses((current) => current.map((course) => course.id === selectedCourseId
        ? { ...course, schedule_revision: result.scheduleRevision ?? course.schedule_revision }
        : course));
      await fetchSessions(selectedCourseId);
    }
    setDeleteConfirm(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const selectedCourse = courses.find((course) => course.id === selectedCourseId);
      const activeSession = sessions.find((session) => session.id === active.id);
      const overSession = sessions.find((session) => session.id === over.id);
      const now = Date.now();
      if (!selectedCourse?.source_template_revision_id || !activeSession || !overSession
        || activeSession.cancelled_at || overSession.cancelled_at
        || new Date(activeSession.session_date).valueOf() <= now || new Date(overSession.session_date).valueOf() <= now) {
        addToast('error', 'Only eligible future events in a Phase 2 batch can be reordered.');
        return;
      }
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

        const consequence = updatedItems
          .filter((item, index) => item.id !== items[index]?.id || item.session_date !== items[index]?.session_date)
          .map((item) => `${item.title}: ${formatDate(items.find((original) => original.id === item.id)?.session_date || item.session_date)} → ${formatDate(item.session_date)}`)
          .join('\n');
        if (window.confirm(`Review schedule consequences\n\n${consequence}`)) void saveNewOrder(updatedItems);
        else return items;
        return updatedItems;
      });
    }
  };

  const saveNewOrder = async (newSessions: AdminSession[]) => {
    setIsUpdatingOrder(true);
    const selectedCourse = courses.find((course) => course.id === selectedCourseId);
    if (!selectedCourse?.source_template_revision_id) {
      addToast('error', 'Legacy batches remain unchanged.');
      setIsUpdatingOrder(false);
      return;
    }
    const eligibleIds = newSessions
      .filter((session) => !session.cancelled_at && new Date(session.session_date) > new Date())
      .map((session) => session.id);
    const result = await reorderEventsAction({ courseId: selectedCourseId, sessionIds: eligibleIds, expectedRevision: selectedCourse.schedule_revision });
    if (result.status === 'error') {
      addToast('error', result.message);
      await fetchSessions(selectedCourseId);
    } else {
      addToast('success', result.message);
      setCourses((current) => current.map((course) => course.id === selectedCourseId
        ? { ...course, schedule_revision: result.scheduleRevision ?? course.schedule_revision }
        : course));
      await fetchSessions(selectedCourseId);
    }
    
    setIsUpdatingOrder(false);
  };

  const handlePushSchedule = async () => {
    if (!selectedPushSession || !pushToDate) {
      addToast('info', 'Choose a session and its new date first.');
      return;
    }

    const targetDate = new Date(pushToDate);
    if (Number.isNaN(targetDate.getTime())) {
      addToast('error', 'Enter a valid date and time.');
      return;
    }

    const deltaMs = targetDate.getTime() - new Date(selectedPushSession.session_date).getTime();
    if (deltaMs === 0) {
      addToast('info', 'The new date matches the current date.');
      return;
    }

    const days = Math.round(deltaMs / 86_400_000);
    if (deltaMs !== days * 86_400_000 || days === 0) {
      addToast('error', 'Choose a whole-day shift. Event times stay unchanged.');
      return;
    }
    const affectedSessions = sessions
      .filter((session) => session.session_number >= selectedPushSession.session_number)
      .map((session) => ({
        ...session,
        session_date: new Date(new Date(session.session_date).getTime() + deltaMs).toISOString(),
      }));

    setIsPushingSchedule(true);

    const selectedCourse = courses.find((course) => course.id === selectedCourseId);
    if (!selectedCourse?.source_template_revision_id) {
      addToast('error', 'Legacy batches remain unchanged and are not editable in the Phase 2 workflow.');
      setIsPushingSchedule(false);
      return;
    }
    const result = await shiftScheduleAction({
      courseId: selectedCourseId,
      sessionId: selectedPushSession.id,
      days,
      expectedRevision: selectedCourse.schedule_revision,
    });
    if (result.status === 'error') {
      addToast('error', result.message);
      setIsPushingSchedule(false);
      return;
    }
    setCourses((current) => current.map((course) => course.id === selectedCourseId
      ? { ...course, schedule_revision: result.scheduleRevision ?? course.schedule_revision }
      : course));

    setSessions((currentSessions) => currentSessions.map((session) => {
      const updatedSession = affectedSessions.find((affected) => affected.id === session.id);
      return updatedSession || session;
    }));
    setPushToDate('');
    addToast('success', result.message);
    setIsPushingSchedule(false);
  };

  useEffect(() => {
    void fetchCourses(); // eslint-disable-line react-hooks/set-state-in-effect
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedCourseId) {
      void fetchSessions(selectedCourseId); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [selectedCourseId]); // eslint-disable-line react-hooks/exhaustive-deps

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
              onChange={(e) => {
                setSelectedCourseId(e.target.value);
                setPushToDate('');
              }}
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

      {selectedCourseId && sessions.length > 0 && (
        <div className="admin-card" style={{ marginBottom: 'var(--space-xl)' }}>
          <div className="admin-card-header">
            <div>
              <h2 className="admin-card-title">Push Missed Class</h2>
              <p className="admin-page-subtitle">Move one class and automatically shift every following session.</p>
            </div>
          </div>
          <div className="admin-form-row" style={{ alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: 1, margin: 0 }}>
              <label htmlFor="push-session" className="form-label">Start from</label>
              <select
                id="push-session"
                className="form-select"
                value={pushFromSessionId}
                onChange={(e) => {
                  const nextSession = sessions.find((session) => session.id === e.target.value);
                  setPushFromSessionId(e.target.value);
                  setPushToDate(nextSession ? toDateTimeLocalValue(nextSession.session_date) : '');
                }}
              >
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {String(session.session_number).padStart(2, '0')} · {session.title} · {formatDate(session.session_date)}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ minWidth: 220, margin: 0 }}>
              <label htmlFor="push-date" className="form-label">New date</label>
              <input
                id="push-date"
                type="datetime-local"
                className="form-input"
                value={pushToDate}
                onChange={(e) => setPushToDate(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handlePushSchedule}
              disabled={isPushingSchedule || !pushToDate || !selectedPushSession || pushDeltaMs === 0}
            >
              {isPushingSchedule ? <><div className="spinner" /> Pushing...</> : 'Push Schedule'}
            </button>
          </div>
          {selectedPushSession && pushToDate && pushDeltaMs !== 0 && (
            <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '12px' }}>
              <p>{pushConsequences.length} session{pushConsequences.length === 1 ? '' : 's'} will move by {Math.round(pushDeltaMs / (24 * 60 * 60 * 1000))} day{Math.abs(Math.round(pushDeltaMs / (24 * 60 * 60 * 1000))) === 1 ? '' : 's'}. Session {selectedPushSession.session_number} becomes {formatDate(pushPreviewDate)}.</p>
              <details><summary>Review every affected event and unreleased timestamp</summary><ul>{pushConsequences.map((session) => <li key={session.id}>{session.title}: {formatDate(session.session_date)} → {formatDate(session.after)}</li>)}</ul><p>Already-released material remains available; only unreleased timestamps follow this change.</p></details>
            </div>
          )}
        </div>
      )}

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
