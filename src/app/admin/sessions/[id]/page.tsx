'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getSession, updateSession, getMaterials, createMaterial, updateMaterial, deleteMaterial, getCourses } from '@/lib/mockData';
import { Material, MaterialType } from '@/lib/types';
import { formatDate, getMaterialTypeIcon, getMaterialTypeLabel } from '@/lib/utils';

export default function EditSessionPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;
  const courses = getCourses();

  const [form, setForm] = useState({
    title: '',
    session_number: '',
    session_date: '',
    course_id: '',
    is_published: true,
  });
  const [materials, setMaterialsList] = useState<Material[]>([]);
  const [saving, setSaving] = useState(false);
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [newMaterial, setNewMaterial] = useState({
    type: 'pre_read' as MaterialType,
    title: '',
    file_url: '',
    notion_url: '',
    video_url: '',
    available_from: '',
  });
  const [editingMaterial, setEditingMaterial] = useState<string | null>(null);

  useEffect(() => {
    const session = getSession(sessionId);
    if (session) {
      // Convert session_date to local datetime-local format
      const dt = new Date(session.session_date);
      const localDt = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      
      setForm({
        title: session.title,
        session_number: String(session.session_number),
        session_date: localDt,
        course_id: session.course_id,
        is_published: session.is_published,
      });
      setMaterialsList(getMaterials(sessionId));
    }
  }, [sessionId]);

  const handleUpdateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));

    updateSession(sessionId, {
      title: form.title,
      session_number: parseInt(form.session_number),
      session_date: new Date(form.session_date).toISOString(),
      course_id: form.course_id,
      is_published: form.is_published,
    });

    setSaving(false);
    router.push('/admin/sessions');
  };

  const handleAddMaterial = () => {
    createMaterial({
      session_id: sessionId,
      type: newMaterial.type,
      title: newMaterial.title,
      file_url: newMaterial.file_url || undefined,
      notion_url: newMaterial.notion_url || undefined,
      video_url: newMaterial.video_url || undefined,
      available_from: new Date(newMaterial.available_from).toISOString(),
    });
    setMaterialsList(getMaterials(sessionId));
    setNewMaterial({
      type: 'pre_read',
      title: '',
      file_url: '',
      notion_url: '',
      video_url: '',
      available_from: '',
    });
    setShowAddMaterial(false);
  };

  const handleDeleteMaterial = (id: string) => {
    deleteMaterial(id);
    setMaterialsList(getMaterials(sessionId));
  };

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
              <label htmlFor="edit-date" className="form-label">Session Date</label>
              <input
                id="edit-date"
                type="datetime-local"
                className="form-input"
                value={form.session_date}
                onChange={(e) => setForm({ ...form, session_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="edit-course" className="form-label">Course</label>
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
                    <option value="pre_read">📖 Pre-read</option>
                    <option value="class_material">📄 Class Material</option>
                    <option value="worksheet">✍️ Worksheet</option>
                    <option value="video">🎬 Video</option>
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
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    In production, this will be a file upload. For now, enter a URL.
                  </span>
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

              <div className="form-group">
                <label htmlFor="mat-available" className="form-label">Available From</label>
                <input
                  id="mat-available"
                  type="datetime-local"
                  className="form-input"
                  value={newMaterial.available_from}
                  onChange={(e) => setNewMaterial({ ...newMaterial, available_from: e.target.value })}
                />
              </div>

              <div className="admin-form-actions">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleAddMaterial}
                  disabled={!newMaterial.title || !newMaterial.available_from}
                >
                  Add Material
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
                    {getMaterialTypeLabel(mat.type)} · Available from {formatDate(mat.available_from)}
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
