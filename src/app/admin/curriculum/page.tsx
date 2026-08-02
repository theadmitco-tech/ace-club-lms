'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getMaterialTypeIcon } from '@/lib/utils';
import { isSupportedYoutubeUrl } from '@/lib/youtube';
import { createClient } from '@/utils/supabase/client';

type MasterMaterial = {
  id: string;
  type: 'pre_read' | 'worksheet' | 'video';
  title: string;
  notion_url: string | null;
  file_url: string | null;
  video_url: string | null;
  question_count: number | null;
  created_at: string;
};

type MasterSession = {
  id: string;
  title: string;
  session_number: number;
  master_materials: MasterMaterial[];
};

type UploadResponse = {
  error?: string;
  fileName?: string;
  fileReference?: string;
};

type RecordingDraft = {
  title: string;
  videoUrl: string;
};

export default function AdminCurriculumPage() {
  const supabase = useMemo(() => createClient(), []);
  const { addToast } = useAuth();
  const [sessions, setSessions] = useState<MasterSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingMaterialId, setSavingMaterialId] = useState<string | null>(null);
  const [recordingDrafts, setRecordingDrafts] = useState<Record<string, RecordingDraft>>({});
  const [recordingErrors, setRecordingErrors] = useState<Record<string, string>>({});

  const fetchMasterData = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('master_sessions')
      .select(`
        id,
        title,
        session_number,
        master_materials (
          id,
          type,
          title,
          notion_url,
          file_url,
          video_url,
          question_count,
          created_at
        )
      `)
      .eq('is_archived', false)
      .order('session_number', { ascending: true });

    if (error) {
      console.error('Master course load failed:', error);
      addToast('error', 'Unable to load the master course. Apply the Phase 3 migration first.');
      setSessions([]);
    } else {
      const masterSessions = (data ?? []) as MasterSession[];
      setSessions(masterSessions.map((session) => ({
        ...session,
        master_materials: [...(session.master_materials ?? [])].sort(
          (left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime(),
        ),
      })));
    }

    setIsLoading(false);
  }, [addToast, supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void fetchMasterData(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchMasterData]);

  const updateLocalMaterial = (materialId: string, changes: Partial<MasterMaterial>) => {
    setSessions((current) => current.map((session) => ({
      ...session,
      master_materials: session.master_materials.map((material) => (
        material.id === materialId ? { ...material, ...changes } : material
      )),
    })));
  };

  const persistMaterial = async (materialId: string, changes: Partial<MasterMaterial>) => {
    setSavingMaterialId(materialId);
    const { error } = await supabase
      .from('master_materials')
      .update(changes)
      .eq('id', materialId);

    if (error) {
      console.error('Master material update failed:', error);
      addToast('error', 'Unable to save this master material.');
      await fetchMasterData();
      setSavingMaterialId(null);
      return false;
    }
    setSavingMaterialId(null);
    return true;
  };

  const addMaterial = async (session: MasterSession, type: MasterMaterial['type']) => {
    const existingCount = session.master_materials.filter((material) => material.type === type).length;
    const label = type === 'pre_read' ? 'Pre-read' : 'Worksheet';
    const { error } = await supabase.from('master_materials').insert({
      master_session_id: session.id,
      type,
      title: `${label} ${existingCount + 1} — ${session.title}`,
      notion_url: type === 'pre_read' ? '' : null,
      question_count: null,
    });

    if (error) {
      console.error('Master material creation failed:', error);
      addToast('error', `Unable to add the ${label.toLowerCase()}.`);
      return;
    }

    addToast('success', `${label} added to the master course.`);
    await fetchMasterData();
  };

  const addRecording = async (session: MasterSession) => {
    const draft = recordingDrafts[session.id] ?? { title: '', videoUrl: '' };
    const title = draft.title.trim();
    const videoUrl = draft.videoUrl.trim();

    if (!title) {
      setRecordingErrors((current) => ({ ...current, [session.id]: 'Enter a recording title.' }));
      return;
    }
    if (!isSupportedYoutubeUrl(videoUrl)) {
      setRecordingErrors((current) => ({ ...current, [session.id]: 'Enter a valid YouTube or youtu.be link.' }));
      return;
    }

    setSavingMaterialId(`new-video-${session.id}`);
    setRecordingErrors((current) => ({ ...current, [session.id]: '' }));
    const { error } = await supabase.from('master_materials').insert({
      master_session_id: session.id,
      type: 'video',
      title,
      video_url: videoUrl,
    });

    if (error) {
      console.error('Master recording creation failed:', error);
      setRecordingErrors((current) => ({ ...current, [session.id]: 'Recording could not be saved. Keep the link and retry.' }));
      addToast('error', 'Unable to save this recording.');
    } else {
      setRecordingDrafts((current) => ({ ...current, [session.id]: { title: '', videoUrl: '' } }));
      addToast('success', 'Recording saved to the master course.');
      await fetchMasterData();
    }
    setSavingMaterialId(null);
  };

  const persistRecording = async (material: MasterMaterial) => {
    const title = material.title.trim();
    const videoUrl = material.video_url?.trim() ?? '';
    if (!title) {
      setRecordingErrors((current) => ({ ...current, [material.id]: 'Enter a recording title.' }));
      return;
    }
    if (!isSupportedYoutubeUrl(videoUrl)) {
      setRecordingErrors((current) => ({ ...current, [material.id]: 'Enter a valid YouTube or youtu.be link.' }));
      return;
    }

    setRecordingErrors((current) => ({ ...current, [material.id]: '' }));
    const saved = await persistMaterial(material.id, { title, video_url: videoUrl });
    if (saved) addToast('success', 'Recording saved. Sync the batch to propagate this link.');
  };

  const removeMaterial = async (materialId: string) => {
    const { error } = await supabase.from('master_materials').delete().eq('id', materialId);
    if (error) {
      console.error('Master material removal failed:', error);
      addToast('error', 'Unable to remove the master material.');
      return;
    }

    addToast('success', 'Master material removed.');
    await fetchMasterData();
  };

  const removeRecording = async (materialId: string) => {
    setSavingMaterialId(materialId);
    const { data, error } = await supabase.rpc('remove_master_recording', {
      p_master_material_id: materialId,
    });

    if (error) {
      console.error('Master recording removal failed:', error);
      addToast('error', 'Unable to remove this recording from linked batches.');
      setSavingMaterialId(null);
      return;
    }

    const removed = Number((data as { linked_materials_removed?: number } | null)?.linked_materials_removed || 0);
    addToast(
      'success',
      `Recording removed from the master course and ${removed} linked batch cop${removed === 1 ? 'y' : 'ies'}.`,
    );
    await fetchMasterData();
    setSavingMaterialId(null);
  };

  const uploadWorksheet = async (
    masterSessionId: string,
    material: MasterMaterial,
    file: File,
  ) => {
    setSavingMaterialId(material.id);
    const formData = new FormData();
    formData.set('masterSessionId', masterSessionId);
    formData.set('file', file);

    try {
      const response = await fetch('/api/admin/master-material-upload', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json() as UploadResponse;
      if (!response.ok || !result.fileReference) {
        throw new Error(result.error || 'Unable to upload the worksheet.');
      }

      const title = material.title.trim() || result.fileName || 'Worksheet';
      const { error } = await supabase
        .from('master_materials')
        .update({ file_url: result.fileReference, title })
        .eq('id', material.id);

      if (error) throw error;
      updateLocalMaterial(material.id, { file_url: result.fileReference, title });
      addToast('success', 'Worksheet uploaded to the private master library.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to upload the worksheet.';
      addToast('error', message);
    } finally {
      setSavingMaterialId(null);
    }
  };

  if (isLoading) {
    return <div className="admin-loading"><div className="spinner spinner-lg" /></div>;
  }

  return (
    <div className="animate-fade-in">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Master Course Content</h1>
          <p className="admin-page-subtitle">
            Add reusable Notion pre-reads, PDF worksheets and YouTube recordings. New cohorts inherit them automatically.
          </p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="admin-card empty-state">
          <h2 className="empty-state-title">Master course not imported</h2>
          <p className="empty-state-text">Apply the reviewed Phase 3 curriculum import before adding content.</p>
        </div>
      ) : (
        <div className="master-content-list">
          {sessions.map((session) => {
            const preReads = session.master_materials.filter((material) => material.type === 'pre_read');
            const worksheets = session.master_materials.filter((material) => material.type === 'worksheet');
            const recordings = session.master_materials.filter((material) => material.type === 'video');
            const recordingDraft = recordingDrafts[session.id] ?? { title: '', videoUrl: '' };

            return (
              <section className="admin-card master-session-card" key={session.id}>
                <div className="master-session-heading">
                  <span className="master-session-number">{session.session_number}</span>
                  <h2>{session.title}</h2>
                </div>

                <div className="master-content-grid">
                  <div>
                    <div className="master-content-heading">
                      <h3>{getMaterialTypeIcon('pre_read')} Notion pre-reads</h3>
                      <button className="btn btn-secondary btn-sm" onClick={() => void addMaterial(session, 'pre_read')}>
                        + Add pre-read
                      </button>
                    </div>
                    {preReads.length === 0 && <p className="master-content-empty">No pre-reads added.</p>}
                    {preReads.map((material) => (
                      <div className="master-material-card" key={material.id}>
                        <label>
                          Name
                          <input
                            className="form-input"
                            value={material.title}
                            onChange={(event) => updateLocalMaterial(material.id, { title: event.target.value })}
                            onBlur={() => void persistMaterial(material.id, { title: material.title.trim() })}
                          />
                        </label>
                        <label>
                          Notion link
                          <input
                            className="form-input"
                            type="url"
                            placeholder="https://www.notion.so/..."
                            value={material.notion_url ?? ''}
                            onChange={(event) => updateLocalMaterial(material.id, { notion_url: event.target.value })}
                            onBlur={() => void persistMaterial(material.id, { notion_url: material.notion_url?.trim() || null })}
                          />
                        </label>
                        <div className="master-material-actions">
                          {savingMaterialId === material.id && <span>Saving…</span>}
                          <button className="btn btn-ghost btn-sm" onClick={() => void removeMaterial(material.id)}>Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <div className="master-content-heading">
                      <h3>{getMaterialTypeIcon('worksheet')} PDF worksheets</h3>
                      <button className="btn btn-secondary btn-sm" onClick={() => void addMaterial(session, 'worksheet')}>
                        + Add worksheet
                      </button>
                    </div>
                    {worksheets.length === 0 && <p className="master-content-empty">No worksheets added.</p>}
                    {worksheets.map((material) => (
                      <div className="master-material-card" key={material.id}>
                        <label>
                          Name
                          <input
                            className="form-input"
                            value={material.title}
                            onChange={(event) => updateLocalMaterial(material.id, { title: event.target.value })}
                            onBlur={() => void persistMaterial(material.id, { title: material.title.trim() })}
                          />
                        </label>
                        <label>
                          Worksheet PDF
                          <input
                            className="form-input"
                            type="file"
                            accept="application/pdf,.pdf"
                            disabled={savingMaterialId === material.id}
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) void uploadWorksheet(session.id, material, file);
                              event.target.value = '';
                            }}
                          />
                        </label>
                        <p className={material.file_url ? 'master-file-ready' : 'master-content-empty'}>
                          {material.file_url ? 'PDF uploaded' : 'No PDF uploaded'}
                        </p>
                        <label>
                          Question count
                          <input
                            className="form-input"
                            type="number"
                            inputMode="numeric"
                            min="1"
                            step="1"
                            placeholder="e.g. 30"
                            value={material.question_count ?? ''}
                            onChange={(event) => {
                              const value = Number(event.target.value);
                              updateLocalMaterial(material.id, {
                                question_count: Number.isInteger(value) && value > 0 ? value : null,
                              });
                            }}
                            onBlur={() => void persistMaterial(material.id, { question_count: material.question_count })}
                          />
                        </label>
                        <div className="master-material-actions">
                          {savingMaterialId === material.id && <span>Saving…</span>}
                          <button className="btn btn-ghost btn-sm" onClick={() => void removeMaterial(material.id)}>Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <div className="master-content-heading">
                      <h3>{getMaterialTypeIcon('video')} YouTube recordings</h3>
                    </div>
                    {recordings.length === 0 && <p className="master-content-empty">No recordings added.</p>}
                    {recordings.map((material) => (
                      <div className="master-material-card" key={material.id}>
                        <label>
                          Name
                          <input
                            className="form-input"
                            value={material.title}
                            onChange={(event) => updateLocalMaterial(material.id, { title: event.target.value })}
                            onBlur={() => void persistRecording(material)}
                          />
                        </label>
                        <label>
                          YouTube link
                          <input
                            className="form-input"
                            type="url"
                            placeholder="https://www.youtube.com/watch?v=..."
                            value={material.video_url ?? ''}
                            aria-invalid={Boolean(recordingErrors[material.id])}
                            aria-describedby={recordingErrors[material.id] ? `recording-error-${material.id}` : undefined}
                            onChange={(event) => updateLocalMaterial(material.id, { video_url: event.target.value })}
                            onBlur={() => void persistRecording(material)}
                          />
                        </label>
                        {recordingErrors[material.id] && (
                          <p className="master-content-error" id={`recording-error-${material.id}`} role="alert">
                            {recordingErrors[material.id]}
                          </p>
                        )}
                        <div className="master-material-actions">
                          {savingMaterialId === material.id && <span>Saving recording…</span>}
                          <button
                            className="btn btn-ghost btn-sm"
                            disabled={savingMaterialId === material.id}
                            onClick={() => void removeRecording(material.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}

                    <div className="master-material-card master-recording-draft">
                      <strong>Add recording</strong>
                      <label>
                        Name
                        <input
                          className="form-input"
                          placeholder={`Recording — ${session.title}`}
                          value={recordingDraft.title}
                          onChange={(event) => setRecordingDrafts((current) => ({
                            ...current,
                            [session.id]: { ...recordingDraft, title: event.target.value },
                          }))}
                        />
                      </label>
                      <label>
                        YouTube link
                        <input
                          className="form-input"
                          type="url"
                          placeholder="https://youtu.be/..."
                          value={recordingDraft.videoUrl}
                          aria-invalid={Boolean(recordingErrors[session.id])}
                          aria-describedby={recordingErrors[session.id] ? `recording-error-${session.id}` : undefined}
                          onChange={(event) => setRecordingDrafts((current) => ({
                            ...current,
                            [session.id]: { ...recordingDraft, videoUrl: event.target.value },
                          }))}
                        />
                      </label>
                      {recordingErrors[session.id] && (
                        <p className="master-content-error" id={`recording-error-${session.id}`} role="alert">
                          {recordingErrors[session.id]}
                        </p>
                      )}
                      <button
                        className="btn btn-secondary btn-sm"
                        disabled={savingMaterialId === `new-video-${session.id}`}
                        onClick={() => void addRecording(session)}
                      >
                        {savingMaterialId === `new-video-${session.id}` ? 'Saving recording…' : '+ Add recording'}
                      </button>
                    </div>
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
