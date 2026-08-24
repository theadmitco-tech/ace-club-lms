'use client';
import { useState } from 'react';

export function MockNoteEditor({ attemptId, attemptItemId, initialNote }: { attemptId: string; attemptItemId: string; initialNote: string }) {
  const [note, setNote] = useState(initialNote);
  const [saved, setSaved] = useState(initialNote);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function save() {
    setBusy(true); setMessage('');
    const response = await fetch(`/api/student/mock-attempts/${attemptId}/notes`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ attemptItemId, note }) });
    const result = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) { setMessage(result.error ?? 'Could not save this note.'); return; }
    setSaved(note.trim()); setNote(note.trim()); setMessage('Note saved.');
  }
  return <div className="mock-result-note"><label htmlFor={`note-${attemptItemId}`}>Your note</label><textarea id={`note-${attemptItemId}`} maxLength={4000} onChange={(event) => setNote(event.target.value)} placeholder="Add a private note about this question…" rows={3} value={note}/><div><span aria-live="polite">{message}</span><button disabled={busy || note.trim() === saved} onClick={save} type="button">{busy ? 'Saving…' : 'Save note'}</button></div></div>;
}
