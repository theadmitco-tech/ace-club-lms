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
import batchStyles from './batchWorkspace.module.css';
import { pinCourseReadmes } from '@/lib/v2CourseReadmes';

function formatInstant(value: string | null) {
  if (value === null) return 'Unscheduled';
  return new Intl.DateTimeFormat('en-GB', { timeZone: V2_BATCH_TIME_ZONE, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function draftInput(batch: V2BatchDraft | null, templates: V2TemplateDraft[]): V2BatchInput {
  return batch ? { id:batch.id,templateId:batch.templateId,templateRevision:batch.templateRevision,expectedRevision:batch.revision,requestId:crypto.randomUUID(),title:batch.title,startDate:batch.startDate,timeZone:batch.timeZone,events:editableV2BatchEvents(batch.events),...(batch.sessions?{sessions:structuredClone(batch.sessions)}:{}) }
    : {id:crypto.randomUUID(),templateId:templates[0]?.id??'',templateRevision:templates[0]?.revision??0,expectedRevision:0,requestId:crypto.randomUUID(),title:'',startDate:'',timeZone:V2_BATCH_TIME_ZONE,events:null};
}

export default function BatchDraftEditor({ courseMode = false, drafts, templates, ownerId, setupPending = false, focused = false, initialDraft = null, outlineOpen = false, initialSessionKey, onSaved, initialTitle = '', initialStartDate = '' }: { courseMode?: boolean; initialTitle?: string; initialStartDate?: string; initialSessionKey?: string; outlineOpen?: boolean; focused?: boolean; initialDraft?: V2BatchDraft | null; onSaved?: (batch: V2BatchDraft) => void; drafts: V2BatchDraft[]; templates: V2TemplateDraft[]; ownerId: string; setupPending?: boolean }) {
  const router = useRouter();
  const [input, setInput] = useState<V2BatchInput | null>(()=>focused?{...draftInput(initialDraft,templates),...(!initialDraft?{title:initialTitle,startDate:initialStartDate}:{})}:null);
  const [original, setOriginal] = useState<V2BatchDraft | null>(initialDraft);
  const [review, setReview] = useState<{ input: V2BatchInput; proposal: V2BatchProposal } | null>(null);
  const [pending, setPending] = useState<'preview' | 'save' | null>(null);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [removing, setRemoving] = useState<string | null>(null);
  const [removedEdits, setRemovedEdits] = useState<Record<string, {event:V2BatchEventInput; index:number}>>({});
  const busy = useRef(false);
  const liveTemplates = templates;

  const recovery = useDraftRecovery<BatchWorkspace>(ownerId, courseMode ? `v2-course-draft:${initialDraft?.id ?? ''}` : 'v2-batch', isBatchWorkspace);
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

  async function saveFocused(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!input || busy.current || setupPending || recovery.recovered) return;
    if (!courseMode && !review && !input.events?.some(item => item.kind !== 'outline')) { setError('Keep at least one live class in this batch.'); return; }
    let request = input;
    if (!review && original) {
      const sessions = [...(input.sessions ?? [])];
      for (const item of input.events ?? []) {
        if (item.kind === 'outline' || original.events.some(saved => saved.key === item.key) || !item.title || !item.section) continue;
        if (!sessions.some(session => session.title === item.title && session.section === item.section)) {
          sessions.push({key:crypto.randomUUID(),title:item.title,section:item.section,content:{preSessionReads:[],postSessionReads:[],recordings:[],materials:[]}});
        }
      }
      request = {...input, sessions: pinCourseReadmes(sessions)};
    }
    const invalid = validateV2BatchInput(request);
    if (invalid) { setError(invalid); return; }
    busy.current = true; setPending('save'); setError(''); setMessage('');
    try {
      let snapshot = review;
      if (!snapshot) {
        const result = await previewBatchDraftAction(request);
        if (result.status === 'error') { setError(result.message); return; }
        snapshot = {input:structuredClone(request),proposal:result.proposal};
        setInput(request); setReview(snapshot); recovery.remember({input:request,original,review:snapshot});
      }
      const result = await saveBatchDraftAction(snapshot.input, snapshot.proposal.fingerprint);
      if (result.status === 'error') { setError(result.message); return; }
      recovery.forget(); setOriginal(result.draft); setInput(draftInput(result.draft,templates));
      setDirty(false); setReview(null); setRemovedEdits({}); setMessage('Batch draft saved.'); onSaved?.(result.draft); router.refresh();
    } catch { setError('The save was interrupted. Retry to recover the same changes.'); }
    finally { busy.current = false; setPending(null); }
  }

  const guidedCreation = focused && !original && !!initialTitle;
  const productCode = original?.productCode ?? templates.find((template) => template.id === input?.templateId)?.productCode;
  const calendarEvents = input?.events?.filter((event) => event.kind !== 'outline' && event.localDate).map((event) => ({
    date: event.localDate!, time: event.localStartTime,
    title: event.title ?? original?.events.find((item) => item.key === event.key)?.title ?? 'Live class',
  })) ?? [];
  if (courseMode && original && input && productCode) return <section className={batchStyles.setup}>
    <DraftRecoveryNotice available={!!recovery.recovered} unavailable={recovery.unavailable} onRestore={restore} onDiscard={recovery.forget}/>
    <form className={batchStyles.form} onSubmit={saveFocused} aria-busy={!!pending}>
      <h2>Edit course draft</h2><p className={batchStyles.help}>Update the sessions and reading pages here. Students see the changes only after publication.</p>
      <fieldset disabled={!!pending || !!review || !!recovery.recovered} className={batchStyles.setupFields}>
        <CourseSessionsEditor initialSessionKey={initialSessionKey} sessions={input.sessions ?? []} sections={V2_TEMPLATE_PRODUCTS[productCode].sections} onChange={sessions=>change({...input,sessions})}/>
      </fieldset>
      <div className={batchStyles.footer}><span>{dirty ? 'Unsaved changes' : 'Saved draft'}</span><button type="submit" className="btn btn-primary" disabled={!!pending || !!recovery.recovered || (!dirty && !review)}>{pending ? 'Saving…' : review ? 'Retry saving changes' : 'Save course draft'}</button></div>
      {error && <p role="alert">{error}</p>}
    </form>
  </section>;
  if (focused && original && input && productCode) {
    const live = (input.events ?? []).filter(event => event.kind !== 'outline');
    const removed = original.events.filter(event => event.kind !== 'outline' && !input.events?.some(item => item.key === event.key));
    const locked = !!pending || !!review || !!recovery.recovered;
    return <div className={batchStyles.setup}>
      <DraftRecoveryNotice available={!!recovery.recovered} unavailable={recovery.unavailable} onRestore={restore} onDiscard={recovery.forget} />
      <form className={batchStyles.form} onSubmit={saveFocused} aria-busy={!!pending}>
        <h2>Edit schedule</h2><p className={batchStyles.help}>Changes stay private until published. All times IST.</p>
        <fieldset className={batchStyles.setupFields} disabled={locked}>
          <label>Batch name<input required maxLength={120} value={input.title} onChange={event => change({...input,title:event.target.value})} /></label>
          <div className={batchStyles.scheduleEditHeading}><h3>Live classes</h3><span>{live.length} {live.length === 1 ? 'class' : 'classes'}</span></div>
          {live.map((event,index) => <fieldset className={batchStyles.classRow} key={event.key}>
            <legend>Class {index + 1}</legend>
            <div className={batchStyles.classIdentity}>
              {productCode === 'full_course' && <label>Subject<select aria-label={`Subject for class ${index+1}`} disabled={original.events.some(item => item.key === event.key)} value={event.section ?? original.events.find(item => item.key === event.key)?.section ?? 'quant'} onChange={e => changeEvent(event.key,{section:e.target.value as 'quant'|'verbal'|'di'})}>{V2_TEMPLATE_PRODUCTS[productCode].sections.map(section => <option key={section} value={section}>{V2_TEMPLATE_PRODUCTS[section].label}</option>)}</select></label>}
              <label>Class name<input id={`${event.key}-name`} required maxLength={120} value={event.title ?? original.events.find(item => item.key === event.key)?.title ?? ''} onChange={e => changeEvent(event.key,{title:e.target.value})} /></label>
            </div>
            <div className={batchStyles.classFields}>
              <BatchDatePicker id={`${event.key}-date`} label="Date" required value={event.localDate ?? ''} time={event.localStartTime ?? ''} onDateTimeChange={(localDate,localStartTime)=>changeEvent(event.key,{localDate,localStartTime})} onChange={localDate=>changeEvent(event.key,{localDate})} events={calendarEvents} />
              <label>Start time (IST)<input type="time" required value={event.localStartTime ?? ''} onChange={e=>changeEvent(event.key,{localStartTime:e.target.value})} /></label>
              <label>Duration (minutes)<input type="number" required min={15} max={720} step={1} value={event.durationMinutes ?? ''} onChange={e=>changeEvent(event.key,{durationMinutes:Number(e.target.value)})} /></label>
            </div>
            <div className={batchStyles.rowSecondary}><details className={batchStyles.publishDetails}><summary>Instructor</summary><label>Instructor name<input maxLength={120} value={event.instructor} onChange={e=>changeEvent(event.key,{instructor:e.target.value})} /></label></details>
              {live.length > 1 && <button type="button" className={batchStyles.remove} aria-label={`Remove class ${index+1}`} onClick={()=>setRemoving(event.key)}>Remove class</button>}
            </div>
            {removing === event.key && <div className={batchStyles.removalConfirm} role="group" aria-label="Confirm class removal"><p>Remove {event.title || 'this class'} from the draft? Students keep the published schedule until changes are published.</p><div className={batchStyles.actions}><button type="button" className="btn btn-secondary" onClick={()=>setRemoving(null)}>Keep class</button><button type="button" className="btn btn-secondary" onClick={()=>{setRemovedEdits(current=>({...current,[event.key]:{event:structuredClone(event),index:input.events!.findIndex(item=>item.key===event.key)}}));change({...input,events:input.events!.filter(item=>item.key!==event.key)});setRemoving(null);}}>Remove from draft</button></div></div>}
          </fieldset>)}
          {removed.map(event => <p key={event.key} className={batchStyles.removedClass}>{event.title} — removed from this draft. <button type="button" onClick={()=>{const entries=[...(input.events??[])];const saved=removedEdits[event.key];entries.splice(saved?.index??original.events.findIndex(item=>item.key===event.key),0,saved?.event??editableV2BatchEvents([event])[0]);change({...input,events:entries});}}>Undo</button></p>)}
          <button type="button" className="btn btn-secondary" disabled={(input.events?.length ?? 0)>=100} onClick={()=>{
            const key=crypto.randomUUID(); const section=V2_TEMPLATE_PRODUCTS[productCode].sections[0];
            change({...input,events:[...(input.events??[]),{key,kind:'live',title:'',section,localDate:'',localStartTime:'19:00',durationMinutes:60,instructor:'',capacity:8}]});
            requestAnimationFrame(()=>document.getElementById(`${key}-name`)?.focus());
          }}>+ Add class</button>
          <details className={batchStyles.publishDetails} open={outlineOpen || undefined}><summary>Edit this batch’s course sessions</summary><p className={batchStyles.help}>Course materials are separate from class dates.</p><CourseSessionsEditor initialSessionKey={initialSessionKey} sessions={input.sessions ?? []} sections={V2_TEMPLATE_PRODUCTS[productCode].sections} onChange={sessions=>change({...input,sessions})} /></details>
        </fieldset>
        <div className={batchStyles.footer}><p className={batchStyles.help}>{dirty ? 'Unsaved changes' : 'Saved draft'} · Students see changes after publication.</p><button type="submit" className="btn btn-primary" disabled={!!pending || !!recovery.recovered || (!dirty && !review)}>{pending ? 'Saving…' : review ? 'Retry saving changes' : 'Save changes'}</button></div>
        {review && !pending && <p className={batchStyles.help}>This save needs confirmation. Retry it, or reload the latest saved batch before making different changes.</p>}
        {error && <p role="alert" className="workflow-error">{error}</p>}
        {message && <p role="status">{message}</p>}
        {!!review && !pending && <button type="button" className={batchStyles.back} onClick={()=>{if(window.confirm('Reload the latest saved batch? Unsaved edits stay available for recovery.'))window.location.reload();}}>Reload saved batch</button>}
      </form>
    </div>;
  }

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
