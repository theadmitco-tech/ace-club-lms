'use client';

import { useRef, useState, type FormEvent } from 'react';
import { DraftRecoveryNotice, useDraftRecovery } from '@/components/DraftRecovery';
import { isTemplateWorkspace, type TemplateWorkspace } from '@/lib/v2WorkspaceRecovery';
import { useAdminDraftGuard } from '@/components/AdminDraftNavigation';
import { useRouter } from 'next/navigation';
import { V2_TEMPLATE_PRODUCTS, validateV2TemplateSave, type V2TemplateDraft, type V2TemplateEvent } from '@/lib/v2Templates';
import type { V2ProductCode, V2Section } from '@/lib/v2Products';
import { saveTemplateDraftAction } from './actions';
import styles from './templates.module.css';

export default function TemplateEditor({ templates, ownerId }: { templates: V2TemplateDraft[]; ownerId: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<V2TemplateDraft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const retry = useRef<{ payload: string; requestId: string } | null>(null);
  const inFlight = useRef(false);

  const recovery = useDraftRecovery<TemplateWorkspace>(ownerId, 'v2-template', isTemplateWorkspace);
  useAdminDraftGuard(dirty || pending);

  function restore() {
    if (!recovery.recovered) return;
    setDraft(recovery.recovered.draft);
    retry.current = recovery.recovered.retry;
    setDirty(true);
    recovery.acknowledge();
  }

  function open(next: V2TemplateDraft) {
    if (inFlight.current || ((dirty || recovery.recovered) && !window.confirm('Discard unsaved template edits?'))) return;
    recovery.forget();
    setDraft(structuredClone(next));
    setDirty(false);
    setError('');
    setMessage('');
    retry.current = null;
  }

  function newDraft(productCode: V2ProductCode) {
    open({ id: crypto.randomUUID(), productCode, revision: 0, document: {
      title: '', summary: '', durationDays: V2_TEMPLATE_PRODUCTS[productCode].suggestedDays, events: [],
    } });
  }

  function change(next: V2TemplateDraft) {
    retry.current = null;
    recovery.remember({ draft: next, retry: null });
    setDraft(next);
    setDirty(true);
    setError('');
    setMessage('');
  }

  function updateEvent(key: string, patch: Partial<V2TemplateEvent>) {
    if (!draft) return;
    change({ ...draft, document: { ...draft.document, events: draft.document.events.map((event) => event.key === key ? { ...event, ...patch } : event) } });
  }

  function addEvent(kind: 'live' | 'outline') {
    if (!draft) return;
    change({ ...draft, document: { ...draft.document, events: [...draft.document.events, {
      key: crypto.randomUUID(), title: '', section: V2_TEMPLATE_PRODUCTS[draft.productCode].sections[0],
      kind, dayOffset: kind === 'live' ? 0 : null, localStartTime: kind === 'live' ? '18:00' : null, durationMinutes: kind === 'live' ? 60 : null, capacity: 8, instructor: '',
    }] } });
  }

  function moveEvent(index: number, direction: -1 | 1) {
    if (!draft || inFlight.current) return;
    const destination = index + direction;
    if (destination < 0 || destination >= draft.document.events.length) return;
    const events = [...draft.document.events];
    [events[index], events[destination]] = [events[destination], events[index]];
    change({ ...draft, document: { ...draft.document, events } });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || inFlight.current) return;
    const payload = JSON.stringify(draft);
    if (!retry.current || retry.current.payload !== payload) retry.current = { payload, requestId: crypto.randomUUID() };
    const input = { id: draft.id, productCode: draft.productCode, expectedRevision: draft.revision,
      requestId: retry.current.requestId, document: draft.document };
    const invalid = validateV2TemplateSave(input);
    if (invalid) { setError(invalid); return; }
    recovery.remember({ draft, retry: retry.current });
    inFlight.current = true;
    setPending(true);
    setError('');
    setMessage('');
    try {
      const result = await saveTemplateDraftAction(input);
      if (result.status === 'error') { setError(result.message); return; }
      recovery.forget();
      setDraft(result.template);
      setDirty(false);
      retry.current = null;
      setMessage(`Draft revision ${result.template.revision} saved${result.replayed ? ' (previous submission recovered)' : ''}.`);
      router.refresh();
    } catch {
      setError('Save confirmation was interrupted. Retry without editing to recover the same submission.');
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return (
    <div className={styles.workspace}>
      <DraftRecoveryNotice available={!!recovery.recovered} unavailable={recovery.unavailable} onRestore={restore} onDiscard={recovery.forget} />
      <section className={styles.card} aria-labelledby="template-list-heading">
        <h2 id="template-list-heading">Saved drafts</h2>
        {templates.length === 0 ? <p>No templates have been created.</p> : <ul className={styles.list}>
          {templates.map((item) => <li key={item.id}>
            <button type="button" className="btn btn-secondary" disabled={pending} onClick={() => open(item)}>
              {item.document.title} · {V2_TEMPLATE_PRODUCTS[item.productCode].label} · revision {item.revision}
            </button>
          </li>)}
        </ul>}
        <h3>Create a template</h3>
        <div className={styles.buttons}>
          {(Object.entries(V2_TEMPLATE_PRODUCTS) as [V2ProductCode, typeof V2_TEMPLATE_PRODUCTS[V2ProductCode]][]).map(([code, product]) => (
            <button key={code} type="button" className="btn btn-secondary" disabled={pending} onClick={() => newDraft(code)}>{product.label}</button>
          ))}
        </div>
        <p>A saved draft does not create a live batch or change student access.</p>
      </section>

      {draft && <form className={styles.card} onSubmit={save} aria-busy={pending}>
        <h2>{draft.revision === 0 ? 'New template' : `Edit draft · revision ${draft.revision}`}</h2>
        <p><strong>{V2_TEMPLATE_PRODUCTS[draft.productCode].label}</strong> · Included sections: {V2_TEMPLATE_PRODUCTS[draft.productCode].sections.join(', ')}</p>
        <fieldset className={styles.fields} disabled={pending}>
          <legend className={styles.legend}>Template details</legend>
          <label htmlFor="template-title">Title
            <input id="template-title" className="form-input" value={draft.document.title} required maxLength={120} onChange={(event) => change({ ...draft, document: { ...draft.document, title: event.target.value } })} />
          </label>
          <label htmlFor="template-summary">Summary
            <textarea id="template-summary" className="form-input" rows={3} value={draft.document.summary} maxLength={2000} onChange={(event) => change({ ...draft, document: { ...draft.document, summary: event.target.value } })} />
          </label>
          <label htmlFor="template-duration">Duration in days
            <input id="template-duration" className="form-input" type="number" min={1} max={366} step={1} required value={draft.document.durationDays || ''} onChange={(event) => change({ ...draft, document: { ...draft.document, durationDays: Number(event.target.value) } })} />
          </label>
          <p>Suggested duration: {V2_TEMPLATE_PRODUCTS[draft.productCode].suggestedDays} days. Actual batch dates and time zone are selected when scheduling a batch.</p>
          <h3>Course outline</h3>
          <p>Outline items can remain unscheduled, including blank placeholders. Only live sessions need a time. Live-course registration is limited to eight students; no individual session reservations are used.</p>
          {draft.document.events.map((event, index) => <fieldset key={event.key} className={styles.event}>
            <legend>{event.kind === 'outline' ? 'Outline item' : 'Live session'} {index + 1}</legend>
            <div className={styles.grid}>
              <label htmlFor={`${event.key}-title`}>Title
                <input id={`${event.key}-title`} className="form-input" value={event.title} required={event.kind !== 'outline'} maxLength={120} onChange={(e) => updateEvent(event.key, { title: e.target.value })} />
              </label>
              <label htmlFor={`${event.key}-section`}>Section
                <select id={`${event.key}-section`} className="form-input" value={event.section} onChange={(e) => updateEvent(event.key, { section: e.target.value as V2Section })}>
                  {V2_TEMPLATE_PRODUCTS[draft.productCode].sections.map((section) => <option key={section} value={section}>{section}</option>)}
                </select>
              </label>
              {event.kind !== 'outline' && <>
              <label htmlFor={`${event.key}-day`}>Day
                <input id={`${event.key}-day`} className="form-input" type="number" min={1} max={draft.document.durationDays} step={1} required value={(event.dayOffset ?? 0) + 1 || ''} onChange={(e) => updateEvent(event.key, { dayOffset: Number(e.target.value) - 1 })} />
              </label>
              <label htmlFor={`${event.key}-start`}>Local start time
                <input id={`${event.key}-start`} className="form-input" type="time" required value={event.localStartTime ?? ''} onChange={(e) => updateEvent(event.key, { localStartTime: e.target.value })} />
              </label>
              <label htmlFor={`${event.key}-duration`}>Duration in minutes
                <input id={`${event.key}-duration`} className="form-input" type="number" min={15} max={720} step={1} required value={event.durationMinutes || ''} onChange={(e) => updateEvent(event.key, { durationMinutes: Number(e.target.value) })} />
              </label>
              </>}
              <label htmlFor={`${event.key}-instructor`}>Instructor (optional in a draft)
                <input id={`${event.key}-instructor`} className="form-input" value={event.instructor} maxLength={120} onChange={(e) => updateEvent(event.key, { instructor: e.target.value })} />
              </label>
            </div>
            <div className={styles.buttons}>
              <button type="button" className="btn btn-secondary" disabled={index === 0} aria-label={`Move event ${index + 1} up`} onClick={() => moveEvent(index, -1)}>Move up</button>
              <button type="button" className="btn btn-secondary" disabled={index === draft.document.events.length - 1} aria-label={`Move event ${index + 1} down`} onClick={() => moveEvent(index, 1)}>Move down</button>
              <button type="button" className="btn btn-secondary" onClick={() => change({ ...draft, document: { ...draft.document, events: draft.document.events.filter((item) => item.key !== event.key) } })}>Remove event {index + 1}</button>
            </div>
          </fieldset>)}
          <button type="button" className="btn btn-secondary" disabled={draft.document.events.length >= 100} onClick={() => addEvent('live')}>Add live session</button>
          <button type="button" className="btn btn-secondary" disabled={draft.document.events.length >= 100} onClick={() => addEvent('outline')}>Add undated outline item</button>
        </fieldset>
        <p role="alert" className={styles.error}>{error}</p>
        <p role="status" aria-live="polite">{pending ? 'Saving draft…' : message || (dirty ? 'Unsaved changes' : '')}</p>
        <div className={styles.buttons}>
          <button type="submit" className="btn btn-primary" disabled={pending || (!dirty && draft.revision > 0)}>{pending ? 'Saving…' : 'Save draft'}</button>
          {templates.some((item) => item.id === draft.id) && <button type="button" className="btn btn-secondary" disabled={pending} onClick={async () => {
            if ((dirty || recovery.recovered) && !window.confirm('Discard unsaved edits and reload the latest draft?')) return;
            window.location.reload();
          }}>Reload latest drafts</button>}
        </div>
      </form>}
    </div>
  );
}
