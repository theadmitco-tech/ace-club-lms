'use client';
import { CourseSessionsEditor, CourseSessionsPreview } from '../templates/CourseSessions';
import { BatchDatePicker } from './BatchDatePicker';

import { useRef, useState, type FormEvent } from 'react';
import { DraftRecoveryNotice, useDraftRecovery } from '@/components/DraftRecovery';
import { isBatchWorkspace, type BatchWorkspace } from '@/lib/v2WorkspaceRecovery';
import { AdminDraftLink as Link, useAdminDraftGuard } from '@/components/AdminDraftNavigation';
import { useRouter } from 'next/navigation';
import { V2_TEMPLATE_PRODUCTS, v2CourseDeliveryLabel, type V2TemplateDraft } from '@/lib/v2Templates';
import { editableV2BatchEvents, validateV2BatchInput, V2_BATCH_TIME_ZONE,
  type V2BatchDraft, type V2BatchEventInput, type V2BatchInput, type V2BatchProposal } from '@/lib/v2Batches';
import { previewBatchDraftAction, saveBatchDraftAction } from './actions';
import styles from '../templates/templates.module.css';

function formatInstant(value: string | null) {
  if (value === null) return 'Unscheduled';
  return new Intl.DateTimeFormat('en-GB', { timeZone: V2_BATCH_TIME_ZONE, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function draftInput(batch: V2BatchDraft | null, templates: V2TemplateDraft[]): V2BatchInput {
  return batch ? { id:batch.id,templateId:batch.templateId,templateRevision:batch.templateRevision,expectedRevision:batch.revision,requestId:crypto.randomUUID(),title:batch.title,startDate:batch.startDate,timeZone:batch.timeZone,events:editableV2BatchEvents(batch.events),...(batch.sessions?{sessions:structuredClone(batch.sessions)}:{}) }
    : {id:crypto.randomUUID(),templateId:templates[0]?.id??'',templateRevision:templates[0]?.revision??0,expectedRevision:0,requestId:crypto.randomUUID(),title:'',startDate:'',timeZone:V2_BATCH_TIME_ZONE,events:null};
}

export default function BatchDraftEditor({ drafts, templates, ownerId, setupPending = false, focused = false, initialDraft = null, outlineOpen = false, initialSessionKey, onSaved, initialTitle = '', initialStartDate = '' }: { initialTitle?: string; initialStartDate?: string; initialSessionKey?: string; outlineOpen?: boolean; focused?: boolean; initialDraft?: V2BatchDraft | null; onSaved?: (batch: V2BatchDraft) => void; drafts: V2BatchDraft[]; templates: V2TemplateDraft[]; ownerId: string; setupPending?: boolean }) {
  const router = useRouter();
  const [input, setInput] = useState<V2BatchInput | null>(()=>focused?{...draftInput(initialDraft,templates),...(!initialDraft?{title:initialTitle,startDate:initialStartDate}:{})}:null);
  const [original, setOriginal] = useState<V2BatchDraft | null>(initialDraft);
  const [review, setReview] = useState<{ input: V2BatchInput; proposal: V2BatchProposal } | null>(null);
  const [pending, setPending] = useState<'preview' | 'save' | null>(null);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const busy = useRef(false);
  const liveTemplates = templates;

  const recovery = useDraftRecovery<BatchWorkspace>(ownerId, 'v2-batch', isBatchWorkspace);
  useAdminDraftGuard(dirty || pending !== null);

  function restore() {
    if (!recovery.recovered) return;
    setInput(recovery.recovered.input);
    setOriginal(recovery.recovered.original);
    setReview(recovery.recovered.review);
    setDirty(true);
    recovery.acknowledge();
  }

  function begin(batch: V2BatchDraft | null) {
    if (busy.current || ((dirty || recovery.recovered) && !window.confirm('Discard unsaved batch edits?'))) return;
    if (!batch && !liveTemplates.length && !setupPending) return;
    recovery.forget();
    setOriginal(batch);
    setInput(batch ? {
      id: batch.id, templateId: batch.templateId, templateRevision: batch.templateRevision,
      expectedRevision: batch.revision, requestId: crypto.randomUUID(), title: batch.title,
      startDate: batch.startDate, timeZone: batch.timeZone, events: editableV2BatchEvents(batch.events), ...(batch.sessions ? {sessions: structuredClone(batch.sessions)} : {}),
    } : {
      id: crypto.randomUUID(), templateId: liveTemplates[0]?.id ?? '', templateRevision: liveTemplates[0]?.revision ?? 0,
      expectedRevision: 0, requestId: crypto.randomUUID(), title: '', startDate: '', timeZone: V2_BATCH_TIME_ZONE, events: null,
    });
    setDirty(false);
    setReview(null);
    setError('');
    setMessage('');
  }

  function change(next: V2BatchInput) {
    const changed = { ...next, requestId: crypto.randomUUID() };
    recovery.remember({ input: changed, original, review: null });
    setInput(changed);
    setDirty(true);
    setReview(null);
    setError('');
    setMessage('');
  }

  function changeEvent(key: string, patch: Partial<V2BatchEventInput>) {
    if (!input?.events) return;
    change({ ...input, events: input.events.map((event) => event.key === key ? { ...event, ...patch } : event) });
  }

  async function preview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (setupPending) { setError('Schedule review is unavailable until staging setup is complete.'); return; }
    if (!input || busy.current) return;
    const invalid = validateV2BatchInput(input);
    if (invalid) { setError(invalid); return; }
    busy.current = true;
    setPending('preview');
    setError('');
    setMessage('');
    setReview(null);
    try {
      const result = await previewBatchDraftAction(input);
      if (result.status === 'error') { setError(result.message); return; }
      const nextReview = { input: structuredClone(input), proposal: result.proposal };
      recovery.remember({ input, original, review: nextReview });
      setReview(nextReview);
      setMessage('Schedule reviewed. Confirmation saves this draft.');
    } catch {
      setError('The schedule could not be reviewed. Retry after checking the connection.');
    } finally {
      busy.current = false;
      setPending(null);
    }
  }

  async function save() {
    if (setupPending) { setError('Saving is unavailable until staging setup is complete.'); return; }
    if (!review || busy.current) return;
    busy.current = true;
    setPending('save');
    setError('');
    setMessage('');
    try {
      const result = await saveBatchDraftAction(review.input, review.proposal.fingerprint);
      if (result.status === 'error') { setError(result.message); return; }
      const batch = result.draft;
      recovery.forget();
      setOriginal(batch);
      setInput({ id: batch.id, templateId: batch.templateId, templateRevision: batch.templateRevision,
        expectedRevision: batch.revision, requestId: crypto.randomUUID(), title: batch.title,
        startDate: batch.startDate, timeZone: batch.timeZone, events: editableV2BatchEvents(batch.events), ...(batch.sessions ? {sessions: structuredClone(batch.sessions)} : {}) });
      setDirty(false);
      setReview(null);
      setMessage(`${focused ? 'Batch draft saved' : `Draft revision ${batch.revision} saved`}${result.replayed ? ' (previous submission recovered)' : ''}.`);
      onSaved?.(batch);
      router.refresh();
    } catch {
      setError('Save confirmation was interrupted. Confirm the same review again to recover the submission.');
    } finally {
      busy.current = false;
      setPending(null);
    }
  }

  const guidedCreation = focused && !original && !!initialTitle;
  const productCode = original?.productCode ?? templates.find((template) => template.id === input?.templateId)?.productCode;
  const calendarEvents = input?.events?.filter((event) => event.kind !== 'outline' && event.localDate).map((event) => ({
    date: event.localDate!, time: event.localStartTime,
    title: original?.events.find((item) => item.key === event.key)?.title ?? 'Live class',
  })) ?? [];
  return <div className={styles.workspace}>
    <>{setupPending && <section className={styles.notice} role="status"><h2>Explore batch settings</h2><p>Review the batch workspace while staging setup is completed. Saved templates, schedule review, saving and publication are not available yet.</p></section>}</>
    <DraftRecoveryNotice available={!!recovery.recovered} unavailable={recovery.unavailable} onRestore={restore} onDiscard={recovery.forget} />
    {!focused && <section className={styles.card} aria-labelledby="batch-list-heading">
      <h2 id="batch-list-heading">Saved batch drafts</h2>
      {drafts.length ? <ul className={styles.list}>{drafts.map((batch) => <li key={batch.id}>
        <button type="button" className="btn btn-secondary" disabled={!!pending} onClick={() => begin(batch)}>
          {batch.title} · {V2_TEMPLATE_PRODUCTS[batch.productCode].label} · revision {batch.revision}
        </button>
        <Link href={`/admin/v2/batches/${batch.id}/meeting`} prefetch={false} onNavigate={(event) => {
          if (busy.current) event.preventDefault();
        }}>Private meeting drafts for {batch.title}</Link>
      </li>)}</ul> : <p>{setupPending ? 'Saved batch drafts are not available in this Preview yet.' : 'No batch drafts have been saved.'}</p>}
      <button type="button" className="btn btn-primary" disabled={!!pending || (!liveTemplates.length && !setupPending)} onClick={() => begin(null)}>{setupPending ? 'Explore batch settings' : 'New batch draft'}</button>
      {!liveTemplates.length && <p>Save a course template before creating a batch. Templates may contain undated outlines or no live sessions.</p>}
      <p>Each batch keeps its own schedule. Later template edits do not move existing batch events.</p>
    </section>}

    {input && <form onInvalidCapture={event => { let container = (event.target as HTMLElement).parentElement; while (container && container !== event.currentTarget) { if (container instanceof HTMLDetailsElement) container.open = true; container = container.parentElement; } }} onSubmit={preview} className={styles.card} aria-busy={!!pending}>
      <h2>{original ? 'Edit batch' : guidedCreation ? 'Review batch details' : 'Create a batch'}</h2>
      {productCode && <p>{V2_TEMPLATE_PRODUCTS[productCode].label}{focused?' · All times IST':` · template revision ${input.templateRevision} · ${V2_BATCH_TIME_ZONE}`}</p>}
      <fieldset disabled={!!pending} className={styles.fields}>
        <legend className={styles.legend}>Course and schedule details</legend>
        {!focused&&<p>Delivery: {v2CourseDeliveryLabel(input.events ?? templates.find((template) => template.id === input.templateId)?.document.events ?? [])}</p>}
        {original && productCode && <details className="workflow-secondary" open={outlineOpen || undefined}><summary>Edit this batch’s course sessions</summary><p>Changes apply to this batch draft only. Existing publication stays unchanged until reviewed.</p><CourseSessionsEditor initialSessionKey={initialSessionKey} sessions={input.sessions ?? []} sections={V2_TEMPLATE_PRODUCTS[productCode].sections}
          onChange={(sessions) => change({...input,sessions})} /></details>}
        {!original && !guidedCreation && <label htmlFor="v2-batch-template">Template
          <select id="v2-batch-template" className="form-input" disabled={!liveTemplates.length} value={input.templateId} onChange={(event) => {
            const selected = liveTemplates.find((template) => template.id === event.target.value);
            if (selected) change({ ...input, templateId: selected.id, templateRevision: selected.revision });
          }}>
            {!liveTemplates.length && <option value="">A saved course template is required</option>}
            {liveTemplates.map((template) => <option key={template.id} value={template.id}>
              {template.document.title} · {V2_TEMPLATE_PRODUCTS[template.productCode].label} · revision {template.revision}
            </option>)}
          </select>
        </label>}
        <label htmlFor="v2-batch-title">Batch title
          <input id="v2-batch-title" className="form-input" required maxLength={120} value={input.title} onChange={(event) => change({ ...input, title: event.target.value })} />
        </label>
        {guidedCreation ? <p>First class: {input.startDate} · {templates[0]?.document.events.length ?? 0} live classes. Dates can be adjusted after the private batch is saved.</p> : !original && templates.find((template) => template.id === input.templateId)?.document.events.some((event) => event.kind !== 'outline') ? <BatchDatePicker id="v2-batch-start" label="Template start date (only needed for live sessions)"
          required={templates.find((template) => template.id === input.templateId)?.document.events.some((event) => event.kind !== 'outline')}
          value={input.startDate} onChange={(startDate) => change({ ...input, startDate })} events={calendarEvents} />
          : input.startDate ? (!focused&&<p>Original template start date: {input.startDate}. Edit individual live-event dates below to reschedule this batch.</p>) : <p>This course has no live schedule.</p>}
        <p>Every live class needs a date and time. The complete schedule is reviewed before publication; all times use IST.</p>
        {!original && !guidedCreation && <p>The first date sets the template schedule. After the private draft is saved, every class date and time can be adjusted below before publishing.</p>}
        {input.events?.some(event=>event.kind!=='outline')&&<h3>All class dates & times</h3>}
        {input.events?.filter(event=>!focused||event.kind!=='outline').map((event, index) => <fieldset key={event.key} className={styles.event}>
          <legend>{index + 1}. {original?.events.find((item) => item.key === event.key)?.title}</legend>
          {event.kind === 'outline' && <p>Undated outline item. No attendance or session booking.</p>}
          <div className={styles.grid}>
            {event.kind !== 'outline' && <>
            <BatchDatePicker id={`${event.key}-date`} label="Date" required value={event.localDate ?? ''} time={event.localStartTime ?? ''} onDateTimeChange={(localDate,localStartTime)=>changeEvent(event.key,{localDate,localStartTime})}
              onChange={(localDate) => changeEvent(event.key, { localDate })} events={calendarEvents} />
            <label htmlFor={`${event.key}-time`}>Start time (IST)
              <input id={`${event.key}-time`} className="form-input" type="time" required value={event.localStartTime ?? ''} onChange={(e) => changeEvent(event.key, { localStartTime: e.target.value })} />
            </label>
            </>}
            <details className="workflow-class-options" open={!focused || undefined}><summary>Duration & instructor</summary>
            {event.kind!=='outline'&&<label htmlFor={`${event.key}-duration`}>Duration in minutes
              <input id={`${event.key}-duration`} className="form-input" type="number" min={15} max={720} step={1} required value={event.durationMinutes || ''} onChange={(e) => changeEvent(event.key, { durationMinutes: Number(e.target.value) })} />
            </label>}
            <label htmlFor={`${event.key}-instructor`}>Instructor (optional in a draft)
              <input id={`${event.key}-instructor`} className="form-input" maxLength={120} value={event.instructor} onChange={(e) => changeEvent(event.key, { instructor: e.target.value })} />
            </label>
            </details>
          </div>
        </fieldset>)}
        <button type="submit" className={review ? "btn btn-secondary" : "btn btn-primary"} disabled={setupPending || !!pending || (!!original && !dirty)}>{pending === 'preview' ? 'Reviewing…' : 'Review course and schedule'}</button>
      </fieldset>
      {review && <section className={styles.fields} aria-labelledby="batch-review-heading">
        <h3 id="batch-review-heading">Review: {review.proposal.draft.title}</h3>
        <p>Draft · {V2_TEMPLATE_PRODUCTS[review.proposal.draft.productCode].label} · all times IST</p>
        <p>Delivery: {v2CourseDeliveryLabel(review.proposal.draft.events)}</p>
        <CourseSessionsPreview sessions={review.proposal.draft.sessions ?? []} />
        <ol className={styles.list}>{review.proposal.draft.events.map((event) => {
          const before = original?.events.find((item) => item.key === event.key);
          return <li key={event.key} className={styles.event}>
            <strong>{event.title} · {event.section}</strong>
            {before && <p>Saved: {formatInstant(before.startsAt)} – {formatInstant(before.endsAt)} · {before.instructor || 'Instructor pending'}</p>}
            <p>Proposed: {formatInstant(event.startsAt)} – {formatInstant(event.endsAt)} · {event.instructor || 'Instructor pending'}</p>
          </li>;
        })}</ol>
        <button type="button" className="btn btn-primary" disabled={setupPending || !!pending} onClick={save}>{pending === 'save' ? 'Saving…' : 'Confirm and save draft'}</button>
      </section>}
      <p role="alert" className={styles.error}>{error}</p>
      <p role="status" aria-live="polite">{message || (dirty ? 'Unsaved course or schedule changes' : '')}</p>
      <details className="workflow-secondary"><summary>Recovery options</summary><button type="button" className="btn btn-secondary" disabled={!!pending} onClick={() => { if (!dirty || window.confirm('Discard unsaved batch edits and reload?')) window.location.reload(); }}>Reload latest drafts</button></details>
    </form>}
  </div>;
}
