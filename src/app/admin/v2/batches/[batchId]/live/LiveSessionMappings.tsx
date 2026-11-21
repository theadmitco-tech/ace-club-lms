'use client';
import { useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { V2Publication } from '@/lib/v2Publications';
import { suggestV2LiveMappings, type V2LiveMapping } from '@/lib/v2LiveMappingSuggestions';
import { setLiveMappingAction } from './actions';
import styles from './live.module.css';

/** `renderAction` lets the operations panel place completion controls in each class row. */
type Props = { publication: V2Publication; mappings: V2LiveMapping[]; completedEventKeys?: string[]; heading?: string; intro?: string;
  renderAction?: (eventKey: string, linked: boolean) => ReactNode };
const when = (startsAt: string | null) => startsAt ? {
  day: new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' }).format(new Date(startsAt)),
  detail: new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(startsAt)),
} : null;
export default function LiveSessionMappings(props: Props) {
  return <MappingEditor key={`${props.publication.batchId}:${props.publication.revision}:${props.publication.state}`} {...props} />;
}

function MappingEditor({ publication, mappings, completedEventKeys, heading = 'Link live classes to course sessions', intro, renderAction }: Props) {
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

  return <section className={styles.panel} aria-busy={busy} aria-labelledby="live-classes-heading">
    <div className={styles.panelHead}><h2 id="live-classes-heading">{heading}</h2></div>
    <p className={styles.panelIntro}>{intro ?? 'Review the suggested feedback session for each class, then confirm the links. Suggestions use a previous link or a unique matching title in the same subject. Confirming a link does not mark a class complete.'}</p>
    {!available && <p role="alert" className={styles.alert}>{publication.state !== 'published' ? 'Publish the batch before confirming feedback links.' : 'Class completion status could not be loaded. Reload before confirming feedback links.'}</p>}
    {message && <p role="status" className={styles.notice}>{message}</p>}
    {!!proposed.length && <div className={styles.bulkBar}><span>{proposed.length} {proposed.length === 1 ? 'suggestion' : 'suggestions'} awaiting confirmation</span><button className="btn btn-primary" type="button" disabled={busy || !available} onClick={() => save(proposed)}>{busy ? 'Confirming links…' : 'Confirm suggested links'}</button></div>}
    <ul className={styles.classList}>{rows.map(row => {
      const { event, suggestion, saved, value, completed, sessions } = row;
      const date = when(event.startsAt);
      const head = <div className={styles.classWhen} aria-hidden={!date || undefined}>{date ? <><strong>{date.day}</strong><span>{date.detail}</span></> : <span>No date</span>}</div>;
      const action = renderAction?.(event.key, !!saved);
      if (completed) return <li className={styles.classRow} data-state="done" key={event.key}>{head}
        <div className={styles.classMain}><strong>{event.title}</strong><p className={styles.muted}>Class completed. Its confirmed feedback link cannot be changed.</p></div>
        <div className={styles.classAction}>{action}</div></li>;
      if (!sessions.length) return <li className={styles.classRow} key={event.key}>{head}
        <div className={styles.classMain}><strong>{event.title}</strong>
          <p className={styles.muted}>No published course session is available in this class’s subject. Add a session, save and publish the batch, then return here to confirm its feedback session.</p></div>
        <div className={styles.classAction}><a className={styles.secondaryAction} href={`/admin/v2/batches?batch=${publication.batchId}&outline=1`}>Add a course session</a></div>
      </li>;
      const hint = saved ? 'Link confirmed for this publication.' : value === suggestion.sessionKey && suggestion.source === 'previous'
        ? 'Previously confirmed for this batch. Review and confirm again for this publication.' : value === suggestion.sessionKey && suggestion.source === 'title'
          ? 'Suggested from a unique matching title. Review before confirming.' : 'Choose the session that should receive feedback for this class.';
      const changed = !!value && value !== saved;
      return <li className={styles.classRow} data-state={saved && !changed ? 'linked' : 'unlinked'} key={event.key}>{head}
        <div className={styles.classMain}>
          <strong>{event.title}</strong>
          <div className={styles.mappingField}>
            <span className={styles.fieldLabel} aria-hidden="true">Feedback session</span>
            <select id={`mapping-${event.key}`} aria-label={event.title} value={value} disabled={busy || !available} aria-describedby={`mapping-help-${event.key}${errors[event.key] ? ` mapping-error-${event.key}` : ''}`} onChange={event => {
              setChoices(current => ({ ...current, [row.event.key]: event.target.value }));
              setErrors(current => ({ ...current, [row.event.key]: '' }));
            }}><option value="">Choose the corresponding session</option>{sessions.map(session => <option key={session.key} value={session.key}>{session.title}</option>)}</select>
            {changed && <button className={styles.secondaryAction} type="button" disabled={busy || !available} onClick={() => save([row])}>Confirm session mapping</button>}
          </div>
          <p id={`mapping-help-${event.key}`} className={styles.muted}>{saved && value !== saved ? 'A different session is selected. Confirm to replace the saved link.' : hint}</p>
          {errors[event.key] && <p id={`mapping-error-${event.key}`} role="alert" className="workflow-error">{errors[event.key]}</p>}
        </div>
        <div className={styles.classAction}>{action}</div>
      </li>;
    })}</ul>
  </section>;
}
