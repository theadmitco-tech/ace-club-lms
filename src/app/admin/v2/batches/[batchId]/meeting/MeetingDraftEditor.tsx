'use client';

import { useRef, useState, type FormEvent } from 'react';
import { DraftRecoveryNotice, useDraftRecovery } from '@/components/DraftRecovery';
import { isMeetingWorkspace, type MeetingWorkspace } from '@/lib/v2WorkspaceRecovery';
import { AdminDraftLink as Link, useAdminDraftGuard } from '@/components/AdminDraftNavigation';
import { isV2MeetingUrl, validateV2MeetingInput, type V2MeetingDraft, type V2MeetingInput, type V2MeetingLink } from '@/lib/v2Meetings';
import { saveMeetingDraftAction } from './actions';
import styles from '../batchPage.module.css';

/** Accepts a pasted Meet URL (with tracking parameters) or a bare code and returns the canonical form when possible. */
function normalizeMeetLink(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  const code = raw.match(/^(?:https?:\/\/)?(?:meet\.google\.com\/)?([a-z]{3}-[a-z]{4}-[a-z]{3})(?:[/?#].*)?$/i);
  return code ? `https://meet.google.com/${code[1].toLowerCase()}` : raw;
}
const dateLabel = (date: string | null) => date ? new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${date}T00:00:00Z`)) : 'No date';
const timeLabel = (time: string | null) => {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
};

export default function MeetingDraftEditor({ draft, ownerId, published = false }: { draft: V2MeetingDraft; ownerId: string; published?: boolean }) {
  const [links, setLinks] = useState(draft.links);
  const [revision, setRevision] = useState(draft.revision);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [pendingSave, setPendingSave] = useState<V2MeetingInput | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<'saved' | 'recovered' | null>(null);
  const busy = useRef(false);
  const recovery = useDraftRecovery<MeetingWorkspace>(ownerId, `v2-meeting:${draft.batch.id}`, isMeetingWorkspace);
  useAdminDraftGuard(dirty || pending);
  const events = draft.batch.events.filter(event => event.kind !== 'outline');
  const linkFor = (key: string) => links.find(link => link.key === key)?.url ?? '';
  const filled = events.filter(event => isV2MeetingUrl(linkFor(event.key)) && linkFor(event.key)).length;
  const firstValid = events.map(event => linkFor(event.key)).find(url => url && isV2MeetingUrl(url));
  const empty = events.filter(event => !linkFor(event.key)).length;

  function restore() {
    const recovered = recovery.recovered;
    if (!recovered) return;
    if (recovered.batchRevision !== draft.batch.revision) {
      setError('The batch schedule changed. Reload current links and review your changes against the latest schedule.');
      return;
    }
    setLinks(recovered.links); setRevision(recovered.revision); setRequestId(recovered.requestId);
    setPendingSave(recovered.review); setDirty(true); recovery.acknowledge();
  }

  function update(next: V2MeetingLink[]) {
    const nextRequest = crypto.randomUUID();
    recovery.remember({ batchRevision: draft.batch.revision, revision, requestId: nextRequest, links: next, review: null });
    setLinks(next); setRequestId(nextRequest); setPendingSave(null); setDirty(true); setError(''); setSaved(null);
  }

  async function save(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (busy.current) return;
    // A save that was interrupted is retried with exactly the same request, so it cannot apply twice.
    let input = pendingSave;
    if (!input) {
      if (!dirty || !requestId) return;
      const tidy = links.map(link => ({ ...link, url: link.url === null ? null : normalizeMeetLink(link.url) }));
      input = { batchId: draft.batch.id, batchRevision: draft.batch.revision, expectedRevision: revision, requestId, links: tidy };
      const invalid = validateV2MeetingInput(input);
      if (invalid) { setLinks(tidy); setError('Use a Google Meet link such as https://meet.google.com/abc-defg-hij, or leave the class empty.'); return; }
      setLinks(tidy); setPendingSave(input);
      recovery.remember({ batchRevision: draft.batch.revision, revision, requestId, links: tidy, review: input });
    }
    busy.current = true; setPending(true); setError('');
    try {
      const result = await saveMeetingDraftAction(input);
      if (result.status === 'error') { setError(result.message); return; }
      recovery.forget();
      setRevision(result.receipt.revision); setDirty(false); setPendingSave(null); setRequestId(null);
      setSaved(result.receipt.replayed ? 'recovered' : 'saved');
    } catch {
      setError('Save confirmation was interrupted. Select Save links again to recover the same save.');
    } finally { busy.current = false; setPending(false); }
  }

  return <form onSubmit={save} aria-busy={pending} noValidate>
    <Link className={styles.back} href={`/admin/v2/batches?batch=${draft.batch.id}`} prefetch={false}>← Back to batch</Link>
    <header className={styles.header}>
      <h1 className="admin-page-title">{draft.batch.title}</h1>
      <p className="admin-page-subtitle">Add the Google Meet link for each live class. Only students with a live seat can open them, once the batch is published. All times IST.</p>
    </header>
    <DraftRecoveryNotice available={!!recovery.recovered} unavailable={recovery.unavailable} onRestore={restore} onDiscard={recovery.forget} />
    <section className={styles.panel} aria-labelledby="meet-links-heading">
      <div className={styles.panelHead}><h2 id="meet-links-heading">Meet links</h2><span className={styles.count}>{filled} of {events.length} added</span></div>
      <p className={styles.panelIntro}>Paste a link or just the meeting code. You can leave a class empty and add its link later.</p>
      {saved && <p role="status" className={styles.notice}>{saved === 'recovered' ? 'Previous save recovered. Reload the page before making more changes.' : published
        ? <>Links saved. Students get them after you <Link href={`/admin/v2/batches?batch=${draft.batch.id}&review=1`} prefetch={false}>publish the batch again</Link>.</>
        : 'Links saved. Registered students get them when the batch is published.'}</p>}
      {error && <p role="alert" className={styles.alert}>{error}</p>}
      {!events.length ? <p className={styles.muted}>This batch has no live classes yet.</p> : <fieldset className={styles.meetFields} disabled={pending || !!recovery.recovered}>
        <legend className={styles.visuallyHidden}>Google Meet links</legend>
        <ul className={styles.classList}>{events.map(event => {
          const value = linkFor(event.key);
          const invalid = !!value && !isV2MeetingUrl(normalizeMeetLink(value));
          return <li key={event.key} className={styles.classRow}>
            <div className={styles.classWhen}><strong>{dateLabel(event.localDate)}</strong><span>{timeLabel(event.localStartTime)}</span></div>
            <div className={styles.classMain}>
              <label htmlFor={`${event.key}-meet`}><strong>{event.title}</strong></label>
              <input id={`${event.key}-meet`} className={styles.meetInput} type="url" inputMode="url" autoComplete="off" spellCheck={false} placeholder="https://meet.google.com/abc-defg-hij"
                aria-invalid={invalid || undefined} aria-describedby={invalid ? `${event.key}-meet-error` : undefined} value={value}
                onChange={e => update(links.map(link => link.key === event.key ? { ...link, url: e.target.value || null } : link))}
                onBlur={e => { const tidy = normalizeMeetLink(e.target.value); if (tidy !== (e.target.value || null)) update(links.map(link => link.key === event.key ? { ...link, url: tidy } : link)); }} />
              {invalid && <p id={`${event.key}-meet-error`} className={styles.fieldError}>This isn’t a Google Meet link.</p>}
            </div>
            <div className={styles.classAction}>{value && !invalid ? <span className={styles.badge} data-tone="ok">Added</span> : !value ? <span className={styles.badge}>Empty</span> : null}</div>
          </li>;
        })}</ul>
        {firstValid && empty > 0 && events.length > 1 && <button type="button" className={styles.linkButton} onClick={() => update(links.map(link => link.url ? link : { ...link, url: firstValid }))}>
          Use {firstValid.replace('https://', '')} for the {empty} empty {empty === 1 ? 'class' : 'classes'}</button>}
        <div className={styles.saveBar}>
          <span className={styles.muted} role="status" aria-live="polite">{dirty ? 'Unsaved changes' : saved ? 'All changes saved' : ''}</span>
          <button type="submit" className="btn btn-primary" disabled={(!dirty && !pendingSave) || pending}>{pending ? 'Saving…' : 'Save links'}</button>
        </div>
      </fieldset>}
    </section>
  </form>;
}
