'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { V2Publication } from '@/lib/v2Publications';
import { suggestV2LiveMappings, type V2LiveMapping } from '@/lib/v2LiveMappingSuggestions';
import { setLiveMappingAction } from './actions';
import styles from '../../../templates/templates.module.css';

type Props = { publication: V2Publication; mappings: V2LiveMapping[]; completedEventKeys?: string[] };
export default function LiveSessionMappings(props: Props) {
  return <MappingEditor key={`${props.publication.batchId}:${props.publication.revision}:${props.publication.state}`} {...props} />;
}

function MappingEditor({ publication, mappings, completedEventKeys }: Props) {
  const router = useRouter();
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const saving = useRef(false);
  const suggestions = suggestV2LiveMappings(publication, mappings);
  const available = publication.state === 'published' && completedEventKeys !== undefined;
  const rows = publication.events.filter(event => event.kind === 'live').map(event => {
    const suggestion = suggestions.find(item => item.eventKey === event.key)!;
    const saved = confirmed[event.key] ?? (suggestion.source === 'confirmed' ? suggestion.sessionKey : '');
    const value = choices[event.key] ?? (saved || suggestion.sessionKey);
    return { event, suggestion, saved, value, completed: completedEventKeys?.includes(event.key) ?? false,
      sessions: (publication.sessions ?? []).filter(session => session.section === event.section) };
  });
  const proposed = rows.filter(row => !row.completed && !row.saved && row.value && row.value === row.suggestion.sessionKey
    && (row.suggestion.source === 'previous' || row.suggestion.source === 'title'));

  async function save(selected: { event: { key: string }; value: string }[]) {
    if (saving.current || !available || !selected.length) return;
    saving.current = true; setBusy(true); setMessage('');
    let savedCount = 0;
    try {
      for (const row of selected) {
        setErrors(current => ({ ...current, [row.event.key]: '' }));
        try {
          const result = await setLiveMappingAction({ batchId: publication.batchId, eventKey: row.event.key, sessionKey: row.value, publicationRevision: publication.revision });
          if (result.status === 'success') {
            savedCount += 1;
            setConfirmed(current => ({ ...current, [row.event.key]: row.value }));
          } else setErrors(current => ({ ...current, [row.event.key]: result.message }));
        } catch {
          setErrors(current => ({ ...current, [row.event.key]: 'The link could not be confirmed. Retry this link or reload the batch.' }));
        }
      }
      const failedCount = selected.length - savedCount;
      setMessage(`${savedCount} ${savedCount === 1 ? 'link' : 'links'} confirmed.${failedCount ? ` ${failedCount} ${failedCount === 1 ? 'link needs' : 'links need'} another attempt. Review the messages below.` : ' Class completion remains a separate action.'}`);
      router.refresh();
    } finally { saving.current = false; setBusy(false); }
  }

  return <section className={styles.card} aria-busy={busy}>
    <h2>Link live classes to course sessions</h2>
    <p>Review the suggested feedback session for each class, then confirm the links. Suggestions use a previous link or a unique matching title in the same subject. Confirming a link does not mark a class complete.</p>
    {!available && <p role="alert">{publication.state !== 'published' ? 'Publish the batch before confirming feedback links.' : 'Class completion status could not be loaded. Reload before confirming feedback links.'}</p>}
    {message && <p role="status">{message}</p>}
    {!!proposed.length && <div className="workflow-actions"><button className="btn btn-primary" type="button" disabled={busy || !available} onClick={() => save(proposed)}>{busy ? 'Confirming links…' : 'Confirm suggested links'}</button><span>{proposed.length} {proposed.length === 1 ? 'suggestion' : 'suggestions'} awaiting confirmation</span></div>}
    <ul className={styles.list}>{rows.map(row => {
      const { event, suggestion, saved, value, completed, sessions } = row;
      if (completed) return <li className={styles.event} key={event.key}><strong>{event.title}</strong><p>Class completed. Its confirmed feedback link cannot be changed.</p></li>;
      if (!sessions.length) return <li className={styles.event} key={event.key}>
        <strong>{event.title}</strong>
        <p>No published course session is available in this class’s subject. Add a session, save and publish the batch, then return here to confirm its feedback session.</p>
        <a className="btn btn-secondary" href={`/admin/v2/batches?batch=${publication.batchId}&outline=1`}>Add a course session</a>
      </li>;
      const hint = saved ? 'Link confirmed for this publication.' : value === suggestion.sessionKey && suggestion.source === 'previous'
        ? 'Previously confirmed for this batch. Review and confirm again for this publication.' : value === suggestion.sessionKey && suggestion.source === 'title'
          ? 'Suggested from a unique matching title. Review before confirming.' : 'Choose the session that should receive feedback for this class.';
      return <li className={styles.event} key={event.key}>
        <label htmlFor={`mapping-${event.key}`}>{event.title}</label>
        <select className="form-input" id={`mapping-${event.key}`} value={value} disabled={busy || !available} aria-describedby={`mapping-help-${event.key}${errors[event.key] ? ` mapping-error-${event.key}` : ''}`} onChange={event => {
          setChoices(current => ({ ...current, [row.event.key]: event.target.value }));
          setErrors(current => ({ ...current, [row.event.key]: '' }));
        }}><option value="">Choose the corresponding session</option>{sessions.map(session => <option key={session.key} value={session.key}>{session.title}</option>)}</select>
        <p id={`mapping-help-${event.key}`}>{saved && value !== saved ? 'A different session is selected. Confirm to replace the saved link.' : hint}</p>
        <button className="btn btn-secondary" type="button" disabled={busy || !available || !value || value === saved} onClick={() => save([row])}>Confirm session mapping</button>
        {errors[event.key] && <p id={`mapping-error-${event.key}`} role="alert" className="workflow-error">{errors[event.key]}</p>}
      </li>;
    })}</ul>
  </section>;
}
