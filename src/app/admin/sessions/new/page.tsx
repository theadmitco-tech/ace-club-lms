'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSession, getCourses } from '@/lib/mockData';

export default function NewSessionPage() {
  const router = useRouter();
  const courses = getCourses();
  const [form, setForm] = useState({
    title: '',
    session_number: '',
    session_date: '',
    course_id: courses[0]?.id || '',
    is_published: true,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    // Simulate delay
    await new Promise(r => setTimeout(r, 500));

    createSession({
      title: form.title,
      session_number: parseInt(form.session_number),
      session_date: new Date(form.session_date).toISOString(),
      course_id: form.course_id,
      is_published: form.is_published,
    });

    router.push('/admin/sessions');
  };

  return (
    <div className="animate-fade-in">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">New Session</h1>
          <p className="admin-page-subtitle">Create a new course session</p>
        </div>
        <button className="btn btn-ghost" onClick={() => router.push('/admin/sessions')}>
          ← Back
        </button>
      </div>

      <div className="admin-card">
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-group">
            <label htmlFor="session-title" className="form-label">Session Title</label>
            <input
              id="session-title"
              type="text"
              className="form-input"
              placeholder="e.g., Foundations of Arithmetic & Number Properties"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>

          <div className="admin-form-row">
            <div className="form-group">
              <label htmlFor="session-number" className="form-label">Session Number</label>
              <input
                id="session-number"
                type="number"
                className="form-input"
                placeholder="1"
                min="1"
                value={form.session_number}
                onChange={(e) => setForm({ ...form, session_number: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="session-date" className="form-label">Session Date</label>
              <input
                id="session-date"
                type="datetime-local"
                className="form-input"
                value={form.session_date}
                onChange={(e) => setForm({ ...form, session_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="session-course" className="form-label">Course</label>
            <select
              id="session-course"
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
              Publish immediately
            </label>
          </div>

          <div className="admin-form-actions">
            <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
              {saving ? (
                <>
                  <div className="spinner" />
                  Creating...
                </>
              ) : (
                'Create Session'
              )}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => router.push('/admin/sessions')}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
