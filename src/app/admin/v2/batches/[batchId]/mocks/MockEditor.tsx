'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { V2BatchMock } from '@/lib/server/v2Mocks';
import { TimeSelect } from '../../TimeSelect';
import { saveMockAction, deleteMockAction } from './actions';
import styles from '../batchPage.module.css';

const IST = 'Asia/Kolkata';
type Draft = { id: string | null; title: string; date: string; start: string; end: string; testUrl: string; instructions: string };
const blank: Draft = { id: null, title: '', date: '', start: '10:00', end: '', testUrl: '', instructions: '' };

function istParts(iso: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: IST, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date(iso)).map(part => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}
const istInstant = (date: string, time: string) => `${date}T${time}:00+05:30`;
const dayLabel = (iso: string) => new Intl.DateTimeFormat('en-IN', { timeZone: IST, day: 'numeric', month: 'short' }).format(new Date(iso));
const timeLabel = (iso: string) => new Intl.DateTimeFormat('en-IN', { timeZone: IST, weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));

/** Add, edit and remove one batch's mock tests. Saving goes through the server and the database's Admin checks. */
export default function MockEditor({ batchId, mocks }: { batchId: string; mocks: V2BatchMock[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(blank);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
  const [removing, setRemoving] = useState<string | null>(null);
  const set = (change: Partial<Draft>) => { setDraft(current => ({ ...current, ...change })); setError(''); };
  const edit = (mock: V2BatchMock) => {
    const start = istParts(mock.startsAt);
    setDraft({ id: mock.id, title: mock.title, date: start.date, start: start.time, end: mock.endsAt ? istParts(mock.endsAt).time : '', testUrl: mock.testUrl ?? '', instructions: mock.instructions });
    setMessage(''); setError('');
  };

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.date) { setError('Choose the mock’s date.'); return; }
    setBusy(true); setMessage(''); setError('');
    try {
      const result = await saveMockAction({ batchId, id: draft.id, title: draft.title, startsAt: istInstant(draft.date, draft.start),
        endsAt: draft.end ? istInstant(draft.date, draft.end) : null, testUrl: draft.testUrl, instructions: draft.instructions });
      if (result.status === 'success') { setMessage(draft.id ? 'Mock updated.' : 'Mock added. Enrolled students can see it now.'); setDraft(blank); router.refresh(); }
      else setError(result.message);
    } catch { setError('The mock could not be saved. Please try again.'); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    setBusy(true); setMessage(''); setError('');
    try {
      if (await deleteMockAction(batchId, id)) { setMessage('Mock removed.'); if (draft.id === id) setDraft(blank); router.refresh(); }
      else setError('The mock could not be removed. Reload and try again.');
    } catch { setError('The mock could not be removed. Reload and try again.'); }
    finally { setBusy(false); setRemoving(null); }
  }

  return <>
    {message && <p role="status" className={styles.notice}>{message}</p>}
    <section className={styles.panel} aria-labelledby="mock-list-title">
      <div className={styles.panelHead}><h2 id="mock-list-title">Scheduled mocks</h2></div>
      {!mocks.length ? <p className={styles.panelIntro}>No mocks yet. Add the first one below.</p>
        : <ul className={styles.classList}>{mocks.map(mock => <li key={mock.id} className={styles.classRow} data-state={draft.id === mock.id ? 'linked' : undefined}>
          <div className={styles.classWhen}><strong>{dayLabel(mock.startsAt)}</strong><span>{timeLabel(mock.startsAt)}</span></div>
          <div className={styles.classMain}><strong>{mock.title}</strong><p className={styles.muted}>{mock.testUrl ? 'Test link added' : 'No test link yet'}{mock.instructions ? ' · Instructions added' : ''}</p></div>
          <div className={styles.classAction}>
            {removing === mock.id ? <>
              <button type="button" className={styles.secondaryAction} disabled={busy} onClick={() => remove(mock.id)}>Yes, remove</button>
              <button type="button" className={styles.secondaryAction} disabled={busy} onClick={() => setRemoving(null)}>Keep</button>
            </> : <>
              <button type="button" className={styles.secondaryAction} disabled={busy} onClick={() => edit(mock)} aria-label={`Edit ${mock.title}`}>Edit</button>
              <button type="button" className={styles.secondaryAction} disabled={busy} onClick={() => setRemoving(mock.id)} aria-label={`Remove ${mock.title}`}>Remove</button>
            </>}
          </div>
        </li>)}</ul>}
    </section>

    <form className={styles.panel} onSubmit={save} aria-labelledby="mock-form-title">
      <div className={styles.panelHead}><h2 id="mock-form-title">{draft.id ? 'Edit mock' : 'Add a mock'}</h2></div>
      <div className={styles.mockForm}>
        <label className={styles.mockWide}><span className={styles.fieldLabel}>Name</span><input required maxLength={160} value={draft.title} placeholder="Mock 1 · Full-length test" onChange={event => set({ title: event.target.value })} /></label>
        <label><span className={styles.fieldLabel}>Date</span><input type="date" required value={draft.date} onChange={event => set({ date: event.target.value })} /></label>
        <TimeSelect label="Starts (IST)" value={draft.start} onChange={value => set({ start: value })} required />
        <TimeSelect label="Ends (IST, optional)" value={draft.end} onChange={value => set({ end: value })} />
        <label className={styles.mockWide}><span className={styles.fieldLabel}>Test link (optional)</span><input type="url" inputMode="url" placeholder="https://" value={draft.testUrl} onChange={event => set({ testUrl: event.target.value })} /></label>
        <label className={styles.mockWide}><span className={styles.fieldLabel}>Instructions for students (optional)</span><textarea rows={3} maxLength={2000} value={draft.instructions} placeholder="For example: join 10 minutes early with a quiet room and a working webcam." onChange={event => set({ instructions: event.target.value })} /></label>
      </div>
      {error && <p role="alert" className={styles.alert}>{error}</p>}
      <div className={styles.mockActions}>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : draft.id ? 'Save changes' : 'Add mock'}</button>
        {draft.id && <button type="button" className={styles.secondaryAction} disabled={busy} onClick={() => setDraft(blank)}>Cancel editing</button>}
      </div>
    </form>
  </>;
}
