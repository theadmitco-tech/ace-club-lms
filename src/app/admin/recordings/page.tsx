'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { formatProgrammeDateTime } from '@/lib/studentTimeline';
import { isSupportedYoutubeUrl } from '@/lib/youtube';
import { createClient } from '@/utils/supabase/client';

type CourseOption = {
  id: string;
  name: string;
};

type Recording = {
  id: string;
  type: 'video';
  title: string;
  video_url: string | null;
  available_from: string;
  created_at: string;
};

type BatchSession = {
  id: string;
  title: string;
  session_number: number;
  session_date: string;
  session_end_at: string | null;
  materials: Recording[];
};

type RecordingDraft = {
  title: string;
  videoUrl: string;
};

function RecordingForm({
  draft,
  error,
  formId,
  isSaving,
  isNew,
  onChange,
  onRemove,
  onSave,
}: {
  draft: RecordingDraft;
  error?: string;
  formId: string;
  isSaving: boolean;
  isNew: boolean;
  onChange: (draft: RecordingDraft) => void;
  onRemove?: () => void;
  onSave: () => void;
}) {
  return (
    <div className="master-material-card">
      <strong>{isNew ? 'Add recording' : 'Batch recording'}</strong>
      <label>
        Name
        <input
          className="form-input"
          value={draft.title}
          onChange={(event) => onChange({ ...draft, title: event.target.value })}
        />
      </label>
      <label>
        YouTube link
        <input
          className="form-input"
          type="url"
          placeholder="https://youtu.be/..."
          value={draft.videoUrl}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${formId}-error` : undefined}
          onChange={(event) => onChange({ ...draft, videoUrl: event.target.value })}
        />
      </label>
      {error && (
        <p className="master-content-error" id={`${formId}-error`} role="alert">
          {error}
        </p>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
        <button className="btn btn-primary btn-sm" type="button" disabled={isSaving} onClick={onSave}>
          {isSaving ? 'Saving…' : isNew ? '+ Add recording' : 'Save recording'}
        </button>
        {onRemove && (
          <button className="btn btn-ghost btn-sm" type="button" disabled={isSaving} onClick={onRemove}>
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

export default function AdminRecordingsPage() {
  const supabase = useMemo(() => createClient(), []);
  const { addToast } = useAuth();
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [sessions, setSessions] = useState<BatchSession[]>([]);
  const [drafts, setDrafts] = useState<Record<string, RecordingDraft>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSessions = useCallback(async (courseId: string) => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        id,
        title,
        session_number,
        session_date,
        session_end_at,
        materials (id, type, title, video_url, available_from, created_at)
      `)
      .eq('course_id', courseId)
      .order('session_number', { ascending: true });

    if (error) {
      console.error('Batch recording sessions failed to load:', error);
      addToast('error', 'Unable to load this batch’s recording schedule.');
      setSessions([]);
      setIsLoading(false);
      return;
    }

    const rows = (data ?? []) as unknown as BatchSession[];
    const normalized = rows.map((session) => ({
      ...session,
      materials: (session.materials ?? [])
        .filter((material) => material.type === 'video')
        .sort((left, right) => (
          new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
        )),
    }));
    const nextDrafts: Record<string, RecordingDraft> = {};
    for (const session of normalized) {
      for (const recording of session.materials) {
        nextDrafts[recording.id] = {
          title: recording.title,
          videoUrl: recording.video_url ?? '',
        };
      }
      nextDrafts[`new-${session.id}`] = {
        title: `Recording — ${session.title}`,
        videoUrl: '',
      };
    }

    setSessions(normalized);
    setDrafts(nextDrafts);
    setErrors({});
    setIsLoading(false);
  }, [addToast, supabase]);

  useEffect(() => {
    const loadCourses = async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, name')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Batches failed to load for recordings:', error);
        addToast('error', 'Unable to load batches.');
        setIsLoading(false);
        return;
      }

      const options = (data ?? []) as CourseOption[];
      setCourses(options);
      setSelectedCourseId((current) => current || options[0]?.id || '');
      if (options.length === 0) setIsLoading(false);
    };

    const timeoutId = window.setTimeout(() => void loadCourses(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [addToast, supabase]);

  useEffect(() => {
    if (!selectedCourseId) return;
    const timeoutId = window.setTimeout(() => void fetchSessions(selectedCourseId), 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchSessions, selectedCourseId]);

  const saveRecording = async (
    sessionId: string,
    draftKey: string,
    materialId: string | null,
  ) => {
    const draft = drafts[draftKey] ?? { title: '', videoUrl: '' };
    const title = draft.title.trim();
    const videoUrl = draft.videoUrl.trim();

    if (!title) {
      setErrors((current) => ({ ...current, [draftKey]: 'Enter a recording title.' }));
      return;
    }
    if (!isSupportedYoutubeUrl(videoUrl)) {
      setErrors((current) => ({ ...current, [draftKey]: 'Enter a valid YouTube or youtu.be link.' }));
      return;
    }

    setSavingKey(draftKey);
    setErrors((current) => ({ ...current, [draftKey]: '' }));
    const { error } = await supabase.rpc('save_batch_recording', {
      p_session_id: sessionId,
      p_title: title,
      p_video_url: videoUrl,
      p_material_id: materialId,
    });

    if (error) {
      console.error('Batch recording failed to save:', error);
      setErrors((current) => ({
        ...current,
        [draftKey]: 'Recording could not be saved. Keep the link and retry.',
      }));
      addToast('error', error.message || 'Unable to save this batch recording.');
    } else {
      addToast('success', materialId ? 'Batch recording updated.' : 'Batch recording added.');
      await fetchSessions(selectedCourseId);
    }
    setSavingKey(null);
  };

  const removeRecording = async (materialId: string) => {
    setSavingKey(materialId);
    const { error } = await supabase.rpc('remove_batch_recording', {
      p_material_id: materialId,
    });

    if (error) {
      console.error('Batch recording failed to remove:', error);
      addToast('error', 'Unable to remove this batch recording.');
    } else {
      addToast('success', 'Batch recording removed.');
      await fetchSessions(selectedCourseId);
    }
    setSavingKey(null);
  };

  return (
    <div className="animate-fade-in">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Batch Recordings</h1>
          <p className="admin-page-subtitle">
            Add the YouTube recording for each batch session. Recordings stay in this batch and release after that session ends.
          </p>
        </div>
      </div>

      <div className="admin-card" style={{ marginBottom: 'var(--space-xl)' }}>
        <label className="form-label" htmlFor="recording-batch">Batch</label>
        <select
          className="form-select"
          id="recording-batch"
          value={selectedCourseId}
          onChange={(event) => setSelectedCourseId(event.target.value)}
        >
          {courses.map((course) => (
            <option key={course.id} value={course.id}>{course.name}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="admin-loading"><div className="spinner spinner-lg" /></div>
      ) : courses.length === 0 ? (
        <div className="admin-card empty-state">
          <p className="empty-state-text">Create a batch before adding recordings.</p>
        </div>
      ) : (
        <div className="master-content-list">
          {sessions.map((session) => {
            const newKey = `new-${session.id}`;
            return (
              <section className="admin-card master-session-card" key={session.id}>
                <div className="master-session-heading">
                  <span className="master-session-number">{session.session_number}</span>
                  <div>
                    <h2>{session.title}</h2>
                    <p className="admin-page-subtitle">
                      Releases after {formatProgrammeDateTime(
                        session.session_end_at ?? session.session_date,
                        'Asia/Kolkata',
                      )}
                    </p>
                  </div>
                </div>

                <div className="master-content-grid">
                  {session.materials.map((recording) => (
                    <RecordingForm
                      key={recording.id}
                      draft={drafts[recording.id] ?? { title: recording.title, videoUrl: recording.video_url ?? '' }}
                      error={errors[recording.id]}
                      formId={`recording-${recording.id}`}
                      isSaving={savingKey === recording.id}
                      isNew={false}
                      onChange={(draft) => setDrafts((current) => ({ ...current, [recording.id]: draft }))}
                      onRemove={() => void removeRecording(recording.id)}
                      onSave={() => void saveRecording(session.id, recording.id, recording.id)}
                    />
                  ))}
                  <RecordingForm
                    draft={drafts[newKey] ?? { title: `Recording — ${session.title}`, videoUrl: '' }}
                    error={errors[newKey]}
                    formId={`recording-${newKey}`}
                    isSaving={savingKey === newKey}
                    isNew
                    onChange={(draft) => setDrafts((current) => ({ ...current, [newKey]: draft }))}
                    onSave={() => void saveRecording(session.id, newKey, null)}
                  />
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
