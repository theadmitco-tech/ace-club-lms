'use client';
import { CourseSessionsEditor } from './CourseSessions';
import type { V2CourseCode } from '@/lib/v2Templates';

import { useRef, useState, type FormEvent } from 'react';
import { DraftRecoveryNotice, useDraftRecovery } from '@/components/DraftRecovery';
import { isTemplateWorkspace, type TemplateWorkspace } from '@/lib/v2WorkspaceRecovery';
import { useAdminDraftGuard } from '@/components/AdminDraftNavigation';
import { useRouter } from 'next/navigation';
import { V2_SESSION_CONTENT_LABELS, emptyV2SessionContent, type V2SessionContentKind, type V2SessionContentItem, V2_TEMPLATE_PRODUCTS, v2CourseDeliveryLabel, validateV2TemplateSave, type V2TemplateDraft, type V2TemplateEvent } from '@/lib/v2Templates';
import type { V2Section } from '@/lib/v2Products';
import { saveTemplateDraftAction } from './actions';
import styles from './templates.module.css';

export default function TemplateEditor({ templates, ownerId, setupPending = false }: { templates: V2TemplateDraft[]; ownerId: string; setupPending?: boolean }) {
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

  function newDraft(productCode: V2CourseCode) {
    open({ id: crypto.randomUUID(), productCode, revision: 0, document: {
      title: '', summary: '', durationDays: V2_TEMPLATE_PRODUCTS[productCode].suggestedDays, sessions: [], events: [],
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
      kind, dayOffset: kind === 'live' ? 0 : null, localStartTime: kind === 'live' ? '18:00' : null, durationMinutes: kind === 'live' ? 60 : null, capacity: 8, instructor: '', ...(draft.document.sessions === undefined ? {content: emptyV2SessionContent()} : {}),
    }] } });
  }

  function updateContent(sessionKey: string, kind: V2SessionContentKind, items: V2SessionContentItem[]) {
    const session = draft?.document.events.find((item) => item.key === sessionKey);
    if (!session) return;
    updateEvent(sessionKey, { content: { ...(session.content ?? emptyV2SessionContent()), [kind]: items } });
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
    if (setupPending) { setError('Saving is unavailable until staging setup is complete.'); return; }
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
      <>{setupPending && <section className={styles.notice} role="status"><h2>Explore the course editor</h2><p>You can arrange course sessions, resources and optional live classes here. Saving is unavailable until staging setup is complete. These edits have not been saved to the LMS.</p></section>}</>
      <DraftRecoveryNotice available={!!recovery.recovered} unavailable={recovery.unavailable} onRestore={restore} onDiscard={recovery.forget} />
      <section className={styles.card} aria-labelledby="template-list-heading">
        <h2 id="template-list-heading">Saved drafts</h2>
        {templates.length === 0 ? <p>{setupPending ? 'Saved templates are not available in this Preview yet. Choose a course below to explore its editor.' : 'No templates have been created.'}</p> : <ul className={styles.list}>
          {templates.map((item) => <li key={item.id}>
            <button type="button" className="btn btn-secondary" disabled={pending} onClick={() => open(item)}>
              {item.document.title} · {V2_TEMPLATE_PRODUCTS[item.productCode].label} · revision {item.revision}
            </button>
          </li>)}
        </ul>}
        <h3>Create a template</h3>
        <div className={styles.offerings}>
          {(Object.entries(V2_TEMPLATE_PRODUCTS) as [V2CourseCode, typeof V2_TEMPLATE_PRODUCTS[V2CourseCode]][]).map(([code, product]) => (
            <div key={code} className={styles.offering} data-selected={draft?.productCode === code || undefined}>
              <span className={styles.eyebrow}>{product.sections.length === 3 ? 'ALL THREE SUBJECTS' : 'INDIVIDUAL OFFERING'}</span>
              <button type="button" className="btn btn-secondary" disabled={pending} onClick={() => newDraft(code)}>{product.label}</button>
              <p>{product.sections.length === 3 ? 'Quant + Verbal + DI' : `Complete ${product.label} curriculum`}</p>
            </div>
          ))}
        </div>
        <p>A saved draft does not create a live batch or change student access.</p>
      </section>

      {draft && <form className={styles.card} onSubmit={save} aria-busy={pending}>
        <div className={styles.sectionHeading}><h2>{draft.revision === 0 ? 'New template' : `Edit draft · revision ${draft.revision}`}</h2><span className={styles.badge}>{dirty ? 'Unsaved changes' : 'Private draft'}</span></div>
        <p><strong>{V2_TEMPLATE_PRODUCTS[draft.productCode].label}</strong> · Included sections: {V2_TEMPLATE_PRODUCTS[draft.productCode].sections.join(', ')}</p>
        <fieldset className={styles.fields} disabled={pending}>
          <legend className={styles.legend}>Template details</legend>
          <p>Delivery: {v2CourseDeliveryLabel(draft.document.events)}</p>
          <label htmlFor="template-title">Title
            <input id="template-title" className="form-input" value={draft.document.title} required maxLength={120} onChange={(event) => change({ ...draft, document: { ...draft.document, title: event.target.value } })} />
          </label>
          <label htmlFor="template-summary">Summary
            <textarea id="template-summary" className="form-input" rows={3} value={draft.document.summary} maxLength={2000} onChange={(event) => change({ ...draft, document: { ...draft.document, summary: event.target.value } })} />
          </label>
          <label htmlFor="template-duration">Live schedule span in days (optional without live classes)
            <input id="template-duration" className="form-input" type="number" min={1} max={366} step={1} required={draft.document.events.some((event) => event.kind !== 'outline')} value={draft.document.durationDays || ''} onChange={(event) => change({ ...draft, document: { ...draft.document, durationDays: event.target.value === '' ? null : Number(event.target.value) } })} />
          </label>
          <p>Course duration is configurable; individual offerings retain their complete curriculum. Only actual live classes require dates and times.</p>
          {draft.document.sessions && <CourseSessionsEditor sessions={draft.document.sessions} sections={V2_TEMPLATE_PRODUCTS[draft.productCode].sections}
            onChange={(sessions) => change({...draft,document:{...draft.document,sessions}})} />}
          <h3 className={styles.sectionTitle}>Optional live-class events</h3>
          <p>Each course retains its sessions, materials, recordings, pre-session reads and post-session reads. Sessions can remain unscheduled; only actual live classes need a time. Live-course registration is limited to eight students; no individual session reservations are used.</p>
          {draft.document.events.map((event, index) => <fieldset key={event.key} className={styles.event}>
            <legend>{event.kind === 'outline' ? 'Course session' : 'Live class'} {index + 1}</legend>
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
                <input id={`${event.key}-day`} className="form-input" type="number" min={1} max={draft.document.durationDays ?? 366} step={1} required value={(event.dayOffset ?? 0) + 1 || ''} onChange={(e) => updateEvent(event.key, { dayOffset: Number(e.target.value) - 1 })} />
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
            {draft.document.sessions === undefined && <div>
              {(Object.entries(V2_SESSION_CONTENT_LABELS) as [V2SessionContentKind, string][]).map(([kind, label]) => {
                const items = (event.content ?? emptyV2SessionContent())[kind];
                return <fieldset key={kind} className={styles.event}>
                  <legend>{label} ({items.length})</legend>
                  {items.map((item, itemIndex) => <div key={item.key} className={styles.fields}>
                    <label htmlFor={`${item.key}-title`}>Title
                      <input id={`${item.key}-title`} className="form-input" required maxLength={120} value={item.title}
                        onChange={(e) => updateContent(event.key, kind, items.map((value) => value.key === item.key ? { ...value, title: e.target.value } : value))} />
                    </label>
                    <label htmlFor={`${item.key}-url`}>HTTPS link
                      <input id={`${item.key}-url`} className="form-input" type="url" required maxLength={2048} value={item.url}
                        onChange={(e) => updateContent(event.key, kind, items.map((value) => value.key === item.key ? { ...value, url: e.target.value } : value))} />
                    </label>
                    <div className={styles.buttons}>
                      <button type="button" className="btn btn-secondary" disabled={itemIndex === 0} onClick={() => {
                        const reordered = [...items]; [reordered[itemIndex - 1], reordered[itemIndex]] = [reordered[itemIndex], reordered[itemIndex - 1]];
                        updateContent(event.key, kind, reordered);
                      }}>Move {label.toLowerCase()} item {itemIndex + 1} up</button>
                      <button type="button" className="btn btn-secondary" onClick={() => updateContent(event.key, kind, items.filter((value) => value.key !== item.key))}>Remove {label.toLowerCase()} item {itemIndex + 1}</button>
                    </div>
                  </div>)}
                  <button type="button" className="btn btn-secondary" disabled={items.length >= 50}
                    onClick={() => updateContent(event.key, kind, [...items, { key: crypto.randomUUID(), title: '', url: '' }])}>Add {label.toLowerCase()} item</button>
                </fieldset>;
              })}
            </div>}
            <div className={styles.buttons}>
              <button type="button" className="btn btn-secondary" disabled={index === 0} aria-label={`Move event ${index + 1} up`} onClick={() => moveEvent(index, -1)}>Move up</button>
              <button type="button" className="btn btn-secondary" disabled={index === draft.document.events.length - 1} aria-label={`Move event ${index + 1} down`} onClick={() => moveEvent(index, 1)}>Move down</button>
              <button type="button" className="btn btn-secondary" onClick={() => change({ ...draft, document: { ...draft.document, events: draft.document.events.filter((item) => item.key !== event.key) } })}>Remove event {index + 1}</button>
            </div>
          </fieldset>)}
          <button type="button" className="btn btn-secondary" disabled={draft.document.events.length >= 100} onClick={() => addEvent('live')}>Add live class</button>
          {draft.document.sessions === undefined && <button type="button" className="btn btn-secondary" disabled={draft.document.events.length >= 100} onClick={() => addEvent('outline')}>Add course session</button>}
        </fieldset>
        <p role="alert" className={styles.error}>{error}</p>
        <p role="status" aria-live="polite">{pending ? 'Saving draft…' : message || (dirty ? 'Unsaved changes' : '')}</p>
        <div className={styles.buttons}>
          <button type="submit" className="btn btn-primary" disabled={setupPending || pending || (!dirty && draft.revision > 0)}>{setupPending ? 'Saving awaits staging setup' : pending ? 'Saving…' : 'Save draft'}</button>
          {templates.some((item) => item.id === draft.id) && <button type="button" className="btn btn-secondary" disabled={pending} onClick={async () => {
            if ((dirty || recovery.recovered) && !window.confirm('Discard unsaved edits and reload the latest draft?')) return;
            window.location.reload();
          }}>Reload latest drafts</button>}
        </div>
      </form>}
    </div>
  );
}
