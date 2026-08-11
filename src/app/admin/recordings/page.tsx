'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { COURSE_MATERIALS_BUCKET, MAX_SESSION_MATERIAL_SIZE_BYTES } from '@/lib/materialFiles';
import { formatProgrammeDateTime } from '@/lib/studentTimeline';
import { isSupportedYoutubeUrl } from '@/lib/youtube';
import { createClient } from '@/utils/supabase/client';

type CourseOption = {
  id: string;
  name: string;
  cohort_start_date: string | null;
};

type Recording = {
  id: string;
  type: 'video';
  title: string;
  video_url: string | null;
  available_from: string;
  created_at: string;
};

type SessionMaterial = {
  id: string;
  type: 'session_material';
  title: string;
  file_url: string | null;
  available_from: string;
  created_at: string;
};

type BatchSession = {
  id: string;
  title: string;
  session_number: number;
  session_date: string;
  session_end_at: string | null;
  materials: Array<Recording | SessionMaterial>;
};

type RecordingDraft = {
  title: string;
  videoUrl: string;
};

type SessionMaterialDraft = {
  file: File | null;
  title: string;
};

type SessionMaterialResponse = {
  cleanupPending?: boolean;
  error?: string;
  fileReference?: string;
  uploadPath?: string;
  uploadToken?: string;
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

function SessionMaterialForm({
  draft,
  error,
  formId,
  isConfirmingRemove,
  isNew,
  isSaving,
  onCancelRemove,
  onChange,
  onConfirmRemove,
  onRemove,
  onSave,
}: {
  draft: SessionMaterialDraft;
  error?: string;
  formId: string;
  isConfirmingRemove: boolean;
  isNew: boolean;
  isSaving: boolean;
  onCancelRemove: () => void;
  onChange: (draft: SessionMaterialDraft) => void;
  onConfirmRemove: () => void;
  onRemove: () => void;
  onSave: () => void;
}) {
  return (
    <div className={`master-material-card${isNew ? ' master-recording-draft' : ''}`}>
      <strong>{isNew ? 'Add Session material' : 'Session material'}</strong>
      <label htmlFor={`${formId}-title`}>
        Title
        <input
          className="form-input"
          id={`${formId}-title`}
          value={draft.title}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${formId}-error` : `${formId}-file-help`}
          onChange={(event) => onChange({ ...draft, title: event.target.value })}
        />
      </label>
      <label htmlFor={`${formId}-file`}>
        {isNew ? 'Private PDF' : 'Replace private PDF (optional)'}
        <input
          accept="application/pdf,.pdf"
          className="form-input"
          id={`${formId}-file`}
          type="file"
          onChange={(event) => onChange({ ...draft, file: event.target.files?.[0] ?? null })}
        />
      </label>
      <p className="master-content-empty" id={`${formId}-file-help`}>
        {draft.file ? `${draft.file.name} selected.` : isNew ? 'PDF only, up to 50 MB.' : 'Current PDF stays in place unless you select a replacement.'}
      </p>
      {error && (
        <p className="master-content-error" id={`${formId}-error`} role="alert">
          {error}
        </p>
      )}
      {isConfirmingRemove ? (
        <div className="session-resource-confirmation" role="alert">
          <p>Remove this title and PDF from all Student surfaces?</p>
          <div>
            <button className="btn btn-danger btn-sm" type="button" disabled={isSaving} onClick={onConfirmRemove}>
              {isSaving ? 'Removing…' : 'Confirm remove'}
            </button>
            <button className="btn btn-ghost btn-sm" type="button" disabled={isSaving} onClick={onCancelRemove}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="session-resource-actions">
          <button className="btn btn-primary btn-sm" type="button" disabled={isSaving} onClick={onSave}>
            {isSaving ? 'Saving…' : isNew ? '+ Add Session material' : draft.file ? 'Replace PDF and save' : 'Save title'}
          </button>
          {!isNew && (
            <button className="btn btn-ghost btn-sm" type="button" disabled={isSaving} onClick={onRemove}>
              Remove
            </button>
          )}
        </div>
      )}
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
  const [sessionMaterialDrafts, setSessionMaterialDrafts] = useState<Record<string, SessionMaterialDraft>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | null>(null);
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
        materials (id, type, title, video_url, file_url, available_from, created_at)
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
        .filter((material) => material.type === 'video' || material.type === 'session_material')
        .sort((left, right) => (
          new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
        )),
    }));
    const nextDrafts: Record<string, RecordingDraft> = {};
    const nextSessionMaterialDrafts: Record<string, SessionMaterialDraft> = {};
    for (const session of normalized) {
      for (const recording of session.materials.filter((material): material is Recording => material.type === 'video')) {
        nextDrafts[recording.id] = {
          title: recording.title,
          videoUrl: recording.video_url ?? '',
        };
      }
      nextDrafts[`new-${session.id}`] = {
        title: `Recording — ${session.title}`,
        videoUrl: '',
      };
      for (const material of session.materials.filter((item): item is SessionMaterial => item.type === 'session_material')) {
        nextSessionMaterialDrafts[material.id] = { file: null, title: material.title };
      }
      nextSessionMaterialDrafts[`new-material-${session.id}`] = {
        file: null,
        title: `Session material — ${session.title}`,
      };
    }

    setSessions(normalized);
    setDrafts(nextDrafts);
    setSessionMaterialDrafts(nextSessionMaterialDrafts);
    setErrors({});
    setConfirmingRemoveId(null);
    setIsLoading(false);
  }, [addToast, supabase]);

  useEffect(() => {
    const loadCourses = async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, name, cohort_start_date')
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

  const readSessionMaterialResponse = async (response: Response) => {
    const responseText = await response.text();
    if (!responseText) return {} as SessionMaterialResponse;
    try {
      return JSON.parse(responseText) as SessionMaterialResponse;
    } catch {
      throw new Error(response.ok ? 'The server returned an invalid response.' : `Request failed (${response.status}).`);
    }
  };

  const saveSessionMaterial = async (
    sessionId: string,
    draftKey: string,
    materialId: string | null,
  ) => {
    const draft = sessionMaterialDrafts[draftKey] ?? { file: null, title: '' };
    const title = draft.title.trim();

    if (!title) {
      setErrors((current) => ({ ...current, [draftKey]: 'Enter a Session material title.' }));
      return;
    }
    if (!materialId && !draft.file) {
      setErrors((current) => ({ ...current, [draftKey]: 'Choose a PDF before adding this Session material.' }));
      return;
    }
    if (draft.file && (draft.file.type !== 'application/pdf' || !draft.file.name.toLowerCase().endsWith('.pdf'))) {
      setErrors((current) => ({ ...current, [draftKey]: 'Choose a PDF file.' }));
      return;
    }
    if (draft.file && (draft.file.size <= 0 || draft.file.size > MAX_SESSION_MATERIAL_SIZE_BYTES)) {
      setErrors((current) => ({ ...current, [draftKey]: 'Session material PDFs must be 50 MB or smaller.' }));
      return;
    }

    setSavingKey(draftKey);
    setErrors((current) => ({ ...current, [draftKey]: '' }));

    try {
      let fileReference: string | null = null;
      if (draft.file) {
        const authorizationResponse = await fetch('/api/admin/session-material-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: draft.file.name,
            fileSize: draft.file.size,
            fileType: draft.file.type,
            sessionId,
          }),
        });
        const authorization = await readSessionMaterialResponse(authorizationResponse);
        if (!authorizationResponse.ok || !authorization.fileReference || !authorization.uploadPath || !authorization.uploadToken) {
          throw new Error(authorization.error || 'Unable to authorize the Session material upload.');
        }

        const { error: uploadError } = await supabase.storage
          .from(COURSE_MATERIALS_BUCKET)
          .uploadToSignedUrl(authorization.uploadPath, authorization.uploadToken, draft.file, {
            contentType: 'application/pdf',
            upsert: false,
          });
        if (uploadError) throw new Error('The PDF upload failed. Keep your selection and retry.');
        fileReference = authorization.fileReference;
      }

      const saveResponse = await fetch('/api/admin/session-materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileReference, materialId, sessionId, title }),
      });
      const saved = await readSessionMaterialResponse(saveResponse);
      if (!saveResponse.ok) throw new Error(saved.error || 'Unable to save this Session material.');

      addToast(
        saved.cleanupPending ? 'warning' : 'success',
        saved.cleanupPending
          ? 'Session material saved. The previous private file still needs storage cleanup.'
          : materialId ? 'Session material saved.' : 'Session material added.',
      );
      await fetchSessions(selectedCourseId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save this Session material.';
      setErrors((current) => ({ ...current, [draftKey]: message }));
      addToast('error', message);
    } finally {
      setSavingKey(null);
    }
  };

  const removeSessionMaterial = async (sessionId: string, materialId: string) => {
    setSavingKey(materialId);
    setErrors((current) => ({ ...current, [materialId]: '' }));

    try {
      const response = await fetch('/api/admin/session-materials', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materialId, sessionId }),
      });
      const removed = await readSessionMaterialResponse(response);
      if (!response.ok) throw new Error(removed.error || 'Unable to remove this Session material.');

      addToast(
        removed.cleanupPending ? 'warning' : 'success',
        removed.cleanupPending
          ? 'Session material removed. Its private file still needs storage cleanup.'
          : 'Session material removed.',
      );
      await fetchSessions(selectedCourseId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to remove this Session material.';
      setErrors((current) => ({ ...current, [materialId]: message }));
      addToast('error', message);
    } finally {
      setSavingKey(null);
      setConfirmingRemoveId(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Session resources</h1>
          <p className="admin-page-subtitle">
            Manage each batch session&apos;s YouTube recordings and private PDF reading. Resources stay in this batch and release after the session ends.
          </p>
        </div>
      </div>

      <div className="admin-card" style={{ marginBottom: 'var(--space-xl)' }}>
        <label className="form-label" htmlFor="session-resource-batch">Batch</label>
        <select
          className="form-select"
          id="session-resource-batch"
          value={selectedCourseId}
          onChange={(event) => setSelectedCourseId(event.target.value)}
        >
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.name}{course.cohort_start_date ? ` — starts ${course.cohort_start_date}` : ''}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="admin-loading"><div className="spinner spinner-lg" /></div>
      ) : courses.length === 0 ? (
        <div className="admin-card empty-state">
          <p className="empty-state-text">Create a batch before adding Session resources.</p>
        </div>
      ) : (
        <div className="master-content-list">
          {sessions.map((session) => {
            const newKey = `new-${session.id}`;
            const newMaterialKey = `new-material-${session.id}`;
            const recordings = session.materials.filter((material): material is Recording => material.type === 'video');
            const sessionMaterials = session.materials.filter((material): material is SessionMaterial => material.type === 'session_material');
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

                <div className="session-resource-grid">
                  <div className="session-resource-column">
                    <div className="master-content-heading">
                      <div>
                        <h3>Recordings</h3>
                        <p className="master-content-empty">Titled YouTube links for this batch only.</p>
                      </div>
                    </div>
                    {recordings.map((recording) => (
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

                  <div className="session-resource-column">
                    <div className="master-content-heading">
                      <div>
                        <h3>Session materials</h3>
                        <p className="master-content-empty">Private PDFs released after this class.</p>
                      </div>
                    </div>
                    {sessionMaterials.map((material) => (
                      <SessionMaterialForm
                        draft={sessionMaterialDrafts[material.id] ?? { file: null, title: material.title }}
                        error={errors[material.id]}
                        formId={`session-material-${material.id}`}
                        isConfirmingRemove={confirmingRemoveId === material.id}
                        isNew={false}
                        isSaving={savingKey === material.id}
                        key={material.id}
                        onCancelRemove={() => setConfirmingRemoveId(null)}
                        onChange={(draft) => setSessionMaterialDrafts((current) => ({ ...current, [material.id]: draft }))}
                        onConfirmRemove={() => void removeSessionMaterial(session.id, material.id)}
                        onRemove={() => setConfirmingRemoveId(material.id)}
                        onSave={() => void saveSessionMaterial(session.id, material.id, material.id)}
                      />
                    ))}
                    <SessionMaterialForm
                      draft={sessionMaterialDrafts[newMaterialKey] ?? { file: null, title: `Session material — ${session.title}` }}
                      error={errors[newMaterialKey]}
                      formId={`session-material-${newMaterialKey}`}
                      isConfirmingRemove={false}
                      isNew
                      isSaving={savingKey === newMaterialKey}
                      onCancelRemove={() => undefined}
                      onChange={(draft) => setSessionMaterialDrafts((current) => ({ ...current, [newMaterialKey]: draft }))}
                      onConfirmRemove={() => undefined}
                      onRemove={() => undefined}
                      onSave={() => void saveSessionMaterial(session.id, newMaterialKey, null)}
                    />
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
