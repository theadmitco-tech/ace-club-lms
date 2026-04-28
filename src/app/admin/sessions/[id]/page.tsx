'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { formatDate, getMaterialTypeIcon, getMaterialTypeLabel } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
import { MaterialType } from '@/lib/types';

/**
 * Auto-calculates the available_from date based on material type and session date.
 * - Pre-read: 1 week before session (at 10:00 AM IST)
 * - Class Material, Worksheet, Video: right after session ends (at 12:00 PM IST = 06:30 UTC)
 */
function getAvailableFrom(type: MaterialType, sessionDateISO: string): string {
  const sessionDate = new Date(sessionDateISO);
  
  if (type === 'pre_read') {
    // 1 week before, at 10:00 AM IST (04:30 UTC)
    const preReadDate = new Date(sessionDate);
    preReadDate.setDate(preReadDate.getDate() - 7);
    preReadDate.setUTCHours(4, 30, 0, 0);
    return preReadDate.toISOString();
  } else {
    // Right after session ends: 12:00 PM IST = 06:30 UTC on session day
    const afterSession = new Date(sessionDate);
    afterSession.setUTCHours(6, 30, 0, 0);
    return afterSession.toISOString();
  }
}

export default function EditSessionPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;
  const { addToast } = useAuth();
  const [supabase] = useState(() => createClient());

  const [courses, setCourses] = useState<any[]>([]);
  const [sessionDate, setSessionDate] = useState<string>(''); // raw ISO from DB
  const [form, setForm] = useState({
    title: '',
    session_number: '',
    session_date: '',
    course_id: '',
    is_published: true,
  });
  const [materials, setMaterialsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [newMaterial, setNewMaterial] = useState({
    type: 'pre_read' as MaterialType,
    title: '',
    file_url: '',
    notion_url: '',
    video_url: '',
  });

  const fetchData = async () => {
    setLoading(true);
    
    const { data: coursesData } = await supabase.from('courses').select('id, name');
    if (coursesData) setCourses(coursesData);

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      addToast('error', 'Session not found');
      router.push('/admin/sessions');
      return;
    }

    setSessionDate(session.session_date);
    
    const dt = new Date(session.session_date);
    const localDt = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    
    setForm({
      title: session.title,
      session_number: String(session.session_number),
      session_date: localDt,
      course_id: session.course_id,
      is_published: session.is_published,
    });

    const { data: materialsData } = await supabase
      .from('materials')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    
    if (materialsData) setMaterialsList(materialsData);
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpdateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const newSessionDate = new Date(form.session_date).toISOString();
    
    const { error } = await supabase
      .from('sessions')
      .update({
        title: form.title,
        session_number: parseInt(form.session_number),
        session_date: newSessionDate,
        course_id: form.course_id,
        is_published: form.is_published,
      })
      .eq('id', sessionId);

    if (error) {
      addToast('error', 'Failed to update session');
    } else {
      // Update available_from for all existing materials based on new session date
      setSessionDate(newSessionDate);
      for (const mat of materials) {
        const newAvailableFrom = getAvailableFrom(mat.type, newSessionDate);
        await supabase
          .from('materials')
          .update({ available_from: newAvailableFrom })
          .eq('id', mat.id);
      }
      addToast('success', 'Session and material schedules updated');
      router.push('/admin/sessions');
    }
    setSaving(false);
  };

  const handleAddMaterial = async () => {
    if (!newMaterial.title) return;
    setSaving(true);
    
    // Auto-calculate available_from based on type and the current session date
    const currentSessionDate = sessionDate || new Date(form.session_date).toISOString();
    const available_from = getAvailableFrom(newMaterial.type, currentSessionDate);

    const { data, error } = await supabase
      .from('materials')
      .insert({
        session_id: sessionId,
        type: newMaterial.type,
        title: newMaterial.title,
        file_url: newMaterial.file_url || null,
        notion_url: newMaterial.notion_url || null,
        video_url: newMaterial.video_url || null,
        available_from,
      })
      .select()
      .single();

    if (error) {
      addToast('error', 'Failed to add material');
    } else {
      addToast('success', 'Material added — available on schedule');
      setMaterialsList([...materials, data]);
      setNewMaterial({ type: 'pre_read', title: '', file_url: '', notion_url: '', video_url: '' });
      setShowAddMaterial(false);
    }
    setSaving(false);
  };

  const handleDeleteMaterial = async (id: string) => {
    const { error } = await supabase.from('materials').delete().eq('id', id);
    if (error) {
      addToast('error', 'Failed to delete material');
    } else {
      addToast('success', 'Material removed');
      setMaterialsList(materials.filter(m => m.id !== id));
    }
  };

  // Helper to show user-friendly availability info
  function getAvailabilityLabel(type: MaterialType, sessionDateISO: string): string {
    if (!sessionDateISO) return '';
    if (type === 'pre_read') {
      const d = new Date(sessionDateISO);
      d.setDate(d.getDate() - 7);
      return `Available 1 week before session (${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})`;
    }
    return 'Available right after session ends (12:00 PM)';
  }

  if (loading) {
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
          <h1 className="admin-page-title">Edit Session</h1>
          <p className="admin-page-subtitle">Update session details and manage materials</p>
        </div>
        <button className="btn btn-ghost" onClick={() => router.push('/admin/sessions')}>
          ← Back
        </button>
      </div>

      {/* Session Details Form */}
      <div className="admin-card" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="admin-card-header">
          <h2 className="admin-card-title">Session Details</h2>
        </div>
        <form onSubmit={handleUpdateSession} className="admin-form">
          <div className="form-group">
            <label htmlFor="edit-title" className="form-label">Session Title</label>
            <input
              id="edit-title"
              type="text"
              className="form-input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>

          <div className="admin-form-row">
            <div className="form-group">
              <label htmlFor="edit-number" className="form-label">Session Number</label>
              <input
                id="edit-number"
                type="number"
                className="form-input"
                min="1"
                value={form.session_number}
                onChange={(e) => setForm({ ...form, session_number: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="edit-date" className="form-label">Session Date & Time</label>
              <input
                id="edit-date"
                type="datetime-local"
                className="form-input"
                value={form.session_date}
                onChange={(e) => setForm({ ...form, session_date: e.target.value })}
                required
              />
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                Default: 10:00 AM – 12:00 PM. Changing this will reschedule all materials automatically.
              </p>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="edit-course" className="form-label">Batch</label>
            <select
              id="edit-course"
              className="form-select"
              value={form.course_id}
              onChange={(e) => setForm({ ...form, course_id: e.target.value })}
            >
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: 'var(--accent-primary)' }}
              />
              Published
            </label>
          </div>

          <div className="admin-form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><div className="spinner" /> Saving...</> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Materials Section */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">Materials ({materials.length})</h2>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowAddMaterial(!showAddMaterial)}
          >
            {showAddMaterial ? '✕ Cancel' : '+ Add Material'}
          </button>
        </div>

        {/* Scheduling Info Banner */}
        {sessionDate && (
          <div style={{
            margin: '0 0 16px',
            padding: '10px 14px',
            background: 'rgba(79, 124, 255, 0.08)',
            border: '1px solid rgba(79, 124, 255, 0.2)',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
          }}>
            📅 <strong>Auto-scheduling active:</strong> Pre-reads release 1 week before session. Class materials, worksheets & videos release at 12:00 PM on session day.
          </div>
        )}

        {/* Add Material Form */}
        {showAddMaterial && (
          <div style={{
            padding: 'var(--space-xl)',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-secondary)',
            marginBottom: 'var(--space-lg)',
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>Add New Material</h3>
            <div className="admin-form">
              <div className="admin-form-row">
                <div className="form-group">
                  <label htmlFor="mat-type" className="form-label">Type</label>
                  <select
                    id="mat-type"
                    className="form-select"
                    value={newMaterial.type}
                    onChange={(e) => setNewMaterial({ ...newMaterial, type: e.target.value as MaterialType })}
                  >
                    <option value="pre_read">📖 Pre-read (Notion)</option>
                    <option value="class_material">📄 Class Material (PDF)</option>
                    <option value="worksheet">✍️ Worksheet (PDF)</option>
                    <option value="video">🎬 Video (YouTube)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="mat-title" className="form-label">Title</label>
                  <input
                    id="mat-title"
                    type="text"
                    className="form-input"
                    placeholder="Material title"
                    value={newMaterial.title}
                    onChange={(e) => setNewMaterial({ ...newMaterial, title: e.target.value })}
                  />
                </div>
              </div>

              {/* Availability hint */}
              <div style={{
                padding: '8px 12px',
                background: 'rgba(79, 124, 255, 0.06)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                color: 'var(--accent-primary)',
                marginBottom: '12px',
              }}>
                🕐 {getAvailabilityLabel(newMaterial.type, sessionDate)}
              </div>

              {/* Conditional URL fields */}
              {newMaterial.type === 'pre_read' && (
                <div className="form-group">
                  <label htmlFor="mat-notion" className="form-label">Notion URL</label>
                  <input
                    id="mat-notion"
                    type="url"
                    className="form-input"
                    placeholder="https://notion.so/..."
                    value={newMaterial.notion_url}
                    onChange={(e) => setNewMaterial({ ...newMaterial, notion_url: e.target.value })}
                  />
                </div>
              )}

              {(newMaterial.type === 'class_material' || newMaterial.type === 'worksheet') && (
                <div className="form-group">
                  <label htmlFor="mat-file" className="form-label">File URL (PDF)</label>
                  <input
                    id="mat-file"
                    type="url"
                    className="form-input"
                    placeholder="https://storage.example.com/file.pdf"
                    value={newMaterial.file_url}
                    onChange={(e) => setNewMaterial({ ...newMaterial, file_url: e.target.value })}
                  />
                </div>
              )}

              {newMaterial.type === 'video' && (
                <div className="form-group">
                  <label htmlFor="mat-video" className="form-label">YouTube URL</label>
                  <input
                    id="mat-video"
                    type="url"
                    className="form-input"
                    placeholder="https://youtube.com/watch?v=..."
                    value={newMaterial.video_url}
                    onChange={(e) => setNewMaterial({ ...newMaterial, video_url: e.target.value })}
                  />
                </div>
              )}

              <div className="admin-form-actions">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleAddMaterial}
                  disabled={!newMaterial.title || saving}
                >
                  {saving ? 'Processing...' : 'Add Material'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Materials List */}
        {materials.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {materials.map((mat) => (
              <div
                key={mat.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '12px 16px',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-primary)',
                }}
              >
                <span style={{ fontSize: '20px' }}>{getMaterialTypeIcon(mat.type)}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>{mat.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    {getMaterialTypeLabel(mat.type)} · Releases {formatDate(mat.available_from)}
                  </div>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleDeleteMaterial(mat.id)}
                  style={{ color: 'var(--error)' }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state" style={{ padding: '32px' }}>
            <div className="empty-state-icon">📭</div>
            <p className="empty-state-text">No materials added yet. Click &quot;Add Material&quot; to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
