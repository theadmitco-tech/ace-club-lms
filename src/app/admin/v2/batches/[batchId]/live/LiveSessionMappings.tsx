'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { V2Publication } from '@/lib/v2Publications';
import { setLiveMappingAction } from './actions';
import styles from '../../../templates/templates.module.css';
export default function LiveSessionMappings({ publication, mappings }: { publication: V2Publication; mappings: { eventKey: string; sessionKey: string; publicationRevision: number }[] }) {
  const router = useRouter();
  const [choices, setChoices] = useState<Record<string, string>>({}), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  async function save(eventKey: string, sessionKey: string) {
    setBusy(true); setMessage('');
    try {
      const result = await setLiveMappingAction({ batchId: publication.batchId, eventKey, sessionKey, publicationRevision: publication.revision });
      setMessage(result.status === 'success' ? 'Live class mapped to its published course session.' : result.message);
      if (result.status === 'success') router.refresh();
    } catch { setMessage('The mapping could not be confirmed. Reload before retrying.'); }
    finally { setBusy(false); }
  }
  return <section className={styles.card}><h2>Link live classes to course sessions</h2><p>Each live class needs an explicit session in the same subject before completion. That session retains its materials while feedback is due. Titles are never matched automatically.</p>
    {message && <p role="status">{message}</p>}
    <ul className={styles.list}>{publication.events.filter(event => event.kind === 'live').map(event => {
      const saved = mappings.find(m => m.eventKey === event.key && m.publicationRevision === publication.revision);
      const value = choices[event.key] ?? saved?.sessionKey ?? '';
      return <li className={styles.event} key={event.key}><label htmlFor={`mapping-${event.key}`}>{event.title}</label><select id={`mapping-${event.key}`} value={value} disabled={busy} onChange={e => setChoices(current => ({ ...current, [event.key]: e.target.value }))}><option value="">Choose the corresponding session</option>{(publication.sessions ?? []).filter(session => session.section === event.section).map(session => <option key={session.key} value={session.key}>{session.title}</option>)}</select>
        <button className="btn btn-secondary" type="button" disabled={busy || !value || value === saved?.sessionKey} onClick={() => save(event.key, value)}>Confirm session mapping</button>{saved && <small>Mapping confirmed for this publication.</small>}
      </li>;
    })}</ul>
  </section>;
}
