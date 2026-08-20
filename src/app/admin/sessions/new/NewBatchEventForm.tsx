'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveEventAction } from '../actions';

export default function NewBatchEventForm({ course }: { course: { id: string; name: string; scheduleRevision: number } }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const [form, setForm] = useState({ title: '', eventType: 'live_class', sectionKey: 'programme', startsAt: '', durationMinutes: '60', instructor: '', venue: '', reportingTime: '', instructions: '', isPublished: false });
  const update = (next: Partial<typeof form>) => { setForm((current) => ({ ...current, ...next })); setReviewed(false); };

  function save() {
    startTransition(async () => {
      const startsAt = new Date(`${form.startsAt}:00+05:30`);
      if (Number.isNaN(startsAt.valueOf())) { setError('Choose a valid future date and time.'); return; }
      const result = await saveEventAction({
        courseId: course.id, sessionId: null, expectedRevision: course.scheduleRevision,
        title: form.title, eventType: form.eventType, sectionKey: form.sectionKey,
        startsAt: startsAt.toISOString(), durationMinutes: Number(form.durationMinutes),
        instructor: form.instructor, venue: form.venue, reportingTime: form.reportingTime,
        instructions: form.instructions, isPublished: form.isPublished,
      });
      if (result.status === 'error') setError(result.message);
      else router.push('/admin/sessions');
    });
  }

  return <div className="animate-fade-in">
    <div className="admin-page-header"><div><h1 className="admin-page-title">Add extra event</h1><p className="admin-page-subtitle">{course.name} only. The reusable template is unchanged.</p></div></div>
    <div className="admin-card"><div className="admin-form">
      <div className="form-group"><label className="form-label" htmlFor="event-title">Title</label><input id="event-title" className="form-input" value={form.title} onChange={(e) => update({ title: e.target.value })} /></div>
      <div className="admin-form-row">
        <div className="form-group"><label className="form-label" htmlFor="event-type">Event type</label><select id="event-type" className="form-select" value={form.eventType} onChange={(e) => update({ eventType: e.target.value })}>{['live_class','mock','orientation','break','support'].map((value) => <option key={value} value={value}>{value.replace('_', ' ')}</option>)}</select></div>
        <div className="form-group"><label className="form-label" htmlFor="event-section">Section</label><select id="event-section" className="form-select" value={form.sectionKey} onChange={(e) => update({ sectionKey: e.target.value })}>{[['programme','Programme'],['va','Verbal'],['qa','Quant'],['di','Data Insights']].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      </div>
      <div className="admin-form-row"><div className="form-group"><label className="form-label" htmlFor="event-start">Start (IST)</label><input id="event-start" type="datetime-local" className="form-input" value={form.startsAt} onChange={(e) => update({ startsAt: e.target.value })} /></div><div className="form-group"><label className="form-label" htmlFor="event-duration">Duration (minutes)</label><input id="event-duration" type="number" min="15" max="720" className="form-input" value={form.durationMinutes} onChange={(e) => update({ durationMinutes: e.target.value })} /></div></div>
      <div className="admin-form-row"><div className="form-group"><label className="form-label" htmlFor="event-instructor">Instructor</label><input id="event-instructor" className="form-input" value={form.instructor} onChange={(e) => update({ instructor: e.target.value })} /></div><div className="form-group"><label className="form-label" htmlFor="event-venue">Venue</label><input id="event-venue" className="form-input" value={form.venue} onChange={(e) => update({ venue: e.target.value })} /></div></div>
      <div className="form-group"><label className="form-label" htmlFor="event-instructions">Instructions (optional)</label><textarea id="event-instructions" className="form-input" value={form.instructions} onChange={(e) => update({ instructions: e.target.value })} /></div>
      <label className="form-label"><input type="checkbox" checked={form.isPublished} onChange={(e) => update({ isPublished: e.target.checked })} /> Published</label>
      {error && <p role="alert" style={{ color: 'var(--error)' }}>{error}</p>}
      {reviewed && <div role="status" className="admin-card" style={{ padding: 16 }}><strong>Consequence review</strong><p>One event will be appended only to {course.name}. No template, other batch, recording, Session material, enrollment or tracker changes.</p></div>}
      <div className="admin-form-actions"><button className="btn btn-secondary" type="button" onClick={() => router.back()}>Cancel</button><button className="btn btn-secondary" type="button" onClick={() => setReviewed(true)}>Review consequences</button><button className="btn btn-primary" type="button" disabled={!reviewed || pending} onClick={save}>{pending ? 'Adding…' : 'Add event'}</button></div>
    </div></div>
  </div>;
}
