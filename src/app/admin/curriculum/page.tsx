'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/lib/AuthContext';
import { MaterialType } from '@/lib/types';
import { getMaterialTypeIcon } from '@/lib/utils';
import { DEFAULT_CURRICULUM, getDefaultSessionTitle, shouldUseDefaultSessionTitle } from '@/lib/curriculum';

type MasterMaterial = {
  id: string;
  type: MaterialType;
  title?: string | null;
  notion_url?: string | null;
  file_url?: string | null;
  video_url?: string | null;
  created_at: string;
};

type MasterSession = {
  id: string;
  title: string;
  session_number: number;
  master_materials?: MasterMaterial[];
};

export default function AdminCurriculumPage() {
  const [sessions, setSessions] = useState<MasterSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const supabase = createClient();
  const { addToast } = useAuth();

  const fetchMasterData = async () => {
    setIsLoading(true);
    const { data: sessionData } = await supabase
      .from('master_sessions')
      .select('*, master_materials(*)')
      .order('session_number', { ascending: true });
    
    if (sessionData) {
      const masterSessions = sessionData as MasterSession[];
      const sessionsWithCurriculumTitles = masterSessions.map((session) => {
        const defaultTitle = getDefaultSessionTitle(session.session_number);
        const shouldUpdateTitle = Boolean(defaultTitle && shouldUseDefaultSessionTitle(session.session_number, session.title));

        return {
          ...session,
          title: shouldUpdateTitle && defaultTitle ? defaultTitle : session.title,
          master_materials: [...(session.master_materials || [])].sort((a, b) => {
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          }),
        };
      });

      setSessions(sessionsWithCurriculumTitles);

      const titleUpdates = sessionsWithCurriculumTitles
        .filter((session, index) => session.title !== masterSessions[index].title)
        .map((session) => (
          supabase
            .from('master_sessions')
            .update({ title: session.title })
            .eq('id', session.id)
        ));

      if (titleUpdates.length > 0) {
        await Promise.all(titleUpdates);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchMasterData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpdateSessionTitle = async (id: string, title: string) => {
    await supabase.from('master_sessions').update({ title }).eq('id', id);
    setSessions(prev => prev.map(s => s.id === id ? { ...s, title } : s));
  };

  const handleFileUpload = async (sessionId: string, type: MaterialType, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSaving(true);
    try {
      const { uploadFile } = await import('@/utils/supabase/storage');
      const publicUrl = await uploadFile(file);
      await handleUpdateMaterial(sessionId, type, 'file_url', publicUrl);
      addToast('success', 'File uploaded and linked.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      addToast('error', 'Upload failed: ' + message);
    }
    setIsSaving(false);
  };

  const handleUpdateMaterial = async (sessionId: string, type: MaterialType, field: string, value: string) => {
    const session = sessions.find(s => s.id === sessionId);
    const material = session?.master_materials?.find((m) => m.type === type);

    if (material) {
      // Update existing
      const { error } = await supabase
        .from('master_materials')
        .update({ [field]: value })
        .eq('id', material.id);
      
      if (!error) {
        fetchMasterData();
      }
    } else {
      // Create new
      const { error } = await supabase
        .from('master_materials')
        .insert({
          master_session_id: sessionId,
          type,
          title: `${type.replace('_', ' ')} for ${session.title}`,
          [field]: value
        });
      
      if (!error) {
        fetchMasterData();
      }
    }
  };

  const handleUpdateMaterialById = async (materialId: string, field: string, value: string) => {
    const { error } = await supabase
      .from('master_materials')
      .update({ [field]: value })
      .eq('id', materialId);

    if (!error) {
      fetchMasterData();
    }
  };

  const handleAddPreRead = async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    const preReadCount = session.master_materials?.filter((m) => m.type === 'pre_read').length || 0;
    const { error } = await supabase
      .from('master_materials')
      .insert({
        master_session_id: sessionId,
        type: 'pre_read',
        title: `Pre-read ${preReadCount + 1} for ${session.title}`,
        notion_url: '',
      });

    if (error) {
      addToast('error', 'Failed to add pre-read.');
    } else {
      addToast('success', 'Pre-read added.');
      fetchMasterData();
    }
  };

  const handleDeleteMasterMaterial = async (materialId: string) => {
    const { error } = await supabase
      .from('master_materials')
      .delete()
      .eq('id', materialId);

    if (error) {
      addToast('error', 'Failed to remove material.');
    } else {
      addToast('success', 'Material removed.');
      fetchMasterData();
    }
  };

  const initializeMaster = async () => {
    setIsSaving(true);
    
    for (let i = 0; i < DEFAULT_CURRICULUM.length; i++) {
      const sess = DEFAULT_CURRICULUM[i];
      const { data: newSession } = await supabase
        .from('master_sessions')
        .insert({
          title: sess.title,
          session_number: i + 1
        })
        .select()
        .single();

      if (newSession) {
        // Create the 4 placeholders immediately
        const types: MaterialType[] = ['pre_read', 'class_material', 'worksheet', 'video'];
        const materialsToInsert = types.map(type => ({
          master_session_id: newSession.id,
          type,
          title: `${type.replace('_', ' ')} for ${sess.title}`,
        }));
        await supabase.from('master_materials').insert(materialsToInsert);
      }
    }

    addToast('success', 'Master Curriculum initialized with real session names.');
    fetchMasterData();
    setIsSaving(false);
  };

  if (isLoading) {
    return <div className="admin-loading"><div className="spinner spinner-lg" /></div>;
  }

  return (
    <div className="animate-fade-in">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Session Master Base</h1>
          <p className="admin-page-subtitle">Define the default materials for all your sessions here.</p>
        </div>
        {sessions.length === 0 && (
          <button className="btn btn-primary" onClick={initializeMaster} disabled={isSaving}>
            Initialize 16 Sessions
          </button>
        )}
      </div>

      <div className="admin-card">
        {sessions.length > 0 ? (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>#</th>
                  <th style={{ width: '200px' }}>Session Title</th>
                  <th style={{ minWidth: '320px' }}>Pre-reads (Global)</th>
                  <th>Worksheet (Global)</th>
                  <th>Class Material (Batch-Specific)</th>
                  <th>Video (Batch-Specific)</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => {
                  const getMat = (type: MaterialType) => session.master_materials?.find((m) => m.type === type);
                  const preReads = session.master_materials?.filter((m) => m.type === 'pre_read') || [];
                  
                  return (
                    <tr key={session.id}>
                      <td style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{session.session_number}</td>
                      <td>
                        <input 
                          type="text" 
                          className="form-input" 
                          style={{ border: 'none', background: 'transparent', padding: '4px', fontWeight: 600 }}
                          value={session.title}
                          onChange={(e) => handleUpdateSessionTitle(session.id, e.target.value)}
                        />
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {preReads.length > 0 ? (
                            preReads.map((mat, index) => (
                              <div
                                key={mat.id}
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '6px',
                                  padding: '10px',
                                  background: 'var(--bg-secondary)',
                                  border: '1px solid var(--border-primary)',
                                  borderRadius: 'var(--radius-md)'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '14px' }}>{getMaterialTypeIcon('pre_read')}</span>
                                  <input
                                    type="text"
                                    className="form-input"
                                    style={{ fontSize: '11px', height: '32px' }}
                                    placeholder={`Pre-read ${index + 1} name`}
                                    value={mat.title || ''}
                                    onChange={(e) => handleUpdateMaterialById(mat.id, 'title', e.target.value)}
                                  />
                                  <button
                                    className="btn btn-ghost btn-sm"
                                    style={{ color: 'var(--error)', padding: '4px 8px' }}
                                    onClick={() => handleDeleteMasterMaterial(mat.id)}
                                  >
                                    Remove
                                  </button>
                                </div>
                                <input
                                  type="text"
                                  className="form-input"
                                  style={{ fontSize: '11px', height: '32px' }}
                                  placeholder="Notion URL or page ID"
                                  value={mat.notion_url || ''}
                                  onChange={(e) => handleUpdateMaterialById(mat.id, 'notion_url', e.target.value)}
                                />
                              </div>
                            ))
                          ) : (
                            <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>No pre-reads yet.</span>
                          )}
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleAddPreRead(session.id)}
                          >
                            + Add Pre-read
                          </button>
                        </div>
                      </td>

                      {['worksheet', 'class_material', 'video'].map((type) => {
                        const mat = getMat(type as MaterialType);
                        const isStatic = type === 'worksheet';
                        const field = type === 'video' ? 'video_url' : 'file_url';
                        
                        return (
                          <td key={type}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '14px' }}>{getMaterialTypeIcon(type as MaterialType)}</span>
                                {type === 'worksheet' ? (
                                  <span style={{ fontSize: '11px', color: mat?.file_url ? 'var(--success)' : 'var(--text-tertiary)' }}>
                                    {mat?.file_url ? 'PDF uploaded' : 'No worksheet uploaded'}
                                  </span>
                                ) : (
                                  <input 
                                    type="text"
                                    className="form-input"
                                    style={{ 
                                      fontSize: '11px', 
                                      height: '32px',
                                      opacity: isStatic ? 1 : 0.5,
                                      borderStyle: isStatic ? 'solid' : 'dashed'
                                    }}
                                    placeholder="Unique per batch..."
                                    value={mat?.[field] || ''}
                                    disabled={!isStatic}
                                    onChange={(e) => handleUpdateMaterial(session.id, type as MaterialType, field, e.target.value)}
                                  />
                                )}
                              </div>
                              {type === 'worksheet' && (
                                <>
                                  {mat?.file_url && (
                                    <a
                                      href={mat.file_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      style={{ fontSize: '11px', color: 'var(--accent-primary)' }}
                                    >
                                      View current PDF
                                    </a>
                                  )}
                                  <input 
                                    type="file" 
                                    accept="application/pdf"
                                    style={{ fontSize: '10px' }}
                                    onChange={(e) => handleFileUpload(session.id, type as MaterialType, e)}
                                  />
                                </>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state" style={{ padding: '60px' }}>
            <div className="empty-state-icon">🏛️</div>
            <h3 className="empty-state-title">Empty Master Base</h3>
            <p className="empty-state-text">Click &quot;Initialize&quot; to create the 16-session skeleton.</p>
          </div>
        )}
      </div>
    </div>
  );
}
