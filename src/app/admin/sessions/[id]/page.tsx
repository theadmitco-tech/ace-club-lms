'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { MaterialType } from '@/lib/types';
import { getMaterialTypeIcon, getMaterialTypeLabel } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';

export default function EditSessionPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;
  
  const supabase = createClient();
  const { addToast } = useAuth();

  const [courses, setCourses] = useState<any[]>([]);
  const [courseName, setCourseName] = useState('');
  const [form, setForm] = useState({
    title: '',
    session_number: '',
    session_date: '',
    course_id: '',
    is_published: true,
  });
  
  const [materials, setMaterialsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  
  const [isUploading, setIsUploading] = useState(false);
  const [newMaterial, setNewMaterial] = useState({
    type: 'pre_read' as MaterialType,
    title: '',
    file_url: '',
    notion_url: '',
    video_url: '',
  });

  const fetchData = async () => {
    setIsLoading(true);
    
    const [
      { data: session },
      { data: materialsData },
      { data: coursesData }
    ] = await Promise.all([
      supabase.from('sessions').select('*, courses(name)').eq('id', sessionId).single(),
      supabase.from('materials').select('*').eq('session_id', sessionId).order('created_at', { ascending: true }),
      supabase.from('courses').select('id, name')
    ]);

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
      setCourseName(session.courses?.name || '');
    }

    if (materialsData) setMaterialsList(materialsData);
    if (coursesData) setCourses(coursesData);
    
    setIsLoading(false);
  };

  useEffect(() => {
    if (sessionId) fetchData();
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { uploadFile } = await import('@/utils/supabase/storage');
      const publicUrl = await uploadFile(file);
      
      if (newMaterial.type === 'video') {
        setNewMaterial({ ...newMaterial, video_url: publicUrl, title: newMaterial.title || file.name });
      } else {
        setNewMaterial({ ...newMaterial, file_url: publicUrl, title: newMaterial.title || file.name });
      }
      addToast('success', 'File uploaded successfully.');
    } catch (err: any) {
      addToast('error', 'Upload failed: ' + err.message);
    }
    setIsUploading(false);
  };

  const handleUpdateSession = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase
      .from('sessions')
      .update({
        title: form.title,
        session_number: Number(form.session_number),
        session_date: new Date(form.session_date).toISOString(),
        course_id: form.course_id,
        is_published: form.is_published,
      })
      .eq('id', sessionId);

    if (error) {
      addToast('error', 'Failed to update session.');
      console.error(error);
    } else {
      addToast('success', 'Session updated.');
      const selectedCourse = courses.find((course) => course.id === form.course_id);
      if (selectedCourse) setCourseName(selectedCourse.name);
    }

    setSaving(false);
  };

  const handleAddMaterial = async () => {
    if (!newMaterial.title) return;

    // Calculate a valid available_from date based on session date to satisfy the DB constraint
    const sessionDateObj = new Date(form.session_date);
    let calculatedDate = new Date(sessionDateObj);
    if (newMaterial.type === 'pre_read') {
      calculatedDate = new Date(calculatedDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      calculatedDate = new Date(calculatedDate.getTime() + 2 * 60 * 60 * 1000);
    }

    const { error } = await supabase.from('materials').insert({
      session_id: sessionId,
      type: newMaterial.type,
      title: newMaterial.title,
      file_url: newMaterial.file_url || null,
      notion_url: newMaterial.notion_url || null,
      video_url: newMaterial.video_url || null,
      available_from: calculatedDate.toISOString() // Hidden from UI but required by schema
    });

    if (error) {
      addToast('error', 'Failed to add material.');
      console.error(error);
    } else {
      addToast('success', 'Material added.');
      setNewMaterial({
        type: 'pre_read',
        title: '',
        file_url: '',
        notion_url: '',
        video_url: '',
      });
      setShowAddMaterial(false);
      fetchData(); // refresh materials list
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    const { error } = await supabase.from('materials').delete().eq('id', id);
    if (error) {
      addToast('error', 'Failed to delete material.');
    } else {
      addToast('success', 'Material deleted.');
      fetchData();
    }
  };

  if (isLoading) {
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
          <h1 className="admin-page-title">{form.title}</h1>
          <p className="admin-page-subtitle">Batch: {courseName || 'Loading...'}</p>
        </div>
        <button className="btn btn-ghost" onClick={() => router.push('/admin/sessions')}>
          ← Back to Schedule
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

              {(newMaterial.type === 'class_material' || newMaterial.type === 'worksheet' || newMaterial.type === 'video') && (
                <div className="form-group">
                  <label htmlFor="mat-upload" className="form-label">
                    {newMaterial.type === 'video' ? 'Upload Video' : 'Upload PDF'}
                  </label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input
                      id="mat-upload"
                      type="file"
                      className="form-input"
                      accept={newMaterial.type === 'video' ? 'video/*' : 'application/pdf'}
                      onChange={handleFileUpload}
                    />
                    {isUploading && <div className="spinner" />}
                  </div>
                  {newMaterial.file_url || newMaterial.video_url ? (
                    <div style={{ fontSize: '11px', color: 'var(--accent-primary)', marginTop: '4px' }}>
                      ✓ File uploaded and ready.
                    </div>
                  ) : (
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                      Or paste a URL below if already hosted elsewhere.
                    </div>
                  )}
                </div>
              )}

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
                    placeholder="https://..."
                    value={newMaterial.file_url}
                    onChange={(e) => setNewMaterial({ ...newMaterial, file_url: e.target.value })}
                  />
                </div>
              )}

              {newMaterial.type === 'video' && (
                <div className="form-group">
                  <label htmlFor="mat-video" className="form-label">Video URL</label>
                  <input
                    id="mat-video"
                    type="url"
                    className="form-input"
                    placeholder="https://..."
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
                  disabled={!newMaterial.title}
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
                    {getMaterialTypeLabel(mat.type)} 
                    {mat.type === 'pre_read' ? ' · Unlocks 1 week before session' : ' · Unlocks right after session'}
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
